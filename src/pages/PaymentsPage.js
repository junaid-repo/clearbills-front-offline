// src/pages/PaymentsPage.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useConfig } from "./ConfigProvider";
import { formatDate } from "../utils/formatDate";
import { useSearchKey } from "../context/SearchKeyContext";
import { useAlert } from '../context/AlertContext';
import axios from 'axios';
import toast, {Toaster} from 'react-hot-toast';
import { FaPaperPlane, FaMoneyBill, FaCreditCard} from 'react-icons/fa';

import {
    MdClose,
    MdNotifications,
    MdSend,
    MdPayment,
    MdRefresh,
    MdHistory,
    MdArrowUpward,
    MdArrowDownward
} from 'react-icons/md';

// Helper function to format date and time as 'dd-mm-yyyy hh:mm'
const formatDateTime = (isoDate) => {
    if (!isoDate) return "";
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return "";

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch (e) {
        console.error("Error formatting date: ", e);
        return "";
    }
};

const PaymentsPage = ({ setSelectedPage }) => {
    const { showAlert } = useAlert();
    const [payments, setPayments] = useState([]);

    const [searchTerm, setSearchTerm] = useState(() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (s) return JSON.parse(s).searchTerm || "";
        } catch (e) { }
        return "";
    });
    const [paymentMode, setPaymentMode] = useState(() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (s) return JSON.parse(s).paymentMode || "All";
        } catch (e) { }
        return "All";
    });
    const [status, setStatus] = useState(() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (s) return JSON.parse(s).status || "All";
        } catch (e) { }
        return "All";
    });
    const [currentPage, setCurrentPage] = useState(1);

    // --- CHANGE 1: Made itemsPerPage dynamic ---
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });


    const now = new Date();
    const { searchKey, setSearchKey } = useSearchKey();
    const defaultTo = now;
    const defaultFrom = new Date();
    defaultFrom.setDate(now.getDate() - 6);

    const formatDateInput = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const [hoveredButton, setHoveredButton] = useState(null);

    const [themeColors, setThemeColors] = useState({
        paid: '#006400',
        due: '#8b0000'
    });

    useEffect(() => {
        const currentTheme = localStorage.getItem("theme") || "light";

        if (currentTheme === "dark") {
            setThemeColors({
                paid: '#90ee90',
                due: '#f08080'
            });
        } else {
            setThemeColors({
                paid: '#006400',
                due: '#8b0000'
            });
        }
    }, []);

    const domainToRoute = {
        products: 'products',
        sales: 'sales',
        customers: 'customers',
    };

    const config = useConfig();
    var apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    const _savedFilters = (() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (!s) return null;
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    })();

    const [fromDate, setFromDate] = useState(() => {
        return (_savedFilters && _savedFilters.fromDate) || formatDateInput(defaultFrom);
    });
    const [toDate, setToDate] = useState(formatDateInput(defaultTo));

    const [showReminderModal, setShowReminderModal] = useState(false);
    const [currentReminderInvoiceId, setCurrentReminderInvoiceId] = useState(null);
    const [reminderMessage, setReminderMessage] = useState("");
    const [sendViaEmail, setSendViaEmail] = useState(true);
    const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPaymentOrder, setCurrentPaymentOrder] = useState(null);
    const [payingAmount, setPayingAmount] = useState("");
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState("");

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [currentHistoryPayment, setCurrentHistoryPayment] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (to < from) {
            setFromDate(toDate);
            return;
        }

        const diffDays = Math.floor((to - from) / (1000 * 60 * 60 * 24));

        if (diffDays > 180) {
            showAlert("Date range cannot exceed 6 months. Adjusting the start date.");
            const newFrom = new Date(to);
            newFrom.setDate(newFrom.getDate() - 180);
            setFromDate(formatDateInput(newFrom));
        }
    }, [fromDate, toDate, showAlert]);

    useEffect(() => {
        try {
            const obj = { fromDate, toDate, paymentMode, searchTerm, status };
            localStorage.setItem("payments_filters", JSON.stringify(obj));
        } catch (e) {
        }
    }, [fromDate, toDate, paymentMode, searchTerm, status]);

    const uniqueModes = useMemo(() => {
        const set = new Set();
        payments.forEach((p) => {
            if (p.method) set.add(p.method);
        });
        return Array.from(set);
    }, [payments]);

    const fetchPayments = useCallback(async () => {
        if (!apiUrl) return;

        setIsLoading(true);
        const query = `?fromDate=${fromDate}&toDate=${toDate}&_=${Date.now()}`;
        try {
            const response = await fetch(`${apiUrl}/api/shop/get/paymentLists${query}`, {
                method: "GET",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                },
            });
            const data = await response.json();
            setPayments(data);
        } catch (err) {
            console.error(err);
            showAlert("Error fetching payments");
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, fromDate, toDate, showAlert]);

    useEffect(() => {
        if (apiUrl) fetchPayments();
    }, [apiUrl, fetchPayments]);


    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const methodIcons = {
        'UPI': <i className="fa-solid fa-qrcode"></i>,
        'CARD': <i className="fa-duotone fa-solid fa-credit-card"></i>,
        'CASH': <i className="fa-duotone fa-solid fa-money-bills"></i>
    };

    const toDateObjStart = (dateStrOrObj) => {
        const d = new Date(dateStrOrObj);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const toDateObjEnd = (dateStrOrObj) => {
        const d = new Date(dateStrOrObj);
        d.setHours(23, 59, 59, 999);
        return d;
    };

    const filteredPayments = useMemo(() => {
        const from = toDateObjStart(fromDate);
        const to = toDateObjEnd(toDate);

        return payments.filter((p) => {
            const matchesSearch = p.saleId
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            const matchesMode = paymentMode === "All" || !paymentMode ? true : (p.method === paymentMode);
            const matchesStatus = status === "All" || !status ? true : (p.status === status);
            const pDate = new Date(p.date);
            if (isNaN(pDate.getTime())) return matchesSearch;

            const withinRange = pDate >= from && pDate <= to;

            return matchesSearch && withinRange && matchesMode && matchesStatus;
        });
    }, [payments, searchTerm, fromDate, toDate, paymentMode, status]);

    const sortedPayments = useMemo(() => {
        let sortableItems = [...filteredPayments];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                let comparison = 0;
                if (['amount', 'paid', 'due'].includes(sortConfig.key)) {
                    comparison = (Number(aValue) || 0) - (Number(bValue) || 0);
                } else if (sortConfig.key === 'date') {
                    comparison = new Date(aValue) - new Date(bValue);
                } else {
                    comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [filteredPayments, sortConfig]);

    const handleTakeAction = (orderNumber) => {
        const route = domainToRoute['sales'];
        if (!route) return;
        setSearchKey(orderNumber);
        if (setSelectedPage) {
            setSelectedPage(route);
        }
    };

    const { totalAmount, totalDueAmount, dueCount, modeCounts } = useMemo(() => {
        const counts = {};
        let total = 0;
        let totalDue = 0;
        let countDue = 0;

        filteredPayments.forEach((p) => {
            const amt = Number(p.amount) || 0;
            const dueAmt = Number(p.due) || 0;

            total += amt;
            totalDue += dueAmt;

            if (dueAmt > 0) {
                countDue++;
            }

            const m = p.method || "Unknown";
            counts[m] = (counts[m] || 0) + 1;
        });

        return {
            totalAmount: total,
            totalDueAmount: totalDue,
            dueCount: countDue,
            modeCounts: counts
        };
    }, [filteredPayments]);

    // --- CHANGE 2: Helper for Page Size Logic ---
    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    // --- CHANGE 3: Smart Pagination Helper ---
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

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentPayments = sortedPayments.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);

    // Calculate pagination items for the footer
    const paginationItems = getPaginationItems(currentPage, totalPages);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, fromDate, toDate, paymentMode, status, sortConfig]);


    const handleOpenReminderModal = (saleId) => {
        setCurrentReminderInvoiceId(saleId);
        setReminderMessage("");
        setSendViaEmail(true);
        setSendViaWhatsapp(false);
        setShowReminderModal(true);
    };

    const handleConfirmSendReminder = async () => {
        if (!currentReminderInvoiceId) return;

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

            setPayments(currentPayments =>
                currentPayments.map(p =>
                    p.saleId === currentReminderInvoiceId
                        ? { ...p, reminderCount: (p.reminderCount || 0) + 1 }
                        : p
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

    const handleOpenPaymentModal = (payment) => {
        const totalAmount = payment.paid + payment.due;
        setCurrentPaymentOrder({
            id: payment.saleId,
            total: totalAmount,
            paid: payment.paid
        });
        setPayingAmount("");
        setPaymentError("");
        setShowPaymentModal(true);
    };

    const handleConfirmUpdatePayment = async () => {
        if (!currentPaymentOrder) return;

        const amount = payingAmount;
        const dueAmount = currentPaymentOrder.total - currentPaymentOrder.paid;

        if (isNaN(amount) || amount <= 0) {
            setPaymentError("Please enter a valid payment amount.");
            return;
        }
        if (amount > dueAmount + 0.01) {
            setPaymentError(`Payment cannot be more than the due amount of ₹${dueAmount.toLocaleString()}.`);
            return;
        }

        setIsUpdatingPayment(true);
        try {
            const payload = {
                invoiceId: currentPaymentOrder.id,
                amount: amount
            };

            await axios.post(`${apiUrl}/api/shop/payment/update`, payload, {
                withCredentials: true,
            });

            setPayments(prevPayments =>
                prevPayments.map(p => {
                    if (p.saleId === currentPaymentOrder.id) {
                        const newPaidAmount = p.paid + amount;
                        const newDueAmount = p.due - amount;
                        const newStatus = (newDueAmount < 0.01) ? 'Paid' : 'SemiPaid';
                        return {
                            ...p,
                            paid: newPaidAmount,
                            due: newDueAmount,
                            status: newStatus
                        };
                    }
                    return p;
                })
            );

            toast.success("Payment updated successfully!", "success");
            setShowPaymentModal(false);
            setCurrentPaymentOrder(null);
            fetchPayments();

        } catch (error) {
            console.error("Error updating payment:", error);
            showAlert("Failed to update payment. Please try again.");
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    const handleShowHistory = async (payment) => {
        setCurrentHistoryPayment(payment);
        setShowHistoryModal(true);
        setHistoryLoading(true);
        setHistoryData([]);

        try {
            const payload = {
                orderNumber: payment.saleId,
                PaymentReferenceNumber: payment.id
            };

            const response = await axios.post(
                `${apiUrl}/api/shop/payment/history`,
                payload,
                { withCredentials: true }
            );

            setHistoryData(response.data);

        } catch (error) {
            console.error("Error fetching payment history:", error);
            showAlert("Failed to fetch payment history. Please try again.");
            setShowHistoryModal(false);
        } finally {
            setHistoryLoading(false);
        }
    };

    const totalPaidFromHistory = useMemo(() => {
        if (!historyData || historyData.length === 0) {
            return 0;
        }
        return historyData.reduce((acc, item) => {
            return acc + (Number(item.amount) || 0);
        }, 0);
    }, [historyData]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        if (sortConfig.direction === 'ascending') {
            return ' ▲';
        }
        return ' ▼';
    };


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
            <h2>Payments</h2>
            <div
                className="page-header"
                style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
            </div>

            <div className="payments-stats">
                <div className="stats-card dates-card">
                    <div className="card-title">Filters</div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        flexWrap: 'wrap',
                        width: '100%'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                            From:
                            <input
                                className="date-input"
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                            To:
                            <input
                                className="date-input"
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                            Mode:
                            <select
                                className="date-input"
                                value={paymentMode}
                                onChange={(e) => setPaymentMode(e.target.value)}
                            >
                                <option value="All">All</option>
                                {uniqueModes.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                            Status:
                            <select
                                className="date-input"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="All">All</option>
                                <option value="Paid">Paid</option>
                                <option value="SemiPaid">SemiPaid</option>
                                <option value="UnPaid">UnPaid</option>
                            </select>
                        </label>
                        <button
                            onClick={fetchPayments}
                            disabled={isLoading}
                            title="Refresh Data"
                            style={{
                                padding: '8px',
                                height: '38px',
                                width: '38px',
                                cursor: 'pointer',
                                background: 'var(--primary-color-light)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isLoading ? 0.5 : 1,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <MdRefresh size={20} color="var(--primary-color)" />
                        </button>
                    </div>
                </div>

                <div className="stats-card total-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div>
                            <div className="card-title">Total Payments</div>
                            <div style={{
                                fontSize: "40.1px",
                                fontWeight: "bold",
                                color: 'var(--text-dark)'
                            }}>
                                ₹{totalAmount.toLocaleString()}
                            </div>
                            <div className="total-sub">Showing: {fromDate} — {toDate}</div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div className="card-title">Total Due</div>
                            <div style={{
                                fontSize: "40.1px",
                                fontWeight: "bold",
                                color: themeColors.due
                            }}>
                                ₹{totalDueAmount.toLocaleString()}
                            </div>
                            <div className="total-sub" style={{ marginTop: '5px' }}>
                                {dueCount} Invoice{dueCount !== 1 ? 's' : ''} with dues
                            </div>
                        </div>
                    </div>
                </div>

                <div className="stats-card bars-card">
                    <div className="card-title">Payment Modes</div>
                    <div className="payments-bars">
                        {Object.keys(modeCounts).length === 0 ? (
                            <div className="no-data">No payments in selected range</div>
                        ) : (
                            (() => {
                                const entries = Object.entries(modeCounts);
                                const max = Math.max(...entries.map(([, c]) => c), 1);
                                const colors = ["#4caf50", "#ffb300", "#2196f3", "#9c27b0", "#f44336", "#00bcd4"];
                                return entries.map(([method, count], idx) => (
                                    <div key={method} className="mode-row">
                                        <div className="mode-label">
                                            {methodIcons[method]}
                                            {method}
                                        </div>
                                        <div className="mode-bar-wrapper">
                                            <div className="mode-bar-inner" style={{ width: `${Math.max((count / max) * 100, 6)}%`, background: colors[idx % colors.length] }} />
                                        </div>
                                        <div className="mode-count">{count}</div>
                                    </div>
                                ));
                            })()
                        )}
                    </div>
                </div>
            </div>

            <input
                type="text"
                placeholder="Search by Invoice ID..."
                className="search-bar"
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
                style={{
                    width: '30%',
                    marginTop: '25px',
                    marginBottom: '-25px',
                }}
            />
            <div className="glass-card">
                <table className="data-table">
                    <thead>
                    <tr>
                        <th onClick={() => requestSort('id')} style={{cursor: 'pointer'}}>
                            Payment Ref. Number {getSortIndicator('id')}
                        </th>
                        <th onClick={() => requestSort('saleId')} style={{cursor: 'pointer'}}>
                            Invoice ID {getSortIndicator('saleId')}
                        </th>
                        <th onClick={() => requestSort('date')} style={{cursor: 'pointer'}}>
                            Date {getSortIndicator('date')}
                        </th>
                        <th onClick={() => requestSort('method')} style={{cursor: 'pointer'}}>
                            Method {getSortIndicator('method')}
                        </th>
                        <th onClick={() => requestSort('amount')} style={{cursor: 'pointer'}}>
                            Amount {getSortIndicator('amount')}
                        </th>
                        <th onClick={() => requestSort('paid')} style={{cursor: 'pointer'}}>
                            Paid {getSortIndicator('paid')}
                        </th>
                        <th onClick={() => requestSort('due')} style={{cursor: 'pointer'}}>
                            Due {getSortIndicator('due')}
                        </th>
                        <th onClick={() => requestSort('status')} style={{cursor: 'pointer'}}>
                            Status {getSortIndicator('status')}
                        </th>
                        <th>Update</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentPayments.length > 0 ? (
                        currentPayments.map((payment) => {
                            const isUpdateHovered = hoveredButton === `${payment.id}-update`;

                            return (
                                <tr
                                    key={payment.id}
                                    onClick={() => handleShowHistory(payment)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{payment.id}</td>
                                    <td onClick={(e) => {
                                        e.stopPropagation();
                                        handleTakeAction(payment.saleId);
                                    }}
                                        style={{cursor:"pointer", color:"darkgreen"}}>{payment.saleId}</td>
                                    <td>{formatDate(payment.date)}</td>
                                    <td>{payment.method}</td>
                                    <td>₹{payment.amount.toLocaleString()}</td>
                                    <td style={{ color: themeColors.paid, fontWeight: 'bold' }}>
                                        ₹{payment.paid.toLocaleString()}
                                    </td>
                                    <td style={{ color: themeColors.due, fontWeight: 'bold' }}>
                                        ₹{payment.due.toLocaleString()}
                                    </td>
                                    <td>
                                        <span
                                            className={payment.status === 'Paid' ? 'status-paid' : 'status-pending'}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                                {payment.status}
                                            </span>
                                    </td>

                                    <td>
                                        {(payment.status === 'SemiPaid' || payment.status === 'UnPaid') && (
                                            <button
                                                className="btn-update-payment"
                                                title="Update Payment"
                                                onMouseEnter={() => setHoveredButton(`${payment.id}-update`)}
                                                onMouseLeave={() => setHoveredButton(null)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenPaymentModal(payment);
                                                }}
                                                style={{
                                                    cursor: "pointer",
                                                    borderRadius: "6px",
                                                    padding: "6px 8px",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "5px",
                                                    background: "var(--primary-color-light)",
                                                    border: "1px solid var(--border-color)",

                                                    transform: isUpdateHovered ? 'scale(1.1)' : 'scale(1)',
                                                    opacity: isUpdateHovered ? 0.8 : 1,
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >

                                                <i className="fa-duotone fa-solid fa-credit-card"
                                                   style={{fontSize: '17px'}}></i>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="10" style={{ textAlign: "center" }}>
                                No records found
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* --- CHANGE 4: UPDATED PAGINATION FOOTER --- */}
            {sortedPayments.length > 0 && (
                <div className="pagination-footer">
                    {/* LEFT: Page Size Selector */}
                    <div className="page-size-container">
                        <span className="page-size-label">Rows per page:</span>
                        <div className="select-wrapper">
                            <select
                                value={itemsPerPage}
                                onChange={handlePageSizeChange}
                                className="custom-page-select"
                            >
                                {[10, 20, 30, 40, 50, 100].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* CENTER: Pagination Controls */}
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
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed', opacity: 0.7 }}>
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            readOnly
                                            disabled
                                            style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)' }}
                                        />
                                        Email (Mandatory)
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
                                    <MdSend size={18} /> Send Reminder
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
                            <div className="payment-summary-box" style={{ marginBottom: '20px', padding: '15px', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px' }}>
                                    <span>Total Amount:</span>
                                    <strong>₹{currentPaymentOrder.total.toLocaleString()}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px' }}>
                                    <span>Amount Paid:</span>
                                    <strong style={{ color: 'green' }}>₹{currentPaymentOrder.paid.toLocaleString()}</strong>
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold' }}>
                                    <span>Amount Due:</span>
                                    <strong style={{ color: '#d32f2f' }}>₹{(currentPaymentOrder.total - currentPaymentOrder.paid).toLocaleString()}</strong>
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
                                        border: `1px solid ${paymentError ? '#d32f2f' : 'var(--border-color)'}`,
                                        background: 'var(--input-bg)',

                                        color: 'var(--text-color)',
                                        fontSize: '1.2rem',
                                        textAlign: 'right'
                                    }}
                                />
                                {paymentError && (
                                    <span style={{
                                        color: '#d32f2f',
                                        fontSize: '0.9em',
                                        marginTop: '5px',
                                        display: 'block'
                                    }}>
                                        {paymentError}
                                    </span>
                                )}
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

            {showHistoryModal && currentHistoryPayment && (
                <div className="order-modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="order-modal-header">
                            <h2>
                                <MdHistory style={{ marginRight: '8px', verticalAlign: 'bottom' }} />
                                Payment History for #{currentHistoryPayment.saleId}
                            </h2>
                            <button className="close-button" onClick={() => setShowHistoryModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        <div className="order-modal-body" style={{ padding: '0 20px 10px 20px', minHeight: '150px' }}>
                            {historyLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', fontSize: '1.1em' }}>
                                    Loading history...
                                </div>
                            ) : historyData.length === 0 ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', fontSize: '1.1em', color: 'var(--text-secondary)' }}>
                                    No payment history found.
                                </div>
                            ) : (
                                <table className="data-table" style={{ width: '100%', marginTop: '15px' }}>
                                    <thead>
                                    <tr>
                                        <th>Token #</th>
                                        <th>Date</th>
                                        <th>Paid Amount</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {historyData.map((item, index) => (
                                        <tr key={item.tokenNumber || index}>
                                            <td>{item.tokenNumber}</td>
                                            <td>{formatDateTime(item.date)}</td>
                                            <td style={{ textAlign: 'right', paddingRight: '10px' }}>
                                                ₹{item.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="order-modal-footer" style={{ padding: '15px 20px', background: 'var(--glass-bg)', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 12px 12px' }}>
                            <div className="payment-summary-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px' }}>
                                    <span>Total Paid (from history):</span>
                                    <strong style={{ color: 'green' }}>
                                        ₹{totalPaidFromHistory.toLocaleString()}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px' }}>
                                    <span>Amount Due (current):</span>
                                    <strong style={{ color: '#d32f2f' }}>
                                        ₹{currentHistoryPayment.due.toLocaleString()}
                                    </strong>
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold' }}>
                                    <span>Total Invoice Amount:</span>
                                    <strong>
                                        ₹{currentHistoryPayment.amount.toLocaleString()}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PaymentsPage;