import React, { useState, useEffect, useCallback } from 'react';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { useConfig } from "./ConfigProvider";
import {MdDownload} from "react-icons/md";
import './SalesPage.css';
import { formatDate } from "../utils/formatDate";
import { useAlert } from '../context/AlertContext';
import {PaperPlaneTilt} from "@phosphor-icons/react";
import { FaPaperPlane } from 'react-icons/fa';
import PremiumFeature from '../components/PremiumFeature';
import toast, {Toaster} from 'react-hot-toast';

import {
    MdPerson,
    MdEmail,
    MdPhone,
    MdShoppingCart,
    MdClose,
    MdCheckCircle,
    MdCancel,
    MdNotifications,
    MdSend,
    MdPayment
} from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import {useSearchKey} from "../context/SearchKeyContext";

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const SalesPage = () => {
    const { showAlert } = useAlert();
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // --- CHANGE 1: Enable setPageSize ---
    const [pageSize, setPageSize] = useState(10);

    const [totalPages, setTotalPages] = useState(10);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [hasSortActive, setHasSortActive] = useState(false);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [currentReminderInvoiceId, setCurrentReminderInvoiceId] = useState(null);
    const [reminderMessage, setReminderMessage] = useState("");
    const [sendViaEmail, setSendViaEmail] = useState(true);
    const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPaymentOrder, setCurrentPaymentOrder] = useState(null);
    const [payingAmount, setPayingAmount] = useState("");
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [hoveredReminderBtnId, setHoveredReminderBtnId] = useState(null);

    const fetchSales = useCallback(async (termToSearch, page = 1) => {
        const finalSearchTerm = termToSearch !== undefined ? termToSearch : searchTerm;

        try {
            const response = await axios.get(`${apiUrl}/api/shop/get/sales`, {
                params: {
                    page: page,
                    size: pageSize, // Used here
                    search: finalSearchTerm || '',
                    sort: sortConfig.key,
                    dir: sortConfig.direction,
                },
                withCredentials: true,
            });

            setSales(Array.isArray(response.data.content) ? response.data.content : []);
            setTotalPages(response.data.totalPages || 0);
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching sales:", error);
            toast.error("Something went wrong while fetching sales. Please try again.");

            setSales([]);
            setTotalPages(0);
            setCurrentPage(1);

            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                toast.error("Your session may have expired. Please log in again.");
            }
        }
        // --- CHANGE 2: Added pageSize to dependency array ---
    }, [apiUrl, pageSize, sortConfig.key, sortConfig.direction, setSales, setTotalPages, setCurrentPage, searchTerm]);


    const config = useConfig();
    var apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    // ... [Styles and other hooks remain unchanged] ...

    const location = useLocation();
    const { searchKey, setSearchKey } = useSearchKey();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key) {
            setSearchTerm(key);
        }
    }, [location.search]);

    useEffect(() => {
        return () => {
            setSearchKey('');
        };
    }, [setSearchKey]);

    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) {
            console.log("Context search key detected:", searchKey);
            setSearchTerm(searchKey);
            fetchSales(searchKey, 1);
        }
    }, [searchKey, fetchSales]);

    useEffect(() => {
        if (searchKey && searchKey === debouncedSearchTerm) {
            return;
        }
        console.log("Fetching sales for:", debouncedSearchTerm || "(no search term)", "Page:", currentPage);
        fetchSales(debouncedSearchTerm, currentPage);
    }, [debouncedSearchTerm, currentPage, fetchSales, searchKey]);


    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key && key !== searchKey && key !== searchTerm) {
            console.log("URL search key detected:", key);
            setSearchTerm(key);
            fetchSales(key, 1);
        }
    }, [location.search, fetchSales, searchKey, searchTerm]);


    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: (prev.key === key && prev.direction === 'asc') ? 'desc' : 'asc'
        }));
        setHasSortActive(true);
        setCurrentPage(1);
    };

    const indexOfLast = currentPage * pageSize;
    const indexOfFirst = indexOfLast - pageSize;
    const currentSales = sales;

    // --- CHANGE 3: Handler for changing page size ---
    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        setPageSize(newSize);
        setCurrentPage(1); // Always reset to page 1 when changing size to avoid empty pages
    };

    const handleOpenReminderModal = (saleId) => {
        setCurrentReminderInvoiceId(saleId);
        setReminderMessage("");
        setSendViaEmail(true);
        setSendViaWhatsapp(false);
        setShowReminderModal(true);
    };

    const handleConfirmSendReminder = async () => {
        if (!currentReminderInvoiceId) return;

        if (!sendViaEmail && !sendViaWhatsapp) {
            showAlert("Please select at least one channel (Email or WhatsApp).", "warning");
            return;
        }

        try {
            const payload = {
                message: reminderMessage,
                sendViaEmail: sendViaEmail,
                sendViaWhatsapp: sendViaWhatsapp,
                orderId: currentReminderInvoiceId
            };

            await axios.post(
                `${apiUrl}/api/shop/payment/send-reminder`,
                payload,
                { withCredentials: true }
            );

            setSales(currentSales =>
                currentSales.map(sale =>
                    sale.id === currentReminderInvoiceId
                        ? { ...sale, reminderCount: (sale.reminderCount || 0) + 1 }
                        : sale
                )
            );

            toast.success('Reminder sent successfully!', 'success');
            setShowReminderModal(false);
            setReminderMessage("");
            setCurrentReminderInvoiceId(null);

        } catch (error) {
            console.error("Error sending reminder:", error);
            showAlert("Failed to send the reminder. Please try again.");
        }
    };

    // ... [Payment Handlers and Invoice Handlers remain unchanged] ...
    const handleOpenPaymentModal = (sale) => {
        setCurrentPaymentOrder(sale);
        setPayingAmount("");
        setShowPaymentModal(true);
    };

    const handleConfirmUpdatePayment = async () => {
        if (!currentPaymentOrder) return;
        const amount = parseFloat(payingAmount);
        const dueAmount = currentPaymentOrder.total - currentPaymentOrder.paid;
        if (isNaN(amount) || amount <= 0) {
            showAlert("Please enter a valid payment amount.", "warning");
            return;
        }
        if (amount > dueAmount + 0.01) {
            showAlert(`Payment cannot be more than the due amount of ₹${dueAmount.toLocaleString()}.`, "warning");
            return;
        }
        setIsUpdatingPayment(true);
        try {
            const payload = { invoiceId: currentPaymentOrder.id, amount: amount };
            await axios.post(`${apiUrl}/api/shop/payment/update`, payload, { withCredentials: true });
            setSales(prevSales =>
                prevSales.map(sale => {
                    if (sale.id === currentPaymentOrder.id) {
                        const newPaidAmount = sale.paid + amount;
                        const newStatus = (newPaidAmount + 0.01) >= sale.total ? 'Paid' : 'SemiPaid';
                        return { ...sale, paid: newPaidAmount, status: newStatus };
                    }
                    return sale;
                })
            );
            showAlert("Payment updated successfully!", "success");
            setShowPaymentModal(false);
            setCurrentPaymentOrder(null);
        } catch (error) {
            console.error("Error updating payment:", error);
            showAlert("Failed to update payment. Please try again.");
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    const handleDownloadInvoice = async (saleId) => {
        try {
            const response = await axios.get(`${apiUrl}/api/shop/get/invoice/${saleId}`, { responseType: "blob", withCredentials: true });
            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `invoice-${saleId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Invoice downloaded!");
        } catch (error) {
            console.error("Error downloading invoice:", error);
            showAlert("Failed to download the invoice. Please try again.");
        }
    };

    const handleSendInvoice = async (saleId) => {
        if (!saleId) {
            showAlert("Order Reference number is not available.", "error");
            return;
        }
        if (!window.confirm("Send the invoice to customer via email?")) return;
        try {
            const response = await fetch(`${apiUrl}/api/shop/send-invoice-email/${saleId}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || `Failed to send invoice: ${response.statusText}`);
            }
            toast.success("Invoice sent successfully!", "success");
        } catch (error) {
            console.error("Error sending invoice email:", error);
            showAlert(`Could not send invoice: ${error.message}`, "error");
        }
    };

    const getPaginationItems = (currentPage, totalPages) => {
        const totalPageNumbersToShow = 7;
        if (totalPages <= totalPageNumbersToShow) {
            return [...Array(totalPages)].map((_, i) => i + 1);
        }
        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (currentPage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };

    const handleRowClick = async (saleId) => {
        try {
            const response = await axios.get(`${apiUrl}/api/shop/get/order/${saleId}`, { withCredentials: true });
            setSelectedOrder(response.data);
            setShowModal(true);
        } catch (error) {
            console.error("Error fetching order details:", error);
            showAlert("Failed to fetch order details.");
        }
    };

    const paginationItems = getPaginationItems(currentPage, totalPages);

    return (
        <div className="page-container">
            <Toaster position="top-center" toastOptions={{
                duration: 2000,
                style: {
                    background: 'lightgreen',
                    color: 'var(--text-color)',
                    borderRadius: '25px',
                    padding: '12px',
                    width: '100%',
                    fontSize: '16px',
                },
            }}   reverseOrder={false} />
            <h2>Sales</h2>
            <div className="page-header" style={{marginTop: "20px"}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.2rem 1rem' }}>
                    <input
                        type="text"
                        placeholder="Search by Invoice ID or Customer..."
                        className="search-bar"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            <div className="glass-card" >
                <table className="data-table">
                    <thead>
                    <tr>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('id')}>
                            Invoice ID {hasSortActive && sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('customer')}>
                            Customer {hasSortActive && sortConfig.key === 'customer' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('gstin')}>
                            Gstin {hasSortActive && sortConfig.key === 'gstin' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>
                            Date {hasSortActive && sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('totalAmount')}>
                            Total {hasSortActive && sortConfig.key === 'totalAmount' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('paid')}>
                            Paid {hasSortActive && sortConfig.key === 'paid' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th>Status</th>
                        <th><PremiumFeature>Send  </PremiumFeature></th>
                        <th>Invoice</th>
                        <th>Remind</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentSales.map((sale) => {
                        const isRemindHovered = hoveredReminderBtnId === sale.id;
                        return (
                            <tr
                                key={sale.id}
                                onClick={() => handleRowClick(sale.id)}
                                onMouseEnter={() => setHoveredRow(sale.id)}
                                onMouseLeave={() => setHoveredRow(null)}
                                style={{
                                    cursor: "pointer",
                                    background: hoveredRow === sale.id ? "rgba(0, 170, 255, 0.08)" : "transparent",
                                    transition: "all 0.25s ease",
                                }}
                            >
                                <td>{sale.id}</td>
                                <td>{sale.customer}</td>
                                <td>{sale.gstin}</td>
                                <td>{formatDate(sale.date)}</td>
                                <td>₹{sale.total.toLocaleString()}</td>
                                <td>₹{sale.paid.toLocaleString()}</td>
                                <td>
                                    <span className={sale.status === 'Paid' ? 'status-paid' : 'status-pending'}>
                                        {sale.status}
                                    </span>
                                </td>
                                <td>  <PremiumFeature>
                                    <button
                                        className="action-icons"
                                        title="Send Invoice via mail"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSendInvoice(sale.id);
                                        }}
                                        style={{
                                            cursor: "pointer",
                                            borderRadius: "6px",
                                            padding: "6px",
                                            marginRight: "8px",
                                            display: "inline-flex",
                                            backgroundColor: "var(--primary-color-light)",
                                            alignItems: "center",
                                            border: "var(--border-color) solid 1px",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <i className="fa-duotone fa-solid fa-paper-plane" style={{fontSize:"18px", color:"var(--text-color)"}}></i>
                                    </button>  </PremiumFeature>
                                </td>
                                <td>
                                    <button
                                        className="action-icons"
                                        title="Download Invoice"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadInvoice(sale.id);
                                        }}
                                        style={{
                                            cursor: "pointer",
                                            borderRadius: "6px",
                                            padding: "6px",
                                            marginRight: "8px",
                                            display: "inline-flex",
                                            backgroundColor: "var(--primary-color-light)",
                                            alignItems: "center",
                                            border: "var(--border-color) solid 1px",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <i className="fa-duotone fa-solid fa-download" style={{fontSize:"18px", color:"var(--text-color)"}}></i>
                                    </button>
                                </td>
                                <td>
                                    {(sale.total !== sale.paid) && (
                                        <PremiumFeature> <button
                                            className="reminder-btn"
                                            title="Send Payment Reminder"
                                            onMouseEnter={() => setHoveredReminderBtnId(sale.id)}
                                            onMouseLeave={() => setHoveredReminderBtnId(null)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenReminderModal(sale.id);
                                            }}
                                            style={{
                                                cursor: "pointer",
                                                borderRadius: "6px",
                                                padding: "6px 8px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "5px",
                                                background: "var(--small-bg-cyan)",
                                                border: "1px solid var(--border-color)",
                                                transition: 'all 0.2s ease',
                                                transform: isRemindHovered ? 'scale(1.1)' : 'scale(1)',
                                                opacity: isRemindHovered ? 0.8 : 1
                                            }}
                                        >
                                            <i className="fa-duotone fa-solid fa-bell-plus" style={{fontSize: "20px"}}></i>
                                            <span style={{ fontWeight: "bold", fontSize: "0.9em", color: "var(--text-color)" }}>
                                                {sale.reminderCount || 0}
                                            </span>
                                        </button>  </PremiumFeature>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* --- CHANGE 4: REFACTORED PAGINATION CONTAINER --- */}
            {/* --- UPDATED PAGINATION SECTION --- */}
            {/* Show footer as long as there are items, not just when pages > 1 */}
            {sales.length > 0 && (
                <div className="pagination-footer">

                    {/* LEFT: Page Size Selector */}
                    <div className="page-size-container">
                        <span className="page-size-label">Rows per page:</span>
                        <div className="select-wrapper">
                            <select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                className="custom-page-select"
                            >
                                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* CENTER: Pagination Controls (Only show buttons if more than 1 page) */}
                    <div className="pagination-controls">
                        {totalPages > 1 && (
                            <>
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                                    &laquo; Prev
                                </button>

                                {paginationItems.map((item, index) => {
                                    if (typeof item === 'string') {
                                        return (
                                            <span key={index} className="pagination-ellipsis">
                                                {item}
                                            </span>
                                        );
                                    }
                                    return (
                                        <button
                                            key={index}
                                            className={currentPage === item ? 'active' : ''}
                                            onClick={() => setCurrentPage(item)}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}

                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                                    Next &raquo;
                                </button>
                            </>
                        )}
                    </div>

                    {/* RIGHT: Empty div to balance grid */}
                    <div className="pagination-spacer"></div>
                </div>
            )}

            {/* ... [Modals remain unchanged] ... */}
            {showModal && selectedOrder && (
                <div
                    className="order-modal-overlay"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="order-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="order-modal-header">
                            <h2>Invoice #{selectedOrder.invoiceId}</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        {/* Box 1: Customer Details */}
                        <h3><MdPerson size={24} /> Customer Details</h3>
                        <div className="order-box" style={{ marginLeft: '40px', marginTop: '20px' }}>

                            <div className="detail-item" >
                                <MdPerson size={20} color="var(--primary-color)" />
                                <span><strong>Customer:</strong> {selectedOrder.customerName}</span>
                            </div>
                            <div className="detail-item">
                                <MdEmail size={20} color="var(--primary-color)" />
                                <span><strong>Email:</strong> {selectedOrder.customerEmail}</span>
                            </div>
                            <div className="detail-item">
                                <MdPhone size={20} color="var(--primary-color)" />
                                <span><strong>Phone:</strong> {selectedOrder.customerPhone}</span>
                            </div>
                            <div className="detail-item">
                                {selectedOrder.paid ? (
                                    <MdCheckCircle size={20} color="green" />
                                ) : (
                                    <MdCancel size={20} color="red" />
                                )}
                                <span>
                              <strong>Status:</strong> {selectedOrder.paid ? "Paid" : "Partially Paid"}
                                </span>
                            </div>
                        </div>

                        {/* Box 2: Order Items */}
                        <div className="order-box">
                            <h3><MdShoppingCart size={24} /> Order Items   <p style={{marginLeft: '10rem'}}>GSTNumber:  {selectedOrder.gstNumber}</p></h3>
                            <table className="order-items-table">
                                <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Description</th>
                                    <th>Cost (each)</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                </tr>
                                </thead>
                                <tbody>
                                {selectedOrder.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.productName}</td>
                                        <td>{item.details}</td>
                                        <td>₹{(item.unitPrice / item.quantity).toLocaleString()}</td>
                                        <td>{item.quantity.toLocaleString()}</td>
                                        <td>₹{item.unitPrice.toLocaleString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>


                        {/* Box 3: Totals & GST */}
                        <div className="order-box">
                            {selectedOrder.subTotal !== undefined && (
                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>₹{selectedOrder.subTotal.toLocaleString()}</span>
                                </div>
                            )}
                            {selectedOrder.tax !== undefined && (
                                <div className="summary-row">
                                    <span>Tax</span>
                                    <span>₹{selectedOrder.tax.toLocaleString()}</span>
                                </div>
                            )}
                            {selectedOrder.discount !== undefined && (
                                <div className="summary-row">
                                    <span>Discount</span>
                                    <span style={{ color: 'red' }}>
              -₹{selectedOrder.discount.toLocaleString()}
            </span>
                                </div>
                            )}

                            <div className="summary-divider" />
                            {selectedOrder.gstRate !== undefined && (
                                <div className="summary-row" style={{ fontWeight: 'bold' }}>
                                    <span className="gstTotal">GST</span>
                                    <span className="gstTotal">₹{selectedOrder.gstRate.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="total-amount">
                                <span>Total</span>
                                <span>₹{selectedOrder.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showReminderModal && (
                <div className="order-modal-overlay" onClick={() => setShowReminderModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="order-modal-header">
                            <h2>Send Reminder for Invoice #{currentReminderInvoiceId}</h2>
                            <button className="close-button" onClick={() => setShowReminderModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                    Message (Optional):
                                </label>
                                <textarea
                                    value={reminderMessage}
                                    onChange={(e) => setReminderMessage(e.target.value)}
                                    placeholder="Add a custom message for the reminder..."
                                    rows="4"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-color)',
                                        fontSize: '1rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                    Send via:
                                </label>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            onChange={(e) => setSendViaEmail(e.target.checked)}
                                            style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)' }}
                                        />
                                        Email
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={sendViaWhatsapp}
                                            onChange={(e) => setSendViaWhatsapp(e.target.checked)}
                                            style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)' }}
                                        />
                                        WhatsApp
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    className="btn"
                                    onClick={() => setShowReminderModal(false)}
                                    style={{ background: 'var(--glass-card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleConfirmSendReminder}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    Send Reminder <MdSend size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showPaymentModal && currentPaymentOrder && (
                <div className="order-modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="order-modal-header">
                            <h2>Update Payment for #{currentPaymentOrder.id}</h2>
                            <button className="close-button" onClick={() => setShowPaymentModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <div className="payment-summary-box" style={{ marginBottom: '20px', padding: '15px', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px'}}>
                                    <span>Total Amount:</span>
                                    <strong>₹{currentPaymentOrder.total.toLocaleString()}</strong>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px'}}>
                                    <span>Amount Paid:</span>
                                    <strong style={{color: 'green'}}>₹{currentPaymentOrder.paid.toLocaleString()}</strong>
                                </div>
                                <hr style={{border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0'}} />
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold'}}>
                                    <span>Amount Due:</span>
                                    <strong style={{color: '#d32f2f'}}>₹{(currentPaymentOrder.total - currentPaymentOrder.paid).toLocaleString()}</strong>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                    Enter Paying Amount:
                                </label>
                                <input
                                    type="number"
                                    value={payingAmount}
                                    onChange={(e) => setPayingAmount(e.target.value)}
                                    placeholder="0.00"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-color)',
                                        fontSize: '1.2rem',
                                        textAlign: 'right'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    className="btn"
                                    onClick={() => setShowPaymentModal(false)}
                                    style={{ background: 'var(--glass-card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                                    disabled={isUpdatingPayment}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleConfirmUpdatePayment}
                                    disabled={isUpdatingPayment}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {isUpdatingPayment ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SalesPage;