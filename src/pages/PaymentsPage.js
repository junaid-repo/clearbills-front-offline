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
    MdArrowUpward, // <-- ADDED
    MdArrowDownward // <-- ADDED
} from 'react-icons/md';

// --- NEW: formatDateTime Utility ---
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
    // initialize searchTerm and paymentMode from localStorage if present
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
    const [itemsPerPage] = useState(10); // show 5 records per page

    // --- ⭐️ NEW: State for sorting ---
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });


    const now = new Date();
    const { searchKey, setSearchKey } = useSearchKey();
    // Default to last 7 days (including today)
    const defaultTo = now; // today
    const defaultFrom = new Date();
    defaultFrom.setDate(now.getDate() - 6); // 6 days before today (inclusive makes 7 days total)

    // --- New: date range state (default to last 7 days) ---
    const formatDateInput = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    // --- NEW State for Hover Effects ---
    const [hoveredButton, setHoveredButton] = useState(null);

    // --- NEW State for Theme Colors ---
    const [themeColors, setThemeColors] = useState({
        paid: '#006400', // dark green
        due: '#8b0000'   // dark maroon
    });

    // --- NEW Effect to Get Theme from LocalStorage ---
    useEffect(() => {
        const currentTheme = localStorage.getItem("theme") || "light";

        if (currentTheme === "dark") {
            setThemeColors({
                paid: '#90ee90', // light green
                due: '#f08080'   // light maroon/coral
            });
        } else {
            setThemeColors({
                paid: '#006400', // dark green
                due: '#8b0000'   // dark maroon
            });
        }
    }, []); // Runs once on mount

    const domainToRoute = {
        products: 'products',
        sales: 'sales',
        customers: 'customers',
    };

    const config = useConfig();
    var apiUrl = "";
    if (config) {
        console.log(config.API_URL);
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

    // --- NEW State for Reminder Modal ---
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [currentReminderInvoiceId, setCurrentReminderInvoiceId] = useState(null);
    const [reminderMessage, setReminderMessage] = useState("");
    const [sendViaEmail, setSendViaEmail] = useState(true); // Default to email
    const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // <-- ADD THIS

    // --- NEW State for Payment Modal ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPaymentOrder, setCurrentPaymentOrder] = useState(null); // Will hold {id, total, paid}
    const [payingAmount, setPayingAmount] = useState(""); // Input is a string
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false); // For loading state
    const [paymentError, setPaymentError] = useState(""); // <-- NEW: For inline validation

    // --- ⭐️ NEW State for History Modal ---
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [currentHistoryPayment, setCurrentHistoryPayment] = useState(null); // The whole payment object
    const [historyData, setHistoryData] = useState([]); // Array for history results
    const [historyLoading, setHistoryLoading] = useState(false); // Loading spinner for modal

    // 🔹 whenever dates change, enforce max 30 days
    // 🔹 whenever dates change, enforce max 31 days
    useEffect(() => {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (to < from) {
            // auto-correct if user picks invalid range (from > to)
            // Set 'from' date to be the same as 'to' date
            setFromDate(toDate);
            return;
        }

        const diffDays = Math.floor((to - from) / (1000 * 60 * 60 * 24));

        // This is the new logic for Request 2
        if (diffDays > 31) {
            showAlert("Date range cannot exceed 31 days. Adjusting the start date.");
            const newFrom = new Date(to); // Start from the 'to' date
            newFrom.setDate(newFrom.getDate() - 31); // Go back 31 days
            setFromDate(formatDateInput(newFrom)); // Adjust the 'from' date
        }
    }, [fromDate, toDate, showAlert]); // Added showAlert to dependency array

    // save filters whenever they change so they persist across page switches
    useEffect(() => {
        try {
            const obj = { fromDate, toDate, paymentMode, searchTerm, status };
            localStorage.setItem("payments_filters", JSON.stringify(obj));
        } catch (e) {
            // ignore storage errors
        }
    }, [fromDate, toDate, paymentMode, searchTerm, status]);

    // compute unique payment modes from all payments (used to populate dropdown)
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
            console.log("API response:", data);
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





    // try to load saved filters from localStorage and use them as initial values

// This "map" links the method string to the icon's JSX
    const methodIcons = {
        'UPI': <i className="fa-solid fa-qrcode"></i>,
        'CARD': <i className="fa-duotone fa-solid fa-credit-card"></i>,
        'CASH': <i className="fa-duotone fa-solid fa-money-bills"></i>
    };


    // helper to normalize a date string from payment and the input date values
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

    // filter by search AND date range
    const filteredPayments = useMemo(() => {
        const from = toDateObjStart(fromDate);
        const to = toDateObjEnd(toDate);

        return payments.filter((p) => {
            // search filter
            const matchesSearch = p.saleId
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            // mode filter
            const matchesMode = paymentMode === "All" || !paymentMode ? true : (p.method === paymentMode);
            const matchesStatus = status === "All" || !status ? true : (p.status === status);
            // date parsing - guard against invalid dates
            const pDate = new Date(p.date);
            if (isNaN(pDate.getTime())) return matchesSearch; // if date invalid, don't filter by date

            const withinRange = pDate >= from && pDate <= to;

            return matchesSearch && withinRange && matchesMode && matchesStatus;
        });
    }, [payments, searchTerm, fromDate, toDate, paymentMode, status]);

    // --- ⭐️ NEW: Sorting Logic ---
    const sortedPayments = useMemo(() => {
        let sortableItems = [...filteredPayments];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                let comparison = 0;
                // Handle different types
                if (['amount', 'paid', 'due'].includes(sortConfig.key)) {
                    comparison = (Number(aValue) || 0) - (Number(bValue) || 0);
                } else if (sortConfig.key === 'date') {
                    comparison = new Date(aValue) - new Date(bValue);
                } else {
                    // Default to string comparison
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

    // compute totals and mode counts for the selected range
    // compute totals and mode counts for the selected range
    // --- UPDATED: Added totalDueAmount and dueCount ---
    const { totalAmount, totalDueAmount, dueCount, modeCounts } = useMemo(() => {
        const counts = {};
        let total = 0;
        let totalDue = 0;
        let countDue = 0;

        // --- ⭐️ MODIFIED: Use filteredPayments for totals, not sortedPayments ---
        // Totals should reflect the filtered date range, regardless of sort order
        filteredPayments.forEach((p) => {
            const amt = Number(p.amount) || 0;
            const dueAmt = Number(p.due) || 0; // Get the due amount

            total += amt;
            totalDue += dueAmt; // Add to total due

            if (dueAmt > 0) {
                countDue++; // Increment count if due > 0
            }

            const m = p.method || "Unknown";
            counts[m] = (counts[m] || 0) + 1;
        });

        return {
            totalAmount: total,
            totalDueAmount: totalDue, // <-- New value
            dueCount: countDue,       // <-- New value
            modeCounts: counts
        };
    }, [filteredPayments]); // <-- Base totals on filteredPayments

    // --- ⭐️ MODIFIED: Pagination calculations use sortedPayments ---
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentPayments = sortedPayments.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);

    // --- ⭐️ MODIFIED: reset page when filters OR sort change ---
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, fromDate, toDate, paymentMode, status, sortConfig]);


    // --- NEW: Handlers for Reminder Modal ---
    const handleOpenReminderModal = (saleId) => {
        setCurrentReminderInvoiceId(saleId);
        setReminderMessage(""); // Clear previous message
        setSendViaEmail(true); // Reset to default
        setSendViaWhatsapp(false); // Reset to default
        setShowReminderModal(true);
    };

    const handleConfirmSendReminder = async () => {
        if (!currentReminderInvoiceId) return;

        try {
            const payload = {
                message: reminderMessage, // The optional message from the textbox
                sendViaEmail: sendViaEmail,
                sendViaWhatsapp: sendViaWhatsapp,
                orderId: currentReminderInvoiceId
            };

            await axios.post(
                `${apiUrl}/api/shop/payment/send-reminder`,
                payload,
                { withCredentials: true }
            );

            // On success, update the local state to reflect the new count
            setPayments(currentPayments =>
                currentPayments.map(p =>
                    p.saleId === currentReminderInvoiceId
                        ? { ...p, reminderCount: (p.reminderCount || 0) + 1 }
                        : p
                )
            );

            toast.success('Reminder sent successfully!', 'success');
            setShowReminderModal(false); // Close modal on success
            setReminderMessage(""); // Clear message
            setCurrentReminderInvoiceId(null); // Clear invoice ID

        } catch (error) {
            console.error("Error sending reminder:", error);
            showAlert("Failed to send the reminder. Please try again.");
        }
    };

    // --- NEW: Handlers for Payment Modal ---
    const handleOpenPaymentModal = (payment) => {
        // Calculate total from paid + due
        const totalAmount = payment.paid + payment.due;
        setCurrentPaymentOrder({
            id: payment.saleId,
            total: totalAmount,
            paid: payment.paid
        });
        setPayingAmount(""); // Clear old amount
        setPaymentError("");
        setShowPaymentModal(true);
    };

    const handleConfirmUpdatePayment = async () => {
        if (!currentPaymentOrder) return;

        const amount = payingAmount;
        const dueAmount = currentPaymentOrder.total - currentPaymentOrder.paid;

        // --- Validation ---
        if (isNaN(amount) || amount <= 0) {
            setPaymentError("Please enter a valid payment amount.");
            return;// <-- MODIFIED            return;
        }
        // Use a small tolerance (e.g., 0.01) for float comparison
        if (amount > dueAmount + 0.01) {
            setPaymentError(`Payment cannot be more than the due amount of ₹${dueAmount.toLocaleString()}.`); // <-- MODIFIED            return;
            return;
        }

        setIsUpdatingPayment(true);
        try {
            const payload = {
                invoiceId: currentPaymentOrder.id,
                amount: amount
            };

            // Assuming a new endpoint /api/shop/payment/update
            await axios.post(`${apiUrl}/api/shop/payment/update`, payload, {
                withCredentials: true,
            });

            // Update local state on success
            setPayments(prevPayments =>
                prevPayments.map(p => {
                    if (p.saleId === currentPaymentOrder.id) {
                        const newPaidAmount = p.paid + amount;
                        const newDueAmount = p.due - amount;
                        // Check if new paid amount is >= total (with tolerance)
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

    // --- ⭐️ NEW: Handler for History Modal ---
    const handleShowHistory = async (payment) => {
        // Set current payment and open modal
        setCurrentHistoryPayment(payment);
        setShowHistoryModal(true);
        setHistoryLoading(true);
        setHistoryData([]); // Clear previous data

        try {
            const payload = {
                orderNumber: payment.saleId,
                PaymentReferenceNumber: payment.id
            };

            // Make the API call
            const response = await axios.post(
                `${apiUrl}/api/shop/payment/history`, // <-- Make sure this endpoint is correct
                payload,
                { withCredentials: true }
            );

            // Assuming the response.data is an array [ {token number, date, amount}, ... ]
            // Make sure keys match your API response
            setHistoryData(response.data);

        } catch (error) {
            console.error("Error fetching payment history:", error);
            showAlert("Failed to fetch payment history. Please try again.");
            setShowHistoryModal(false); // Close modal on error
        } finally {
            setHistoryLoading(false);
        }
    };

    // --- ⭐️ NEW: Calculate Total Paid from History ---
    const totalPaidFromHistory = useMemo(() => {
        if (!historyData || historyData.length === 0) {
            return 0;
        }
        return historyData.reduce((acc, item) => {
            // Ensure 'amount' key matches your API response
            return acc + (Number(item.amount) || 0);
        }, 0);
    }, [historyData]);

    // --- ⭐️ NEW: Sort Handler ---
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // --- ⭐️ NEW: Sort Indicator Helper ---
    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        if (sortConfig.direction === 'ascending') {
            // Using inline style for simplicity, you can use a class
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
                {/* Removed inline stacked date inputs from here - moved into unified stats container below */}
            </div>

            {/* Stats container: single div holding dates (stacked), total box, and payment-mode bars (horizontal) */}
            <div className="payments-stats">
                {/* Dates card */}
                {/* Dates card */}
                <div className="stats-card dates-card">
                    <div className="card-title">Filters</div>
                    {/* --- NEW: Horizontal Filter Layout --- */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        flexWrap: 'wrap', // Allows wrapping on small screens
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
                                height: '38px', // Added height to match inputs
                                width: '38px',  // Added width for a square button
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

                {/* Total card */}
                {/* Total card --- UPDATED STRUCTURE --- */}
                <div className="stats-card total-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        {/* Left Side: Total Payments */}
                        <div>
                            <div className="card-title">Total Payments</div>
                            <div style={{
                                fontSize: "40.1px",
                                fontWeight: "bold",
                                color: 'var(--text-dark)' // Ensure default color
                            }}>
                                ₹{totalAmount.toLocaleString()}
                            </div>
                            <div className="total-sub">Showing: {fromDate} — {toDate}</div>
                        </div>

                        {/* Right Side: Total Due */}
                        <div style={{ textAlign: 'right' }}>
                            <div className="card-title">Total Due</div>
                            <div style={{
                                fontSize: "40.1px",
                                fontWeight: "bold",
                                color: themeColors.due // <-- THEME COLOR APPLIED
                            }}>
                                ₹{totalDueAmount.toLocaleString()}
                            </div>
                            <div className="total-sub" style={{ marginTop: '5px' }}>
                                {dueCount} Invoice{dueCount !== 1 ? 's' : ''} with dues
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bars card */}
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
                                            {methodIcons[method]}  {/* <-- This gets the icon */}
                                            {method}               {/* This adds the text (e.g., "UPI") */}
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
                    setCurrentPage(1); // reset to page 1 after search
                }}
                style={{
                    width: '30%',
                    marginTop: '25px',
                    marginBottom: '-25px',
                }}
            />
            <div className="glass-card">
                <table className="data-table">
                    {/* --- ⭐️ MODIFIED: Added onClick handlers and indicators --- */}
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
                        <th>Update</th> {/* This column is not sortable */}
                    </tr>
                    </thead>
                    <tbody>
                    {/* currentPayments is now sorted and paginated */}
                    {currentPayments.length > 0 ? (
                        currentPayments.map((payment) => {
                            // --- NEW: Hover logic for this row ---
                            const isRemindHovered = hoveredButton === `${payment.id}-remind`;
                            const isUpdateHovered = hoveredButton === `${payment.id}-update`;

                            return (
                                // --- ⭐️ MODIFIED: Added onClick and cursor style ---
                                <tr
                                    key={payment.id}
                                    onClick={() => handleShowHistory(payment)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{payment.id}</td>
                                    <td onClick={(e) => {
                                        e.stopPropagation(); // <-- Stop propagation so row click doesn't fire
                                        handleTakeAction(payment.saleId);
                                    }}
                                        style={{cursor:"pointer", color:"darkgreen"}}>{payment.saleId}</td>
                                    <td>{formatDate(payment.date)}</td>
                                    <td>{payment.method}</td>
                                    <td>₹{payment.amount.toLocaleString()}</td>
                                    {/* --- MODIFIED: Added theme color --- */}
                                    <td style={{ color: themeColors.paid, fontWeight: 'bold' }}>
                                        ₹{payment.paid.toLocaleString()}
                                    </td>
                                    {/* --- MODIFIED: Added theme color --- */}
                                    <td style={{ color: themeColors.due, fontWeight: 'bold' }}>
                                        ₹{payment.due.toLocaleString()}
                                    </td>
                                    <td> {/* Status is not a button, so stop propagation here */}
                                        <span
                                            className={payment.status === 'Paid' ? 'status-paid' : 'status-pending'}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                                {payment.status}
                                            </span>
                                    </td>

                                    {/* --- UPDATE PAYMENT BUTTON (Hover effect added) --- */}
                                    <td>
                                        {(payment.status === 'SemiPaid' || payment.status === 'UnPaid') && (
                                            <button
                                                className="btn-update-payment"
                                                title="Update Payment"
                                                onMouseEnter={() => setHoveredButton(`${payment.id}-update`)}
                                                onMouseLeave={() => setHoveredButton(null)}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // <-- Stop propagation
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

                                                    // --- NEW: Hover Styles ---
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
                            <td colSpan="10" style={{ textAlign: "center" }}> {/* <-- Updated colSpan to 10 */}
                                No records found
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination button">
                <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Prev
                </button>

                {[...Array(totalPages)].map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentPage(index + 1)}
                        className={currentPage === index + 1 ? "active" : ""}
                    >
                        {index + 1}
                    </button>
                ))}

                <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Next
                </button>
            </div>


            {/* --- NEW REMINDER MODAL --- */}
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
                                            checked={true} // Always checked
                                            readOnly       // Make read-only
                                            disabled       // Make disabled
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

            {/* --- NEW PAYMENT UPDATE MODAL --- */}
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
                            {/* Payment Summary Details */}
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

                            {/* Payment Input */}
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

                            {/* Action Buttons */}
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

            {/* --- ⭐️ NEW: PAYMENT HISTORY MODAL --- */}
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
                                        {/* Ensure 'tokenNumber' key matches your API response */}
                                        <th>Token #</th>
                                        {/* Ensure 'date' key matches your API response */}
                                        <th>Date</th>
                                        {/* Ensure 'amount' key matches your API response */}
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

                        {/* --- History Modal Footer --- */}
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