import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useConfig } from "./ConfigProvider";
import { FaPaperPlane } from 'react-icons/fa';
import './AdminChatPage.css';

const AdminChatPage = ({ adminUsername }) => {
    const [activeChats, setActiveChats] = useState(new Map());
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [messages, setMessages] = useState([]); // This is for the VISIBLE chat
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const stompClientRef = useRef(null);
    const subscriptionsRef = useRef(new Map());
    const messagesEndRef = useRef(null);

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    // Effect to connect to WebSocket on component mount
    useEffect(() => {
        if (!apiUrl) return;

        const fetchOpenTickets = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/tickets/open`, {
                    method: 'GET',
                    credentials: 'include',
                });
                if (response.ok) {
                    const missedTickets = await response.json();

                    console.log("The missed tickets are ",missedTickets);

                    // Use the fetched tickets to populate the initial chat list
                    setActiveChats(prevChats => {
                        const newChats = new Map(prevChats);
                        missedTickets.forEach(ticket => {
                            if (!newChats.has(ticket.ticketNumber)) {
                                newChats.set(ticket.ticketNumber, {
                                    chatId: ticket.ticketNumber,
                                    sender: ticket.createdBy, // Assuming your ticket has this info
                                    content: `Topic: ${ticket.topic}`,
                                    messages: [],
                                    unread: true,
                                });
                            }
                        });
                        return newChats;
                    });

                    // Also, immediately subscribe to each of these missed tickets
                    missedTickets.forEach(ticket => {
                        if (stompClientRef.current?.active && !subscriptionsRef.current.has(ticket.ticketNumber)) {
                            const sub = stompClientRef.current.subscribe(`/topic/chat/${ticket.ticketNumber}`, onMessageReceived);
                            subscriptionsRef.current.set(ticket.ticketNumber, sub);
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to fetch open tickets:", error);
            }
        };




        const onConnect = () => {
            console.log('Admin connected to WebSocket');
            setIsConnected(true);
            // --- UPDATED: Call the catch-up function upon connection ---
            fetchOpenTickets();
            stompClientRef.current.subscribe('/topic/admin/new-chats', onNewChatNotification);
        };

        const onError = (err) => {
            console.error("Admin STOMP Error", err);
            setIsConnected(false);
        };

        const getWebSocketUrl = (url) => {
            try {
                const serverUrl = new URL(url);
                return `${serverUrl.origin}/ws`;
            } catch (e) {
                console.error("Invalid API_URL for WebSocket:", url);
                return '';
            }
        };
        const webSocketUrl = getWebSocketUrl(apiUrl);
        if (!webSocketUrl) return;

        stompClientRef.current = new Client({
            webSocketFactory: () => new SockJS(webSocketUrl),
            onConnect,
            onStompError: onError,
            onDisconnect: () => setIsConnected(false),
            reconnectDelay: 5000,
        });

        stompClientRef.current.activate();

        return () => {
            if (stompClientRef.current?.active) {
                stompClientRef.current.deactivate();
            }
        };
    }, [apiUrl]);

    // Effect to auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- THIS IS THE KEY FIX ---
    // This effect synchronizes the visible messages with the master data.
    // It runs whenever the selected chat changes OR the master list of chats gets a new message.
    useEffect(() => {
        if (selectedChatId && activeChats.has(selectedChatId)) {
            const chat = activeChats.get(selectedChatId);
            setMessages(chat.messages); // Update the visible messages
        }
    }, [selectedChatId, activeChats]); // Dependencies

    const onNewChatNotification = (payload) => {
        const notification = JSON.parse(payload.body);

        setActiveChats(prevChats => {
            const newChats = new Map(prevChats);
            if (!newChats.has(notification.chatId)) {
                newChats.set(notification.chatId, {
                    ...notification,
                    messages: [],
                    unread: true
                });
            }
            return newChats;
        });

        if (stompClientRef.current?.active && !subscriptionsRef.current.has(notification.chatId)) {
            const subscription = stompClientRef.current.subscribe(`/topic/chat/${notification.chatId}`, onMessageReceived);
            subscriptionsRef.current.set(notification.chatId, subscription);
        }
    };

    // This function's only job now is to update the master `activeChats` map.
    const onMessageReceived = (payload) => {
        const message = JSON.parse(payload.body);

        setActiveChats(prevChats => {
            const newChats = new Map(prevChats);
            const chat = newChats.get(message.chatId);
            if (chat) {
                const updatedMessages = [...chat.messages, message];
                const isUnread = message.sender !== adminUsername && message.chatId !== selectedChatId;
                const updatedChat = { ...chat, messages: updatedMessages, unread: chat.unread || isUnread };
                newChats.set(message.chatId, updatedChat);
            }
            return newChats;
        });
        // We no longer need to call setMessages here; the useEffect handles it.
    };

    // This function is now simpler. It just sets the ID and marks the chat as read.
    const selectChat = (chatId) => {
        // Set the active chat ID to highlight it in the list
        setSelectedChatId(chatId);

        const chat = activeChats.get(chatId);
        if (!chat) return;

        // Mark the chat as read
        if (chat.unread) {
            setActiveChats(prevChats => {
                const newChats = new Map(prevChats);
                const chatToUpdate = newChats.get(chatId);
                if (chatToUpdate) {
                    const updatedChat = { ...chatToUpdate, unread: false };
                    newChats.set(chatId, updatedChat);
                }
                return newChats;
            });
        }

        // Fetch history ONLY if we haven't fetched it before (i.e., messages array is empty)
        if (chat.messages.length === 0) {
            fetchChatHistory(chatId);
        }
    };

    const sendMessage = (event) => {
        event.preventDefault();
        if (inputValue.trim() && selectedChatId && stompClientRef.current?.active && isConnected) {
            const chatMessage = {
                sender: adminUsername,
                content: inputValue,
                chatId: selectedChatId,
                type: 'CHAT'
            };
            stompClientRef.current.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify(chatMessage)
            });
            setInputValue('');
        }
    };
    const fetchChatHistory = async (ticketNumber) => {
        /*
        // API Endpoint: GET /api/tickets/chat-history/{ticketNumber}
        // REQUEST PAYLOAD: None
        */
        try {
            const response = await fetch(`${apiUrl}/api/chat-history/${ticketNumber}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const history = await response.json();

                // Update the master list of chats with the fetched history.
                // This "caches" the history so we don't fetch it again.
                setActiveChats(prevChats => {
                    const newChats = new Map(prevChats);
                    const chat = newChats.get(ticketNumber);
                    if (chat) {
                        const updatedChat = { ...chat, messages: history };
                        newChats.set(ticketNumber, updatedChat);
                    }
                    return newChats;
                });
            }
        } catch (error) {
            console.error(`Failed to fetch chat history for ${ticketNumber}:`, error);
        }


    };

    const currentChat = selectedChatId ? activeChats.get(selectedChatId) : null;

    return (
        <div className="admin-chat-dashboard">
            <div className="adminChat">
                <div className="adminChat-header">
                    <h3>Active Chats {!isConnected && '(Offline)'}</h3>
                </div>
                <div className="chat-list">
                    {Array.from(activeChats.values()).map(chat => (
                        <div
                            key={chat.chatId}
                            className={`chat-list-item ${chat.chatId === selectedChatId ? 'selected' : ''} ${chat.unread ? 'unread' : ''}`}
                            onClick={() => selectChat(chat.chatId)}
                        >
                            <div className="chat-item-user">{chat.sender}</div>
                            <div className="chat-item-topic">{chat.content}</div>
                        </div>
                    ))}
                    {activeChats.size === 0 && <p className="no-chats">Waiting for users...</p>}
                </div>
            </div>
            <div className="chat-area">
                {selectedChatId ? (
                    <>
                        <div className="chat-area-header">
                            <h4>Chat with {currentChat?.sender}</h4>
                        </div>
                        <div className="messages-list">
                            {messages.map((msg, index) => {
                                const isSelf = msg.sender === adminUsername;
                                if (msg.type === 'JOIN') {
                                    return <div key={index} className="message-item event">{msg.sender} started the chat</div>;
                                }
                                return (
                                    <div key={index} className={`message-item ${isSelf ? 'user' : 'admin'}`}>
                                        {msg.content}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="message-input-form" onSubmit={sendMessage}>
                            <input
                                type="text"
                                placeholder={isConnected ? "Type your reply..." : "Connecting..."}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                disabled={!isConnected}
                                autoFocus
                            />
                            <button type="submit" disabled={!isConnected}><FaPaperPlane /></button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <p>Select a chat from the left to start viewing messages.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatPage;