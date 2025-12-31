// src/pages/DashboardPage.js
import React, { useState, useEffect, useRef } from 'react';
import {FaRupeeSign, FaBoxes, FaBan, FaChartLine, FaShoppingBasket} from 'react-icons/fa';
import Modal from '../components/Modal';
import './DashboardPage.css';
import { useNavigate } from 'react-router-dom';
import { useConfig } from "./ConfigProvider";
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useNumberFormat } from "../context/NumberFormatContext";
import { useAlert } from '../context/AlertContext';
import PremiumFeature from '../components/PremiumFeature';
import toast, {Toaster} from 'react-hot-toast';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement // for doughnut
} from 'chart.js';
import {useSearchKey} from "../context/SearchKeyContext";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

// Mock Data for the new weekly sales graph
const mockWeeklySales = [
    { day: 'Mon', totalSales: 12500, unitsSold: 45 },
    { day: 'Tue', totalSales: 18000, unitsSold: 60 },
    { day: 'Wed', totalSales: 15500, unitsSold: 52 },
    { day: 'Thu', totalSales: 21000, unitsSold: 75 },
    { day: 'Fri', totalSales: 25000, unitsSold: 88 },
    { day: 'Sat', totalSales: 32000, unitsSold: 110 },
    { day: 'Sun', totalSales: 28500, unitsSold: 95 },
];
const mockGoalData = {
    actualSales: 861800,
    estimatedSales: 1200000,
    actualProfit: 155124,
    estimatedProfit: 250000,
};

// ✨ NEW MOCK DATA FOR RIGHT-SIDE TABLES
const mockRecentOrders = [
    { orderId: 'ORD-1001', customer: 'Amit Sharma', total: 12500, status: 'Completed' },
    { orderId: 'ORD-1002', customer: 'Neha Verma', total: 7800, status: 'Pending' },
    { orderId: 'ORD-1003', customer: 'Ravi Kumar', total: 22000, status: 'Completed' },
    { orderId: 'ORD-1003', customer: 'Ravi Kumar', total: 22000, status: 'Completed' },
];

// Mock payments breakdown (fallback)
const mockPaymentBreakdown = {
    cash: 0,
    card: 0,
    upi: 0
};

const DashboardPage = ({ setSelectedPage }) => {
    const { showAlert } = useAlert();
    const [dashboardData, setDashboardData] = useState({});
    const [sales, setSales] = useState([]);

    const [isNewCusModalOpen, setIsNewCusModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [stock, setStock] = useState("");
    const [tax, setTax] = useState("");
    const [isAddProdModalOpen, setIsAddProdModalOpen] = useState(false);

    const [weeklySalesData, setWeeklySalesData] = useState([]); // State for graph data
    const [goalData, setGoalData] = useState(mockGoalData);
    const [graphView, setGraphView] = useState('all');
    const [isAdjusting, setIsAdjusting] = useState(false);

    // ✨ START: NEW STATE FOR TOP PRODUCTS
    const [productFactor, setProductFactor] = useState('mostSelling'); // 'mostSelling' or 'topGrossing'
    const [topProducts, setTopProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    // ✨ END: NEW STATE

    // ✨ NEW API / STATE FOR PAYMENT BREAKDOWN (pie chart)
    const [paymentBreakdown, setPaymentBreakdown] = useState(null);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);

    // ✨ NEW STATE FOR RIGHT-SIDE TABLES
    const [recentOrders, setRecentOrders] = useState([]);
    const [topCustomers, setTopCustomers] = useState([]); // removed usage - kept empty
    const [isLoadingRecentOrders, setIsLoadingRecentOrders] = useState(false);
    const [isLoadingTopCustomers, setIsLoadingTopCustomers] = useState(false);
    const [notification, setNotification] = useState(null);

    const config = useConfig();
    const navigate = useNavigate();
    const format = useNumberFormat();
    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    // Refs for responsive chart updates
    const lineChartRef = useRef(null);
    const barChartRef = useRef(null);
    const donutChartRef = useRef(null);



    const [timeRange, setTimeRange] = useState(
        () => localStorage.getItem('selectedTimeRange') || 'lastMonth'
    );

    /**
     * 📌 Fetches weekly sales data for the line graph.
     */
    const fetchWeeklySales = async () => {
        try {
            if (!apiUrl) throw new Error('No API URL');
            const response = await fetch(`${apiUrl}/api/shop/get/analytics/weekly-sales/${timeRange}`, {
                method: "GET",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("Weekly Sales Data:", data);
            setWeeklySalesData(Array.isArray(data) ? data : mockWeeklySales);
        } catch (error) {
            console.warn("Error fetching weekly sales data:", error);
            setWeeklySalesData(mockWeeklySales); // Fallback to mock data on error
        }
    };

    // Fetch Graph Data on component mount / timeRange change
    useEffect(() => {
        fetchWeeklySales();
    }, [timeRange, apiUrl]);

    // Payment breakdown fetch (POST with timeRange payload). Uses mock fallback.
    const fetchPaymentBreakdown = async () => {setIsLoadingPayments(true);
        try {
            if (!apiUrl) throw new Error('No API URL');


            // ✅ Use GET request with path param instead of POST body
            const res = await fetch(`${apiUrl}/api/shop/get/payments/breakdown/${timeRange}`, {
                method: "GET",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) throw new Error('Failed to fetch payments breakdown');

            const data = await res.json();

            // ✅ Handle response that comes as a map, e.g. { cash: 40, card: 35, upi: 25 }
            setPaymentBreakdown({
                cash: data.cash ?? mockPaymentBreakdown.cash,
                card: data.card ?? mockPaymentBreakdown.card,
                upi: data.upi ?? mockPaymentBreakdown.upi,
            });
        } catch (err) {
            console.warn("Using mock payment breakdown due to fetch error", err);
            setPaymentBreakdown(mockPaymentBreakdown);
        } finally {
            setIsLoadingPayments(false);
        }
    };

    useEffect(() => {
        // Fetch payments breakdown each time timeRange or apiUrl changes
        fetchPaymentBreakdown();
    }, [timeRange, apiUrl]);

    useEffect(() => {
        localStorage.setItem('selectedTimeRange', timeRange);
    }, [timeRange]);

    // Helper function to format large numbers
    const formatLargeNumber = (value) => {
        if (value >= 10000000) { // 10 million or more
            return `${(value / 10000000).toFixed(1)}Cr`;
        } else if (value >= 100000) { // 1 lakh or more
            return `${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return value?.toString?.() ?? '';
    };

    // Chart.js Configuration
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: { color: document.body.classList.contains('dark-theme') ? '#c9d1d9' : '#333' }
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Revenue (₹)', color: '#8884d8' },
                ticks: {
                    color: '#9ca3af',
                    callback: function(value) {
                        return '₹' + formatLargeNumber(value);
                    }
                },
                grid: { color: 'rgba(156, 163, 175, 0.1)' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Units Sold', color: '#82ca9d' },
                ticks: { color: '#9ca3af' },
                grid: { drawOnChartArea: false },
            },
            x: {
                ticks: { color: '#9ca3af' },
                grid: { color: 'rgba(156, 163, 175, 0.1)' }
            }
        },
    };

    // ✅ 3. UPDATE CHART DATA FOR AREA GRAPH (guard maps against undefined)
    const chartData = {
        labels: (weeklySalesData || []).map(d => d.day),
        datasets: [
            {
                fill: true,
                label: 'Total Sales',
                data: (weeklySalesData || []).map(d => d.totalSales),
                borderColor: '#00b0ff',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    if (!ctx) return 'rgba(0, 176, 255, 0.1)';
                    const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                    gradient.addColorStop(0, 'rgba(0, 176, 255, 0.4)');
                    gradient.addColorStop(0.6, 'rgba(0, 176, 255, 0.05)');
                    gradient.addColorStop(1, 'rgba(0, 176, 255, 0)');
                    return gradient;
                },
                yAxisID: 'y',
                tension: 0.4,
                pointBackgroundColor: '#00b0ff',
                pointRadius: 2,
            },
            {
                fill: true,
                label: 'Units Sold',
                data: (weeklySalesData || []).map(d => d.unitsSold),
                borderColor: '#00bfa5',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    if (!ctx) return 'rgba(0, 191, 165, 0.1)';
                    const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                    gradient.addColorStop(0, 'rgba(0, 191, 165, 0.4)');
                    gradient.addColorStop(0.6, 'rgba(0, 191, 165, 0.05)');
                    gradient.addColorStop(1, 'rgba(0, 191, 165, 0)');
                    return gradient;
                },
                yAxisID: 'y1',
                tension: 0.4,
                pointBackgroundColor: '#00bfa5',
                pointRadius: 2,
            },
        ],
    };

    // --- Chart Configurations --- (The rest of the file is unchanged)
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
            y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Revenue (₹)' } },
            y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Units Sold' }, grid: { drawOnChartArea: false } },
        },
    };

    const percentageLabelPlugin = {
        id: 'percentageLabel',
        afterDatasetsDraw(chart, args, options) {
            const { ctx, chartArea: { right }, scales: { y } } = chart;
            ctx.save();
            const datasetMeta = chart.getDatasetMeta(1); // 'Actual' dataset
            datasetMeta.data.forEach((datapoint, index) => {
                const { actual, estimated } = options.sourceData[index];
                const percentage = estimated > 0 ? ((actual / estimated) * 100).toFixed(0) : 0;
                const xPosition = datapoint.x + 5;
                if (xPosition + 40 > right) return; // Don't draw if too close to edge
                ctx.font = 'bold 12px sans-serif';
                ctx.fillStyle = document.body.classList.contains('dark-theme') ? '#c9d1d9' : '#333';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${percentage}%`, xPosition, datapoint.y);
            });
        }
    };

    const createBarChartConfig = (label, actual, estimated) => {
        const color = label.includes('Sales') ? 'rgba(0,170,255,0.49)' : '#2ecc71';
        const fadedColor = label.includes('Sales') ? 'rgb(0,170,255)' : 'rgba(46, 204, 113, 0.2)';
        return {
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ₹${context.parsed.x.toLocaleString('en-IN')}`
                        }
                    },
                    percentageLabel: { sourceData: [{ actual, estimated }] }
                },
                scales: {
                    x: { display: false, grid: { display: false }, max: estimated * 1.15 },
                    y: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
                },
            },
            data: {
                labels: [label],
                datasets: [
                    {
                        label: `Estimated`,
                        data: [estimated],
                        backgroundColor: fadedColor,
                        barThickness: 25,
                        borderRadius: 28,
                        order: 1, // draw first
                    },
                    {
                        label: `Actual`,
                        data: [actual],
                        backgroundColor: color,
                        barThickness: 25,
                        borderRadius: 38,
                        order: 2, // draw second
                    },
                ],
            },
            plugins: [percentageLabelPlugin]
        };
    };

    const salesChart = createBarChartConfig('Sales', goalData.actualSales, goalData.estimatedSales);
    const profitChart = createBarChartConfig('Profit', goalData.actualProfit, goalData.estimatedProfit);

    // Fetch Dashboard Details
    useEffect(() => {
        if (!apiUrl) return;
        fetch(`${apiUrl}/api/shop/get/dashboardDetails/${timeRange}`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => setDashboardData(data))
            .catch((err) => {
                console.error("Error fetching dashboardData:", err);
                // keep dashboardData as-is (empty) if fetch fails
            });
    }, [timeRange, apiUrl]);

    // Fetch Sales
    useEffect(() => {
        if (!apiUrl) return;
        fetch(`${apiUrl}/api/shop/get/top/sales/${timeRange}`, {
            method: "GET",
            credentials: 'include',
            params: {
                count: 3
            },
            headers: {
                "Content-Type": "application/json"
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => setSales(Array.isArray(data) ? data : []))
            .catch((err) => {
                console.error("Error fetching sales:", err);
            });
    }, [timeRange, apiUrl]);

    const recentSales = (sales || []).slice(0, 3);

    useEffect(() => {
        const fetchGoalData = async () => {
            try {
                if (!apiUrl) throw new Error('No API URL');
                const response = await fetch(`${apiUrl}/api/shop/get/dashboard/goals/${timeRange}`, {
                    method: "GET",
                    credentials: 'include',
                    headers: {"Content-Type": "application/json"},
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setGoalData(data);
            } catch (error) {
                console.warn("Error fetching goal data:", error);
            }
        };
        if (apiUrl) fetchGoalData();
    }, [timeRange, apiUrl]);

    // --- Sanity Check API Call on Page Load ---
    useEffect(() => {
        if (!apiUrl) return;

        const runSanityCheck = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/shop/gstBilling/sanityCheck`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!response.ok) return;

                const data = await response.json();

                if (data && data.success === false) {
                    // --- This is the new part ---

                    // 1. Define the click handler function
                    const handleLinkClick = (e) => {
                        e.preventDefault(); // Prevent the <a> tag from jumping to '#'
                        setSelectedPage('profile');

                        // Optional: If your notification system has a close function,
                        // you might want to call it here so it disappears on click.
                        // e.g., setNotification(null);
                    };

                    // 2. Create the message with the link included
                    const messageWithLink = (
                        <span>
                        {data.message}{' '}
                            <a
                                href="#"
                                onClick={handleLinkClick}
                                // Adding some inline style to make it look like a link
                                style={{
                                    color: '#007bff', // Or your app's link color
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    marginLeft: '5px'
                                }}
                            >
                            Complete Profile
                        </a>
                    </span>
                    );

                    // 3. Pass the JSX element as the message
                    setNotification({ type: data.type, message: messageWithLink });
                }
            } catch (error) {
                console.error("Sanity check API failed:", error);
            }
        };

        runSanityCheck();
    }, [apiUrl, setSelectedPage]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null); // Hide notification after 5 seconds
            }, 5000);

            // Cleanup the timer if the component unmounts
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Add Customer
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, email, phone };
            const response = await fetch(`${apiUrl}/api/shop/create/customer`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            showAlert("Customer added successfully!");
        } catch (error) {
            console.error("Error adding customer:", error);
            showAlert("Something went wrong while adding the customer.");
        }
        setIsNewCusModalOpen(false);
        setName("");
        setEmail("");
        setPhone("");
    };

    // Add Product
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, category, price, costPrice, stock, tax };
            const response = await fetch(`${apiUrl}/api/shop/create/product`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log("API response:", data);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            showAlert("New product added!");
            setIsAddProdModalOpen(false);
        } catch (error) {
            console.error("Error adding product:", error);
            showAlert("Something went wrong while adding the product.");
        }
    };

    // Fetch Top Products
    useEffect(() => {
        const fetchTopProducts = async () => {
            setIsLoadingProducts(true);
            const params = new URLSearchParams({
                count: 3,
                timeRange: timeRange,
                factor: productFactor,
            });

            try {
                if (!apiUrl) throw new Error('No API URL');
                const response = await fetch(`${apiUrl}/api/shop/get/top/products?${params.toString()}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!response.ok) throw new Error('Failed to fetch top products');
                const data = await response.json();
                console.log("The top products are --> ", data);
                setTopProducts(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching top products:", error);
                setTopProducts([]); // safe fallback
            } finally {
                setIsLoadingProducts(false);
            }
        };

        if (apiUrl) {
            fetchTopProducts();
        }
    }, [timeRange, productFactor, apiUrl]);

    // --- NEW: Fetch Recent Orders (moved near Sales Performance)
    useEffect(() => {
        const fetchRecentOrders = async () => {
            setIsLoadingRecentOrders(true);
            try {
                if (!apiUrl) throw new Error('No API URL');
                const params = new URLSearchParams({ count: 4, timeRange });
                const res = await fetch(`${apiUrl}/api/shop/get/top/orders?${params.toString()}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error('Failed to fetch recent orders');
                const data = await res.json();
                console.log("the top order fetched are ", data);
                setRecentOrders(Array.isArray(data) ? data : mockRecentOrders);
            } catch (err) {
                console.warn('Using mock recent orders due to fetch error', err);
                setRecentOrders(mockRecentOrders);
            } finally {
                setIsLoadingRecentOrders(false);
            }
        };

        if (apiUrl) {
            fetchRecentOrders();
        } else {
            // use mock if no apiUrl for local dev
            setRecentOrders(mockRecentOrders);
            setIsLoadingRecentOrders(false);
        }
    }, [timeRange, apiUrl]);

    // --- RESPONSIVENESS: update charts when window size or layout changes (sidebar toggles)
    useEffect(() => {
        const resizeHandler = () => {
            try {
                lineChartRef.current?.chartInstance?.resize?.();
            } catch (e) { /* ignore */ }
            try {
                barChartRef.current?.chartInstance?.resize?.();
            } catch (e) { /* ignore */ }
            try {
                donutChartRef.current?.chartInstance?.resize?.();
            } catch (e) { /* ignore */ }
            // For react-chartjs-2 v4+, you can call .resize() on the chart's canvas chart instance.
            if (lineChartRef.current?.resize) lineChartRef.current.resize();
            if (barChartRef.current?.resize) barChartRef.current.resize();
            if (donutChartRef.current?.resize) donutChartRef.current.resize();
        };

        window.addEventListener('resize', resizeHandler);

        // Additionally observe body attribute/class changes (common for toggling sidebar)
        const observer = new MutationObserver(() => {
            resizeHandler();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });

        return () => {
            window.removeEventListener('resize', resizeHandler);
            observer.disconnect();
        };
    }, []);

    // Payment Doughnut Data & Options (hollow + gradient-ish via background alpha variations)
    const paymentLabels = ['Cash', 'Card', 'UPI'];
    const paymentValues = paymentBreakdown ? [
        paymentBreakdown.cash ?? 0,
        paymentBreakdown.card ?? 0,
        paymentBreakdown.upi ?? 0
    ] : [0,0,0];

    const totalPayments = paymentValues.reduce((s, v) => s + (Number(v) || 0), 0) || 1;

    const donutData = {
        labels: paymentLabels,
        datasets: [{
            label: 'Payments',
            data: paymentValues,
            // use rgba alpha variations to mimic gradient (Chart.js doesn't natively do radial gradients per slice easily)
            backgroundColor: [
                'rgb(0,170,255)',
                'rgba(0,170,255,0.49)',
                'rgba(0,170,255,0.19)'
            ],
            hoverOffset: 6,
            borderWidth: 0,
        }]
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%', // hollow
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: document.body.classList.contains('dark-theme') ? '#c9d1d9' : '#333' }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const v = context.parsed ?? 0;
                        const pct = ((v / totalPayments) * 100).toFixed(0);
                        return `${context.label}: ${v} (${pct}%)`;
                    }
                }
            }
        }
    };
    const domainToRoute = {
        products: 'products',
        sales: 'sales',
        customers: 'customers',
    };
    const { searchKey, setSearchKey } = useSearchKey();
    const handleTakeActionSales = (orderNumber) => {
        const route = domainToRoute['sales'];
        if (!route) return;
        setSearchKey(orderNumber);
        if (setSelectedPage) {
            setSelectedPage(route);
        }
    };
    const handleTakeActionProducts = (productName) => {
        const route = domainToRoute['products'];
        if (!route) return;
        setSearchKey(productName);
        if (setSelectedPage) {
            setSelectedPage(route);
        }
    };

    return (
        <div className="dashboard">


            {notification && (
                <div style={{
                    padding: '1rem',

                    textAlign: 'center',
                    fontWeight: 500,
                    position: 'sticky',
                    top: 0,
                    width: '70%',
                    zIndex: 1050,
                    borderRadius: '25px',
                    // Background color changes based on notification type
                    backgroundColor: notification.type === 'error' ? '#d9534f' : '#f0ad4e',
                    color: 'white'
                }}>
                    <strong>{notification.type.toUpperCase()}: </strong>
                    {notification.message}
                </div>
            )}

            <h2 style={{marginBottom: "1.0rem"}}>Dashboard</h2>

            {/* Time Range Selector */}
            <div className="time-range-selector glass-card" style={{ boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.06)", borderRadius: "20px", border: "2px solid var(--primary-color-light)"} }>
                <label htmlFor="timeRange"><i class="fa-duotone fa-solid fa-calendar-range" style={{fontSize:'20px', marginRight:'0px'}}></i> </label>
            <select
                    id="timeRange"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="dropdown"
                >
                    <option value="today">Today</option>
                    <option value="lastWeek">This Week</option>
                    <option value="lastMonth">This Month</option>
                    <option value="lastYear">This Year</option>
                </select>

            </div>

            <div className="stats-grid">
                <div className="stat-card glass-card" onClick={() => { if (setSelectedPage) setSelectedPage('payments'); else navigate('/payments');}} >
                    <i className="fa-duotone fa-solid fa-money-bill-trend-up icon revenue"></i>
                    <div>
                        <p>Total Revenue</p>
                        <h3>₹{dashboardData.monthlyRevenue?.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card" onClick={() => {
                    if (setSelectedPage) setSelectedPage('sales'); else navigate('/sales');
                }}>
                    <i className="fa-duotone fa-solid fa-cart-xmark icon sales"></i>
                    <div>
                        <p>Number of Sales</p>
                        <h3>{dashboardData.countOfSales}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card" onClick={() => {
                    if (setSelectedPage) setSelectedPage('sales'); else navigate('/sales');
                }}>

                    <i className="fa-duotone fa-solid fa-boxes-stacked icon units"></i>
                    <div>
                        <p>Total Units Sold</p>
                        <h3>{dashboardData.totalUnitsSold}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card" onClick={() => {
                    if (setSelectedPage) setSelectedPage('sales'); else navigate('/sales');
                }}>

                    <i className="fa-duotone fa-solid fa-indian-rupee-sign icon tax"></i>
                    <div>
                        <p>Tax Collected</p>
                        <h3>₹{dashboardData.taxCollected?.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card" onClick={() => {
                    if (setSelectedPage) setSelectedPage('products'); else navigate('/products');
                }}>

                    <i className="fa-duotone fa-solid fa-ban icon stock"></i>
                    <div>
                        <p>Out of Stock Products</p>
                        <h3>{dashboardData.outOfStockCount}</h3>
                    </div>
                </div>

            </div>

            {/* Two-column layout starting from quick-shortcuts level.
                Now: goals | quick-shortcuts + payment donut (side-by-side)
            */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px",
                    gap: "1.5rem",
                    alignItems: "start",
                    marginTop: "1rem",
                }}
            >
                <div>
                    {/* === Row 1: Goals | Quick Shortcuts | Payment Type === */}
                    <div
                        className="dashboard-row"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "40% 40% 25%",
                            gap: "1.5rem",
                            alignItems: "stretch",
                        }}
                    >
                        {/* GOALS */}
                        <div className="goal-tracking glass-card">
                            <div
                                className="card-header"
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                                     <h3
                                    style={{margin: 0}}>Target</h3>
                                    {goalData.fromDate && goalData.toDate && (
                                        <span style={{fontSize: "0.8rem", color: "#888"}}>
                ({goalData.fromDate} - {goalData.toDate})
              </span>
                                    )}
                                </div>
                                <div style={{display: "flex", gap: "10px", alignItems: "center" }}>
                                    <button
                                        className="btn small-btn"
                                        onClick={async () => {
                                            if (isAdjusting) {
                                                try {
                                                    await fetch(`${apiUrl}/api/shop/update/goals`, {
                                                        method: "POST",
                                                        credentials: "include",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify(goalData),
                                                    });
                                                } catch (e) {
                                                    console.warn("Failed to update goals", e);
                                                }
                                            }
                                            setIsAdjusting(!isAdjusting);
                                        }}
                                    >
                                        {isAdjusting ? "Done" : "Adjust"}
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: "80px", margin: 0, padding: 0 }}>
                                <Bar
                                    ref={barChartRef}
                                    options={salesChart.options}
                                    data={salesChart.data}
                                    plugins={salesChart.plugins}
                                />
                            </div>
                        </div>

                        {/* QUICK SHORTCUTS */}
                        <div className="quick-shortcuts glass-card">
                            <h3 className="card-header">Quick Shortcuts</h3>
                            <div className="shortcuts-container">
                                <button className="btn" onClick={() => { if (setSelectedPage) setSelectedPage('billing2'); else navigate('/billing2'); }}><i class="fa-duotone fa-solid fa-cart-plus" style={{paddingRight:'7px'}}></i>New Sale</button>
                                <button className="btn" onClick={() => { if (setSelectedPage) setSelectedPage('reports'); else navigate('/reports'); }}><i class="fa-duotone fa-solid fa-file-spreadsheet" style={{paddingRight:'7px'}}></i>Reports</button>
                                <button className="btn" onClick={() => { if (setSelectedPage) setSelectedPage('profile'); else navigate('/profile'); }}><i class="fa-duotone fa-solid fa-user" style={{paddingRight:'7px'}}></i>Profile</button>
                                <button className="btn" onClick={() => { if (setSelectedPage) setSelectedPage('notifications'); else navigate('/notifications'); }}><i class="fa-duotone fa-solid fa-bell" style={{paddingRight:'7px'}}></i>Alerts</button>

                            </div>
                        </div>

                        {/* PAYMENT TYPE DONUT */}
                        <div
                            className="glass-card"
                            style={{
                                padding: "12px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                cursor: "pointer"
                            }}
                            onClick={() => { if (setSelectedPage) setSelectedPage('payments'); else navigate('/payments'); }}
                        >
                            <h3 className="card-header">Payment Types</h3>
                            <div
                                style={{
                                    height: "120px",
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {isLoadingPayments || !paymentBreakdown ? (
                                    <div style={{ textAlign: "center" }}>Loading...</div>
                                ) : (
                                    <div
                                        style={{
                                            height: "100%",
                                            width: "100%",
                                            maxWidth: "220px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "16px",
                                            }}
                                        >
                                            {/* ✅ Custom Vertical Legend on the LEFT */}
                                            <div
                                                style={{
                                                    display: "absolute",
                                                    flexDirection: "column",
                                                    alignItems: "flex-end",
                                                    gap: "18px",
                                                    fontSize: "0.85rem",
                                                    minWidth: "60px",
                                                }}
                                            >
                                                {[
                                                    { label: "Cash", color: "rgb(0,170,255)" },
                                                    { label: "Card", color: "rgba(0,170,255,0.49)" },
                                                    { label: "UPI", color: "rgba(0,170,255,0.19)" },
                                                ].map((item) => (
                                                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
            style={{
                width: "10px",
                height: "10px",
                backgroundColor: item.color,
                borderRadius: "50%",
                display: "inline-block",
            }}
        ></span>
                                                        <span>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Donut Chart */}
                                            <div
                                                style={{
                                                    width: "130px", // 👈 keeps the size small
                                                    height: "130px",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Doughnut
                                                    ref={donutChartRef}
                                                    data={donutData}
                                                    options={{
                                                        ...donutOptions,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false },
                                                            tooltip: { enabled: true },
                                                        },
                                                        cutout: "70%",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* === Row 2: Top Products |  | Recent Orders === */}
                    <div
                        className="dashboard-row"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "40% 40% 25%",
                            gap: "1.5rem",
                            marginTop: "1rem",
                            alignItems: "start",
                        }}
                    >
                        {/* TOP PRODUCTS */}
                        <div className="top-products glass-card">
                            <div
                                className="card-header"
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div className="toggle-buttons">
                                    <button
                                        className={`toggle-btn ${
                                            productFactor === "mostSelling" ? "active" : ""
                                        }`}
                                        onClick={() => setProductFactor("mostSelling")}
                                    >
                                        Most Selling
                                    </button>
                                    <button
                                        className={`toggle-btn ${
                                            productFactor === "topGrossing" ? "active" : ""
                                        }`}
                                        onClick={() => setProductFactor("topGrossing")}
                                    >
                                        Top Grossing
                                    </button>
                                </div>
                                <h3>Top Products</h3>
                            </div>

                            <div className="table-container">
                                {isLoadingProducts ? (
                                    <p>Loading...</p>
                                ) : (
                                    <table className="data-table gradient-table">
                                        <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Stock</th>
                                            <th>Revenue</th>
                                            <th>Units Sold</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {(topProducts || []).map((product) => (
                                            <tr key={product.productName || JSON.stringify(product)} onClick={() => handleTakeActionProducts(product.productName)}>
                                                <td>{product.productName}</td>
                                                <td>{product.category}</td>
                                                <td>{product.currentStock}</td>
                                                <td>
                                                    ₹{(product.amount ?? 0).toLocaleString("en-IN")}
                                                </td>
                                                <td>{product.count}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* SALES PERFORMANCE */}
                        <div className="weekly-sales-graph glass-card">
                            <h3 className="card-header"  onClick={() => { if (setSelectedPage) setSelectedPage('analytics'); else navigate('/analytics'); }}>Sales Performance</h3>
                            <div className="chart-container" style={{ height: "250px" }}>
                                <Line ref={lineChartRef} options={chartOptions} data={chartData} />
                            </div>
                        </div>

                        {/* RECENT ORDERS */}
                        <div
                            className="glass-card"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                padding: "12px",
                            }}
                        >
                            <h3 className="card-header">Top Sales</h3>
                            <div className="table-container" style={{ overflow: "auto" }}>
                                {isLoadingRecentOrders ? (
                                    <p>Loading...</p>
                                ) : (
                                    <table className="data-table small-table">
                                        <thead>
                                        <tr>
                                            <th>OrderId</th>
                                            <th>Amount</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {(recentOrders || [])
                                            .slice(0, 6)
                                            .map((o) => (
                                                <tr key={o.orderId || `${o.customer}-${Math.random()}`} onClick={() => handleTakeActionSales(o.orderId)}>
                                                    <td>{o.orderId}</td>
                                                    <td>₹{(o.total ?? 0).toLocaleString("en-IN")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR (empty for now) */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        alignSelf: "start",
                        height: "100%",
                    }}
                >
                    <div style={{ minHeight: "1px" }} />
                </div>
            </div>


            {/* Add Customer Modal */}
            {isNewCusModalOpen && (
                <Modal title ="Add New Customer" show={isNewCusModalOpen} onClose={() => setIsNewCusModalOpen(false)}>

                    <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                   maxLength="10"
                                   pattern="[5-9][0-9]{9}"
                                   title="Phone number must be 10 digits and start with 5, 6, 7, 8, or 9"/>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn">Add Customer</button>
                        </div>
                    </form>
                </Modal>
            )}

            <Modal
                title="Adjust Estimates"
                show={isAdjusting}
                onClose={() => setIsAdjusting(false)}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {graphView !== "profit" && (
                        <div className="form-group">
                            <label>Adjust Sales Estimate</label>
                            <input
                                type="number"
                                value={goalData.estimatedSales}
                                onChange={(e) =>
                                    setGoalData({ ...goalData, estimatedSales: +e.target.value })
                                }
                            />
                        </div>
                    )}

                    {/* Date range selection */}
                    <div className="form-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={goalData.fromDate || ""}
                            onChange={(e) =>
                                setGoalData({ ...goalData, fromDate: e.target.value })
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={goalData.toDate || ""}
                            onChange={(e) =>
                                setGoalData({ ...goalData, toDate: e.target.value })
                            }
                        />
                    </div>

                    <div
                        className="form-actions"
                        style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}
                    >
                        <button
                            className="btn"
                            onClick={async () => {
                                try {
                                    await fetch(`${apiUrl}/api/shop/update/goals`, {
                                        method: "POST",
                                        credentials: "include",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(goalData),
                                    });
                                } catch (e) {
                                    console.warn('Failed to save goals', e);
                                }
                                setIsAdjusting(false);
                            }}
                        >
                            Save
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsAdjusting(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add Product Modal */}
            <Modal title="Add New Product" show={isAddProdModalOpen} onClose={() => setIsAddProdModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="">-- Select Category --</option>
                            <option value="Smartphones">Smartphones</option>
                            <option value="Laptops and Computers">Laptops and Computers</option>
                            <option value="Audio">Audio</option>
                            <option value="Videos">Videos</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Price</label>
                        <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Cost Price</label>
                        <input type="number" required value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Stock Quantity</label>
                        <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <input type="number" required value={tax} onChange={(e) => setTax(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Add Product</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DashboardPage;
