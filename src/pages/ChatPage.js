import React, { useState, useEffect, useRef } from 'react';
// Added FaComment and FaTimesCircle icons for the new buttons
import { FaPaperPlane, FaArrowLeft, FaPlus, FaComment, FaTimesCircle } from 'react-icons/fa';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useConfig } from "./ConfigProvider";
import './ChatPage.css'; // Your existing CSS
import './TicketSystem.css'; // New CSS for the ticketing components
import { useAlert } from '../context/AlertContext';
import PremiumFeature from '../components/PremiumFeature';
const ChatPage = ({ setSelectedPage }) => {
    const { showAlert } = useAlert();
    // --- State Management ---
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'create', or 'chat'
    const [newTicketTopic, setNewTicketTopic] = useState('');
    const [newTicketSummary, setNewTicketSummary] = useState('');
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [closingRemarks, setClosingRemarks] = useState('');
    // Using useState for username is cleaner and more idiomatic for React
    const [username, setUsername] = useState('');

    const stompClientRef = useRef(null);
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const messagesEndRef = useRef(null);

    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailAttachment, setEmailAttachment] = useState(null);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const fileInputRef = useRef(null); // Ref for clearing the file input


    // --- API Functions ---

    // 1. Fetch User Profile and Tickets
    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error(`User session fetch failed`);
            const userData = await userRes.json();
            setUsername(userData.username); // Set username from profile

            const ticketsRes = await fetch(`${apiUrl}/api/tickets/my-latest`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!ticketsRes.ok) throw new Error("Failed to fetch tickets");
            const data = await ticketsRes.json();
            setTickets(data);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            setTickets([]); // Default to empty array on error
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Create a New Ticket
    const createTicket = async () => {
        if (!newTicketTopic || !newTicketSummary) {
            alert("Please provide a topic and summary.");
            return null;
        }
        const payload = { "topic": newTicketTopic, "summary": newTicketSummary, "status": "Open" };
        try {
            const response = await fetch(`${apiUrl}/api/tickets/create`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                // Specifically check if the status is 400 (Bad Request)
                if (response.status === 400) {
                    // We expect a JSON body with validation details
                    const errorData = await response.json();
                    // Show the specific validation summary in an alert
                    showAlert(errorData.summary);
                    // Throw an error to stop execution
                    throw new Error(errorData.summary || 'Bad Request');
                } else {
                    // For any other error (e.g., 500, 404, 403), throw a more generic error
                    throw new Error(`An unexpected error occurred: ${response.statusText}`);
                }
            }


            return await response.json();
        } catch (error) {
            console.error("Error creating ticket:", error);
            return null;
        }
    };

    // 3. Close a Ticket API call (now takes arguments)
    const closeTicketAPI = async (ticketToClose, remarks) => {
        const payload = { "ticketNumber": ticketToClose.ticketNumber, "status": "Closed", "closingRemarks": remarks };
        try {
            const response = await fetch(`${apiUrl}/api/tickets/update`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Failed to close ticket");
            return true;
        } catch (error) {
            console.error("Error closing ticket:", error);
            return false;
        }
    };

    // --- NEW: API call for sending an email ---
    const handleSendEmail = async (event) => {
        event.preventDefault();
        if (!emailSubject || !emailBody) {
            showAlert("Please provide a subject and a message for the email.");
            return;
        }
        setIsSendingEmail(true);

        const formData = new FormData();
        formData.append('subject', emailSubject);
        formData.append('body', emailBody);
        if (emailAttachment) {
            formData.append('attachment', emailAttachment);
        }

        /*
        // API Endpoint: POST /support/send-email
        // REQUEST PAYLOAD: FormData with 'subject', 'body', and optional 'attachment'.
        // Content-Type will be 'multipart/form-data' (set by browser).
        */
        try {
            const response = await fetch(`${apiUrl}/api/support/send-email`, {
                method: 'POST',
                credentials: 'include',
                body: formData, // The browser sets the correct headers for FormData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ summary: 'Failed to send email. Please try again.' }));
                throw new Error(errorData.summary || `HTTP error! status: ${response.status}`);
            }

            showAlert("Email sent successfully!");
            setEmailSubject('');
            setEmailBody('');
            setEmailAttachment(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Clear the file input visually
            }
        } catch (error) {
            console.error("Error sending email:", error);
            showAlert(error.message || "An error occurred while sending the email.");
        } finally {
            setIsSendingEmail(false);
        }
    };

    // --- WebSocket Functions ---
    const connectToChat = (ticket, isNewTicket) => {
        if (stompClientRef.current?.active || !apiUrl) return;
        const chatId = ticket.ticketNumber;

        const onConnect = () => {
            console.log('User Connected for Ticket:', chatId);
            setIsConnected(true);

            stompClientRef.current.subscribe(`/topic/chat/${chatId}`, (payload) => {
                setMessages(prev => [...prev, JSON.parse(payload.body)]);
            });

            stompClientRef.current.publish({
                destination: '/app/chat.notifyAdmin',
                body: JSON.stringify({ sender: username, chatId: chatId, content: `Topic: ${ticket.topic}`, type: 'JOIN' })
            });

            if (isNewTicket) {
                stompClientRef.current.publish({
                    destination: '/app/chat.sendMessage',
                    body: JSON.stringify({ sender: username, content: `Ticket Summary: ${ticket.summary}`, chatId: chatId, type: 'CHAT' })
                });
            }
        };

        const getWebSocketUrl = (url) => { try { return `${new URL(url).origin}/ws`; } catch (e) { return ''; } };
        const webSocketUrl = getWebSocketUrl(apiUrl);
        if (!webSocketUrl) return;

        stompClientRef.current = new Client({
            webSocketFactory: () => new SockJS(webSocketUrl),
            onConnect,
            reconnectDelay: 5000,
        });
        stompClientRef.current.activate();
    };

    const sendMessage = (event) => {
        event.preventDefault();
        if (inputValue.trim() && isConnected) {
            const chatMessage = { sender: username, content: inputValue, chatId: activeTicket.ticketNumber, type: 'CHAT' };
            stompClientRef.current.publish({ destination: '/app/chat.sendMessage', body: JSON.stringify(chatMessage) });
            setInputValue('');
        }
    };

    // --- Handlers ---
    const handleCreateTicket = async () => {
        const newTicket = await createTicket();
        if (newTicket) {
            setActiveTicket(newTicket);
            setMessages([{ sender: username, content: `Ticket Summary: ${newTicket.summary}`, type: 'CHAT' }]);
            setView('chat');
            connectToChat(newTicket, true);
        }
    };

    const handleContinueChat = async (ticket) => {
        setActiveTicket(ticket);
        setView('chat');
        try {
            const response = await fetch(`${apiUrl}/api/chat-history/${ticket.ticketNumber}`, {
                method: 'GET',
                credentials: 'include',
            });
            setMessages(response.ok ? await response.json() : []);
        } catch (error) {
            console.error("Error fetching chat history:", error);
            setMessages([]);
        }
        connectToChat(ticket, false);
    };

    const handleOpenCloseModal = (ticket) => {
        setActiveTicket(ticket);
        setIsCloseModalOpen(true);
    };

    const handleCloseTicketSubmit = async () => {
        if (!closingRemarks) {
            alert("Please provide closing remarks.");
            return;
        }
        const success = await closeTicketAPI(activeTicket, closingRemarks);
        if (success) {
            setIsCloseModalOpen(false);
            setClosingRemarks('');
            if (view === 'chat') {
                if (stompClientRef.current?.active) stompClientRef.current.deactivate();
                setSelectedPage('dashboard');
            } else {
                fetchInitialData();
            }
        }
    };

    // --- Effects ---
    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        return () => { if (stompClientRef.current?.active) stompClientRef.current.deactivate(); };
    }, []);

    // --- Helper function to render the correct view ---
    const renderContent = () => {
        if (view === 'chat') {
            return (
                <div className="chat-window-page">
                    <div className="chat-header">
                        <span>Ticket: {activeTicket.ticketNumber} ({activeTicket.topic})</span>
                        <div className="chat-header-actions">
                            <button className="back-link-button" onClick={() => { setView('list'); if (stompClientRef.current?.active) stompClientRef.current.deactivate(); }}>
                                <FaArrowLeft /> Back to Tickets
                            </button>
                            <button className="close-btn-link" onClick={() => handleOpenCloseModal(activeTicket)}>Close Ticket</button>
                        </div>
                    </div>
                    <div className="messages-list">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message-item ${msg.sender === username ? 'user' : 'admin'}`}>
                                {msg.content}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="message-input-form" onSubmit={sendMessage}>
                        <input type="text" placeholder={isConnected ? "Type a message..." : "Connecting..."} value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={!isConnected} autoFocus />
                        <button type="submit" disabled={!isConnected}><FaPaperPlane /></button>
                    </form>
                </div>
            );
        }

        if (view === 'create') {
            return (
                <div className="topic-selection-container glass-card">
                    <button className="back-link-button" onClick={() => setView('list')}><FaArrowLeft /> Back to Tickets</button>
                    <h2>Create New Support Ticket</h2>
                    <div className="form-group"><label>Topic</label><select value={newTicketTopic} onChange={(e) => setNewTicketTopic(e.target.value)}><option value="">-- Select a Topic --</option><option value="Product">Product</option><option value="Customers">Customers</option><option value="Sales">Sales</option><option value="Billings">Billings</option></select></div>
                    <div className="form-group"><label>Summary</label><textarea placeholder="Briefly describe your issue..." value={newTicketSummary} onChange={(e) => setNewTicketSummary(e.target.value)} /></div>
                    <div className="form-actions"><button className="process-payment-btn" onClick={handleCreateTicket}>Save & Start Chat</button></div>
                </div>
            );
        }

        // Default view: 'list'
        return (
            <div className="ticket-list-container">
                <div className="ticket-list-header">
                    <h2>My Support Tickets</h2>
                    <PremiumFeature>
                    <button className="btn" onClick={() => setView('create')}><FaPlus /> Create New Ticket</button>  </PremiumFeature>
                </div>
                {isLoading ? <p>Loading tickets...</p> : (
                    <div className="tickets-table-wrapper">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Ticket #</th>
                                <th>Created On</th>
                                <th>Topic</th>
                                <th>Summary</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {tickets.map(ticket => (
                                <tr key={ticket.ticketNumber}>
                                    <td>{ticket.ticketNumber}</td>
                                    <td>{new Date(ticket.createdDate).toLocaleDateString()}</td>
                                    <td>{ticket.topic}</td>
                                    <td>{ticket.summary}</td>
                                    <td><span className={`status-badge status-${ticket.status.toLowerCase()}`}>{ticket.status}</span></td>
                                    <td>
                                        {ticket.status && ticket.status.toLowerCase() === 'open' && (
                                            <div className="ticket-actions">
                                                <button className="action-btn continue" title="Continue Chat" onClick={() => handleContinueChat(ticket)}>
                                                    <FaComment /> Chat
                                                </button>
                                                <button className="action-btn close" title="Close Ticket" onClick={() => handleOpenCloseModal(ticket)}>
                                                    <FaTimesCircle /> Close
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* --- NEW EMAIL FORM SECTION --- */}
                <div className="email-support-container glass-card">
                    <h2>Contact Support via Email</h2>
                    <form onSubmit={handleSendEmail}>
                        <div className="form-group">
                            <label htmlFor="email-subject">Subject</label>
                            <input
                                id="email-subject"
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="e.g., Issue with recent invoice"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email-body">Message</label>
                            <textarea
                                id="email-body"
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="Please describe your issue in detail..."
                                required
                                style={{ width: '100%', minHeight: '48px', padding: '6px', borderRadius: '8px', border: '1px solid var(--bp-border)', resize: 'vertical', background: 'var(--glass-card)', color: 'var(--bp-text)' }}

                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email-attachment-input">Attachment (Optional)</label>
                            <input
                                ref={fileInputRef}
                                id="email-attachment-input"
                                type="file"
                                onChange={(e) => setEmailAttachment(e.target.files[0])}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn" disabled={isSendingEmail}>
                                {isSendingEmail ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // --- Main Component Return ---
    return (
        <>
            {/* The modal is now rendered at the top level, so it's always available */}
            {isCloseModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style ={{ marginBottom:"1.4rem"}}>Close Ticket {activeTicket?.ticketNumber}</h3>
                        <p style ={{ marginBottom:"1.0rem", fontStyle: "italic"}}>Please provide a reason for closing this ticket.</p>
                        <textarea style={{ width: '100%', minHeight: '100px', padding: '10px', borderRadius: '15px', border: '1px solid var(--border-color)', background: 'var(--glass-bg)', resize: 'vertical', fontSize: '1rem', color: 'var(--text-color)' }}  placeholder="Closing remarks..." value={closingRemarks} onChange={(e) => setClosingRemarks(e.target.value)} />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setIsCloseModalOpen(false)}>Cancel</button>
                            <button className="btn" onClick={handleCloseTicketSubmit}>Submit & Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* The renderContent function displays the correct view */}
            {renderContent()}
        </>
    );
};

export default ChatPage;