import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from './ConfigProvider';
import { useSearchKey } from '../context/SearchKeyContext';
import {FaCheck, FaFlag, FaTrash} from "react-icons/fa";
const domainToRoute = {
    products: 'products',
    sales: 'sales',
    customers: 'customers',
    payments: 'payments'
};

const Notification = ({ setSelectedPage }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDomain, setFilterDomain] = useState('all');
    const [showSeen, setShowSeen] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [pendingReadIds, setPendingReadIds] = useState([]);
    const config = useConfig();
    const apiUrl = config ? config.API_URL : '';
    const navigate = useNavigate();
    const { setSearchKey } = useSearchKey();
    const ITEMS_PER_PAGE = 5;
    const [hoveredBtn, setHoveredBtn] = useState(null);
    const [leftPanelWidth, setLeftPanelWidth] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        fetchAllNotifications();
    }, [apiUrl, currentPage, filterDomain, showSeen, sortOrder]);

    useEffect(() => {
        if (containerRef.current && leftPanelWidth === null) {
            setLeftPanelWidth(containerRef.current.offsetWidth * 0.40);
        }
    }, [containerRef.current]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            const minWidth = 300;
            const maxWidth = containerRect.width - minWidth;
            if (newWidth > minWidth && newWidth < maxWidth) {
                setLeftPanelWidth(newWidth);
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const fetchAllNotifications = async () => {
        setLoading(true);
        setSelectedNotification(null);
        try {
            const url = new URL(`${apiUrl}/api/shop/notifications/all`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            if (filterDomain !== 'all') url.searchParams.append('domain', filterDomain);
            if (showSeen !== 'all') url.searchParams.append('seen', showSeen);
            url.searchParams.append('sort', sortOrder);
            const res = await fetch(url, { method: 'GET', credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            console.log(data)
            setNotifications(data.notifications || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    // Update: On click, call API immediately with single id
    const handleNotificationClick = (notif) => {
        if (!notif.seen) {
            setPendingReadIds([notif.id]);
            batchMarkAsRead([notif.id]);
        }
        setSelectedNotification(notif);
    };

    // New: Batch update notifications as read
    const batchMarkAsRead = async (ids) => {
        if (!ids || ids.length === 0) return;
        console.log("the ids length ", ids);
        try {
            await fetch(`${apiUrl}/api/shop/notifications/update-status`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: ids, status: 'seen' }),
            });
            setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, seen: true } : n));
        } catch (err) {
            console.error('Failed to batch mark notifications as read:', err);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/delete/${notificationId}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to delete notification');
            // Remove from local state first
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setSelectedNotification(null);
            // After local update, refetch notifications for the current page
            // Use setTimeout to ensure state updates before fetching
            setTimeout(() => {
                // If after deletion, the page is empty and not the first page, go back one page
                if (notifications.length === 1 && currentPage > 1) {
                    setCurrentPage(prev => prev - 1);
                } else {
                    fetchAllNotifications();
                }
            }, 0);
        } catch (err) {
            console.error("Error deleting notification:", err);
        }
    };

    const handleFlag = async (notificationId, newFlagStatus) => {
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/flag/${notificationId}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ flagged: newFlagStatus }),
            });

            if (!res.ok) throw new Error('Failed to update flag status');
            const updatedNotification = await res.json();
            // Always update isFlagged based on backend response, for both flag and unflag
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, isFlagged: updatedNotification.flagged } : n
                )
            );
            if (selectedNotification && selectedNotification.id === notificationId) {
                setSelectedNotification(prev => ({ ...prev, isFlagged: updatedNotification.flagged }));
            }
        } catch (err) {
            console.error('Error flagging/unflagging notification:', err);
        }
    };


    const handleTakeAction = (notif) => {
        const route = domainToRoute[notif.domain];
        if (!route) return;
        setSearchKey(notif.searchKey);
        if (setSelectedPage) {
            setSelectedPage(route);
        } else {
            navigate(`/${route}`);
        }
    };

    const getRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)} day(s) ago`;
    };

    // CHANGE 2: New function to format the exact date and time
    const getFormattedDateTime = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleString('en-US', options);
    };

    return (
        <div className="page-container" style={{display:"flex", flexDirection:"column"}}>
            <h2 style={{ marginBottom: "20px" }}>Notifications</h2>
            <div className="glass-card" style={{ marginBottom: "2rem", padding: "1rem", marginRight: "63rem", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.06)", borderRadius: "20px", border: "2px solid var(--primary-color-light)" }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label>
                        Filter Domain:
                        <select className="date-input" value={filterDomain} onChange={e => setFilterDomain(e.target.value)}>
                            <option value="all">All</option>
                            <option value="products">Products</option>
                            <option value="sales">Sales</option>
                            <option value="customers">Customers</option>
                        </select>
                    </label>
                    <label>
                        Show:
                        <select className="date-input" value={showSeen} onChange={e => setShowSeen(e.target.value)}>
                            <option value="all">All</option>
                            <option value="seen">Read</option>
                            <option value="unseen">Unread</option>
                            <option value="flagged">Flagged</option>
                        </select>
                    </label>
                    <label>
                        Sort:
                        <select className="date-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </label>
                </div>
            </div>
            <div ref={containerRef} style={{ display: 'flex', flex: 1, minHeight: 0 }} onMouseUp={() => setIsDragging(false)}>
                <div className="glass-card" style={{ flex: `0 0 ${leftPanelWidth}px`, padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '500px', overflow: 'hidden' }}>
                    {loading ? (<div>Loading...</div>) : notifications.length === 0 ? (<div>No notifications found.</div>) : (
                        <>
                            <div style={{ flex: 1, overflowY: 'auto', marginRight: '-1rem', paddingRight: '1rem' }}>
                                {notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',  // smooth transition for background + movement
                                            background:
                                                selectedNotification?.id === notif.id
                                                    ? '#e0f3ff'
                                                    : notif.seen
                                                        ? 'rgba(0,170,255,0.08)'
                                                        : '#f9f9f9',
                                            borderLeft:
                                                selectedNotification?.id === notif.id
                                                    ? '4px solid #0056b3'
                                                    : notif.seen
                                                        ? '4px solid #ddd'
                                                        : '4px solid var(--primary-color)',
                                            transform: selectedNotification?.id === notif.id ? 'translateX(6px)' : 'translateX(0)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '4px',
                                            }}
                                        >
                                            <div style={{ fontWeight: 600 }}>{notif.title}</div>
                                            <div>  {notif.isFlagged && (
                                                <FaFlag
                                                    size={14}
                                                    color="#ffc107"
                                                    style={{
                                                        position: "absolute",
                                                        top: "8px",
                                                        right: "8px",
                                                    }}
                                                />
                                            )}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.8rem',
                                                    color: '#888',
                                                    flexShrink: 0,
                                                    marginLeft: '10px',
                                                }}
                                            >
                                                {getRelativeTime(notif.createdAt)}
                                            </div>

                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.9rem',
                                                color: '#555',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {notif.message}
                                        </div>
                                    </div>

                                ))}
                            </div>
                            <div className="pagination-controls" style={{ marginTop: '1rem', display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="pagination-btn">&laquo; Prev</button>
                                <span>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="pagination-btn">Next &raquo;</button>
                            </div>
                        </>
                    )}
                </div>
                <div onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
                     style={{
                         width: '10px', cursor: 'col-resize',
                         marginLeft: '1rem', marginRight: '1rem', borderRadius: '5px', flexShrink: 0,
                         transition: 'background-color 0.2s ease'
                     }}/>
                <div className="glass-card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {selectedNotification ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>

                                <div style={{display: "flex", flexDirection:"column"}}>
                                    <h3 style={{ margin: 0,  fontSize: '1.6rem' }}>{selectedNotification.title}</h3>
                                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '8px' }}>
                                        {getFormattedDateTime(selectedNotification.createdAt)}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

                                    {/* FLAG BUTTON with Inline Hover Logic */}
                                    <button
                                        className="small-btn"
                                        onMouseEnter={() => setHoveredBtn('flag')}
                                        onMouseLeave={() => setHoveredBtn(null)}
                                        style={{
                                            backgroundColor: 'var(--primary-color-light)',
                                            color: selectedNotification?.isFlagged ? '#6c757d' : '#ffc107',
                                            borderRadius: '25px',
                                            borderColor: 'var(--primary-color)',
                                            cursor: 'pointer',
                                            // HOVER STYLES START
                                            transform: hoveredBtn === 'flag' ? 'translateY(-2px)' : 'none',
                                            filter: hoveredBtn === 'flag' ? 'brightness(0.95)' : 'none',
                                            boxShadow: hoveredBtn === 'flag' ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                                            transition: 'all 0.2s ease-in-out'
                                            // HOVER STYLES END
                                        }}
                                        onClick={() => handleFlag(selectedNotification.id, !selectedNotification.isFlagged)}
                                    >
                                        <FaFlag size={14}/> {selectedNotification?.isFlagged ? 'Unflag' : 'Flag'}
                                    </button>

                                    {/* DELETE BUTTON with Inline Hover Logic */}
                                    <button
                                        className="small-btn"
                                        onMouseEnter={() => setHoveredBtn('delete')}
                                        onMouseLeave={() => setHoveredBtn(null)}
                                        style={{
                                            // Change background to light red on hover
                                            backgroundColor: hoveredBtn === 'delete' ? '#ffe6e6' : 'var(--primary-color-light)',
                                            color: 'maroon',
                                            borderRadius: '25px',
                                            borderColor: 'var(--primary-color)',
                                            cursor: 'pointer',
                                            // HOVER STYLES START
                                            transform: hoveredBtn === 'delete' ? 'translateY(-2px)' : 'none',
                                            boxShadow: hoveredBtn === 'delete' ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                                            transition: 'all 0.2s ease-in-out'
                                            // HOVER STYLES END
                                        }}
                                        onClick={() => handleDelete(selectedNotification.id)}
                                    >
                                        <FaTrash size={14}/> Delete
                                    </button>

                                </div>
                            </div>
                            <div style={{}}>
                                <div>
                                    <p onClick={() => handleTakeAction(selectedNotification)} style={{ margin: 0, lineHeight: 1.6, cursor: 'pointer' }} >{selectedNotification.message || 'No additional details provided.' }</p>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 'auto', paddingTop: '1rem', textAlign: 'right' }}>
                                Received: {getRelativeTime(selectedNotification.createdAt)}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                            <p>Select a notification to view its details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notification;
