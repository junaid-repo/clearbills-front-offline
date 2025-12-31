import React, { useState, useEffect } from 'react';
import './AnalyticsPage.css';
import { useNavigate } from 'react-router-dom';
import { useSearchKey } from '../context/SearchKeyContext';
// --- UPDATED: Re-enabled useConfig ---
import { useConfig } from '../pages/ConfigProvider';
// Import recharts components
import {
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart, // Import AreaChart
    Area, // Import Area
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

// --- Style Component ---
// (This component is unchanged)
const AnalyticsStyles = () => {
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
      /* --- Page Layout --- */
     
    `;
        document.head.appendChild(style);

        // Cleanup function to remove the style when the component unmounts
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return null; // This component doesn't render anything itself
};

// --- *** NEW: Indian Number Formatting Helper *** ---
const formatIndianNumber = (num) => {
    if (isNaN(num) || num === null) return '0';
    const number = Number(num);

    if (number >= 10000000) { // 1 Crore
        const val = number / 10000000;
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val) + ' Cr';
    }
    if (number >= 100000) { // 1 Lakh
        const val = number / 100000;
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val) + ' L';
    }
    // Below 1 Lakh, just use standard comma separation
    return new Intl.NumberFormat('en-IN').format(number);
};


// --- Custom Recharts Tooltip ---
// --- UPDATED: Reverted to show exact number ---
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="recharts-tooltip-wrapper">
                <p className="recharts-tooltip-label">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color || p.fill, margin: 0, fontSize: '0.9rem' }}>
                        {/* UPDATED HERE: Reverted to toLocaleString() for exact value */}
                        {`${p.name}: ${p.value.toLocaleString()}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


// --- Main App Component ---
const AnalyticsPage = ({ setSelectedPage }) => {
    // --- State for month selection ---
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [dateError, setDateError] = useState(''); // For validation

    const [isLoading, setIsLoading] = useState(true); // Set initial loading to true

    // --- State for chart data ---
    const [paymentData, setPaymentData] = useState([]);
    const [gstData, setGstData] = useState([]);
    const [invoiceData, setInvoiceData] = useState([]);
    const [profitData, setProfitData] = useState([]);

    // --- UPDATED: Bifurcated state ---
    const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
    const [monthlyStockData, setMonthlyStockData] = useState([]);
    // --- End of Update ---

    const [topProductsData, setTopProductsData] = useState([]);
    const [monthlySalesData, setMonthlySalesData] = useState([]);

    // --- State for totals ---
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalStockSold, setTotalStockSold] = useState(0);
    const [totalProfit, setTotalProfit] = useState(0);
    const [totalSales, setTotalSales] = useState(0);

    // --- Hooks for navigation and API config ---
    const navigate = useNavigate();
    const { setSearchKey } = useSearchKey();
    // --- UPDATED: Re-enabled API config ---
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    // --- End of Update ---

    // --- State for theme-reactive colors ---
    const [paymentColors, setPaymentColors] = useState(['#1f6b52', 'rgba(28,96,74,0.46)']);
    const [gstColors, setGstColors] = useState(['#1f6b52', 'rgba(28,96,74,0.46)']);
    const [invoiceColors, setInvoiceColors] = useState(['#1f6b52', 'rgba(28,96,74,0.46)']);

    // Gradient stroke colors
    const REVENUE_STROKE_COLOR = "url(#colorRevenueStroke)";

    // --- Mock Data Setup (Used as a fallback on API error) ---
    const setupMockData = () => {
        // 2a) Payment Data
        const paymentValues = [
            { name: 'Paid', value: 45670 },
            { name: 'Due', value: 12340 }
        ];
        setPaymentData(paymentValues);

        // 2a) GST Data
        const gstValues = [
            { name: 'With GST', value: 320 },
            { name: 'Without GST', value: 85 }
        ];
        setGstData(gstValues);

        // ADDED MOCK DATA for new chart
        const invoiceValues = [
            { name: 'Fully Paid', value: 150 },
            { name: 'Partial Paid', value: 45 }
        ];
        setInvoiceData(invoiceValues);

        // 2b) Profit Data (using new structure)
        const profitValues = [
            { name: 'Jan', value: 1200000 }, // Mocked a Lakh value
            { name: 'Feb', value: 15000 },
            { name: 'Mar', value: 11000 },
            { name: 'Apr', value: 18000 },
            { name: 'May', value: 21000000 }, // Mocked a Crore value
            { name: 'Jun', value: 19000 },
        ];
        setProfitData(profitValues);
        setTotalProfit(profitValues.reduce((a, b) => a + b.value, 0)); // Use .value

        // 3) Bifurcated Sales & Revenue Data (using new structure)
        const revenueValues = [
            { name: 'Jan', value: 4000000 },
            { name: 'Feb', value: 30000 },
            { name: 'Mar', value: 20000 },
            { name: 'Apr', value: 27800 },
            { name: 'May', value: 1890000 },
            { name: 'Jun', value: 23900 },
            { name: 'Jul', value: 34900 },
        ];
        setMonthlyRevenueData(revenueValues);
        setTotalRevenue(revenueValues.reduce((a, b) => a + b.value, 0)); // Use .value

        const stockValues = [
            { name: 'Jan', value: 240 },
            { name: 'Feb', value: 139 },
            { name: 'Mar', value: 980 },
            { name: 'Apr', value: 390 },
            { name: 'May', value: 480 },
            { name: 'Jun', value: 380 },
            { name: 'Jul', value: 430 },
        ];
        setMonthlyStockData(stockValues);
        setTotalStockSold(stockValues.reduce((a, b) => a + b.value, 0)); // Use .value

        // 4a) Top Products (using new structure)
        const productValues = [
            { name: 'Product A', value: 120000 },
            { name: 'Product B', value: 980 },
            { name: 'Product C', value: 860 },
            { name: 'Product D', value: 75 },
            { name: 'Product E', value: 62 },
            { name: 'Product F', value: 51 }
        ];
        const shuffledProducts = productValues.sort(() => Math.random() - 0.5);
        setTopProductsData(shuffledProducts);

        // 4b) Monthly Sales (using new structure)
        const monthlySalesValues = [
            { name: 'Jan', value: 400 },
            { name: 'Feb', value: 300 },
            { name: 'Mar', value: 500 },
            { name: 'Apr', value: 450 },
            { name: 'May', value: 600 },
            { name: 'Jun', value: 580 },
            { name: 'Jul', value: 620 },
            { name: 'Aug', value: 510 },
            { name: 'Sep', value: 700 },
            { name: 'Oct', value: 650 },
            { name: 'Nov', value: 710 },
            { name: 'Dec', value: 820 },
        ];
        setMonthlySalesData(monthlySalesValues);
        setTotalSales(monthlySalesValues.reduce((a, b) => a + b.value, 0)); // Use .value
    };

    // --- Set default month range on mount ---
    useEffect(() => {
        const today = new Date();
        const formatMonth = (date) => date.toISOString().substring(0, 7);
        const end = today;
        const start = new Date(today);
        start.setMonth(start.getMonth() - 6);

        setStartMonth(formatMonth(start));
        setEndMonth(formatMonth(end));

        // --- Mock data is no longer loaded here; API call is triggered by the useEffect below ---
    }, []);

    // --- UPDATED: This useEffect now calls the API on initial load ---
    useEffect(() => {
        // Only fetch if all conditions are met
        if (startMonth && endMonth && apiUrl) {
            handleRefresh(true); // 'true' skips button-press validation
        } else if (startMonth && endMonth && !apiUrl) {
            // Handle case where API isn't configured
            setDateError("API URL not configured. Loading mock data.");
            setupMockData();
            setIsLoading(false);
        }
    }, [startMonth, endMonth, apiUrl]); // Dependencies

    // --- *** UPDATED: API Call Section *** ---
    const fetchAnalyticsData = async () => {
        setIsLoading(true);
        setDateError('');

        // Check for API URL
        if (!apiUrl) {
            setDateError('API URL is not configured. Cannot fetch data.');
            setIsLoading(false);
            setupMockData(); // Load mock as fallback
            return;
        }

        try {
            // 1. Define the request body
            const requestBody = {
                startDate: startMonth,
                endDate: endMonth
            };

            // 2. Call the API
            const response = await fetch(`${apiUrl}/api/shop/user/superAnalytics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                credentials: 'include' // As requested
            });

            // 3. Handle non-OK responses
            if (!response.ok) {
                let errorText = `HTTP error! status: ${response.status}`;
                try {
                    // Try to get a more specific message from the API response
                    const errorData = await response.json();
                    errorText = errorData.message || errorText;
                } catch (e) {
                    // Response wasn't JSON, stick with the status
                }
                throw new Error(errorText);
            }

            // 4. Parse the successful JSON response
            const data = await response.json();

            // 5. Populate state from the API response
            // Use default empty arrays '[]' to prevent crashes if a key is missing
            const payment = data.paymentStatus || [];
            const gst = data.customerGst || [];
            const invoice = data.invoiceStatus || [];
            const profit = data.monthlyProfits || [];
            const revenue = data.salesAndRevenue || [];
            const stock = data.monthlyStockSold || [];
            const topProducts = data.topProducts || [];
            const sales = data.monthlySales || [];

            setPaymentData(payment);
            setGstData(gst);
            setInvoiceData(invoice);
            setProfitData(profit);
            setMonthlyRevenueData(revenue);
            setMonthlyStockData(stock);
            setTopProductsData(topProducts);
            setMonthlySalesData(sales);

            // 6. Use the pre-calculated totals from the backend
            // --- UPDATED: Using backend totals ---
            setTotalProfit(data.totalProfit || 0);
            setTotalRevenue(data.totalRevenue || 0);
            setTotalStockSold(data.totalStockSold || 0);
            setTotalSales(data.totalSales || 0);

        } catch (error) {
            // 7. Handle any errors (network error, JSON parse error, etc.)
            console.error("Failed to fetch analytics data:", error);
            setDateError(`Failed to load data: ${error.message}. Displaying mock data as fallback.`);
            setupMockData(); // Load mock data so the page isn't empty
        } finally {
            // 8. Always stop the loader
            setIsLoading(false);
        }
    };
    // --- *** End of Updated Section *** ---


    // --- UPDATED: Validation logic in refresh handler ---
    const handleRefresh = (skipValidation = false) => {
        if (!skipValidation) {
            setDateError(''); // Clear previous errors
            const startDate = new Date(startMonth);
            const endDate = new Date(endMonth);

            if (endDate < startDate) {
                setDateError('Start month must be before end month.');
                return;
            }

            const yearDiff = endDate.getFullYear() - startDate.getFullYear();
            const monthDiff = endDate.getMonth() - startDate.getMonth();
            const totalMonths = (yearDiff * 12) + monthDiff;

            if (totalMonths >= 12) {
                setDateError('Date range cannot be 12 months or more. Please select a smaller range.');
                return;
            }
        }
        // This now calls the REAL API fetch
        fetchAnalyticsData();
    };
    // --- End of Update ---

    // --- Click handler for product bubbles ---
    // (This function is unchanged)
    const handleProductBubbleClick = (productName) => {
        setSearchKey(productName);
        if (setSelectedPage) {
            setSelectedPage('products');
        } else {
            navigate('/products');
        }
    };

    // --- Chart Options (Dark Mode awareness) ---
    // (This useEffect is unchanged)
    const [tickColor, setTickColor] = useState('#495057');
    const [gridColor, setGridColor] = useState('rgba(0, 0, 0, 0.05)');

    useEffect(() => {
        const updateThemeColors = () => {
            const isDarkMode = document.body.classList.contains('dark-theme');
            setTickColor(isDarkMode ? 'var(--tiny-text-color, #8b949e)' : 'var(--tiny-text-color, #6c757d)');
            setGridColor(isDarkMode ? 'rgba(156, 163, 175, 0.1)' : 'rgba(0, 0, 0, 0.05)');

            if (isDarkMode) {
                setPaymentColors(['#28a745', 'rgba(40, 167, 69, 0.5)']);
                setGstColors(['#34c759', 'rgba(52, 199, 89, 0.5)']);
                setInvoiceColors(['#0a84ff', 'rgba(10, 132, 255, 0.5)']);
            } else {
                setPaymentColors(['#1f6b52', 'rgba(28,96,74,0.46)']);
                setGstColors(['#1f6b52', 'rgba(28,96,74,0.46)']);
                setInvoiceColors(['#1f6b52', 'rgba(28,96,74,0.46)']);
            }
        };
        updateThemeColors();
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class') {
                    updateThemeColors();
                }
            }
        });
        observer.observe(document.body, { attributes: true });
        return () => observer.disconnect();
    }, []);


    // --- Calculate totals for doughnut charts ---
    // (This logic is unchanged, it recalculates on every render)
    const paymentTotal = paymentData.reduce((acc, entry) => acc + entry.value, 0);
    const gstTotal = gstData.reduce((acc, entry) => acc + entry.value, 0);
    const invoiceTotal = invoiceData.reduce((acc, entry) => acc + entry.value, 0);

    const doughnutLegendStyle = {
        color: 'var(--text-color)',
        fontSize: '10px',
        fontStyle: 'italic',
    };

    const chartTick = {
        fill: tickColor,
        fontStyle: 'italic',
        fontSize: 10
    };


    // --- Main Render (unchanged) ---
    return (
        <div className="analytics-page-container">

            {/* This injects the CSS */}
            <AnalyticsStyles />

            {/* --- 1) Filter Bar --- */}
            <div className="filter-bar glass-card" style={{boxShadow:" 0 0px 0px var(--shadow-color) ", gap: "10rem"}}>
                <h2 className="dashboard-title">Analytics Dashboard</h2>

                <div className="date-filter">
                    <label htmlFor="startMonth">From</label>
                    <input
                        type="month"
                        id="startMonth"
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        className="date-input"
                    />
                </div>
                <div className="date-filter">
                    <label htmlFor="endMonth">To</label>
                    <input
                        type="month"
                        id="endMonth"
                        value={endMonth}
                        onChange={(e) => setEndMonth(e.target.value)}
                        className="date-input"
                    />
                </div>

                <button
                    onClick={() => handleRefresh(false)} // Pass false to force validation
                    disabled={isLoading}
                    className="btn"
                >
                    <svg className={isLoading ? 'animate-spin' : ''} width="48" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
                </button>
            </div>

            {/* --- Validation Error Display --- */}
            {dateError && (
                <div className="date-error-message">
                    {dateError}
                </div>
            )}

            {/* --- Loading Skeleton (unchanged) --- */}
            {isLoading && (
                <div className="main-grid" style={{ filter: 'blur(4px)', opacity: 0.6, transition: 'all 0.3s ease' }}>
                    {/* Skeleton content... */}
                    <div className="grid-col-2">
                        <div className="glass-card" style={{ height: '300px' }}></div>
                        <div className="glass-card" style={{ height: '300px' }}></div>
                    </div>
                    <div className="grid-col-2">
                        <div className="glass-card" style={{ height: '300px' }}></div>
                        <div className="glass-card" style={{ height: '300px' }}></div>
                    </div>
                    <div className="grid-col-2">
                        <div className="glass-card" style={{ height: '300px' }}></div>
                        <div className="glass-card" style={{ height: '300px' }}></div>
                    </div>
                </div>
            )}

            {/* --- Main Grid (only renders when not loading) --- */}
            {!isLoading && (
                <div className="main-grid">

                    {/* --- 2) Doughnuts & Sales Count Bar --- */}
                    <div className="grid-col-2">
                        {/* 2a) Doughnut Graphs (unchanged) */}
                        <div className="glass-card doughnut-container">
                            <div className="doughnut-chart-wrapper">
                                <h3 className="chart-title-small">Payment Status</h3>
                                <div className="doughnut-center-text">
                                    {/* UPDATED HERE */}
                                    <span className="doughnut-total-value">
                                    ₹{formatIndianNumber(paymentTotal)}
                                  </span>
                                </div>
                                <div className="chart-inner-container">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="55%"
                                                outerRadius="100%"
                                                fill="#8884d8"
                                                paddingAngle={0}
                                            >
                                                {paymentData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={paymentColors[index % paymentColors.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend iconType="circle" wrapperStyle={doughnutLegendStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="doughnut-chart-wrapper">
                                <h3 className="chart-title-small">Customer GST</h3>
                                <div className="doughnut-center-text">
                                    {/* UPDATED HERE */}
                                    <span className="doughnut-total-value">{formatIndianNumber(gstTotal)}</span>
                                </div>
                                <div className="chart-inner-container">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={gstData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="55%"
                                                outerRadius="100%"
                                                fill="#8884d8"
                                                paddingAngle={0}
                                            >
                                                {gstData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={gstColors[index % gstColors.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend iconType="circle" wrapperStyle={doughnutLegendStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="doughnut-chart-wrapper">
                                <h3 className="chart-title-small">Invoice Status</h3>
                                <div className="doughnut-center-text">
                                    {/* UPDATED HERE */}
                                    <span className="doughnut-total-value">{formatIndianNumber(invoiceTotal)}</span>
                                </div>
                                <div className="chart-inner-container">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={invoiceData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="55%"
                                                outerRadius="100%"
                                                fill="#8884d8"
                                                paddingAngle={0}
                                            >
                                                {invoiceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={invoiceColors[index % invoiceColors.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend iconType="circle" wrapperStyle={doughnutLegendStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* --- *** SWAPPED BLOCK: Was 4b) Monthly Sales (Vertical Bar) *** --- */}
                        <div className="glass-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Monthly Sales Count</h3>
                                <div className="totals-container">
                                    <div className="total-box">
                                        <span className="total-label">Total Sales</span>
                                        {/* UPDATED HERE */}
                                        <span className="total-value stock">{formatIndianNumber(totalSales)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-inner-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* --- UPDATED: dataKey --- */}
                                    <BarChart data={monthlySalesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.9}/>
                                                <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0.6}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="name" tick={chartTick} axisLine={false} tickLine={false} />
                                        {/* UPDATED HERE */}
                                        <YAxis axisLine={false} tickLine={false} tick={chartTick} tickFormatter={formatIndianNumber} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                                        <Bar dataKey="value" fill="url(#colorSales)" radius={[18, 18, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* --- 3) Revenue & Profit (Split) --- */}
                    <div className="grid-col-2">

                        {/* 3a) Revenue Chart */}
                        <div className="glass-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Revenue</h3>
                                <div className="totals-container">
                                    <div className="total-box">
                                        <span className="total-label">Total Revenue</span>
                                        {/* UPDATED HERE */}
                                        <span className="total-value revenue">₹{formatIndianNumber(totalRevenue)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-inner-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* --- UPDATED: data and dataKey --- */}
                                    <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorRevenueFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorRevenueStroke" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={1}/>
                                                <stop offset="95%" stopColor="#a78bfa" stopOpacity={1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="name" tick={chartTick} axisLine={false} tickLine={false} />
                                        {/* UPDATED HERE */}
                                        <YAxis tick={chartTick} axisLine={false} tickLine={false} tickFormatter={formatIndianNumber} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{color: 'var(--text-color)'}} />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={REVENUE_STROKE_COLOR}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRevenueFill)"
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* --- 3b) MONTHLY PROFIT --- */}
                        <div className="glass-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Monthly Profits</h3>
                                <div className="totals-container">
                                    <div className="total-box">
                                        <span className="total-label">Total Profit</span>
                                        {/* UPDATED HERE */}
                                        <span className="total-value profit">
                                          ₹{formatIndianNumber(totalProfit)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-inner-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* --- UPDATED: dataKey --- */}
                                    <AreaChart data={profitData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorProfitFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="rgba(198, 69, 157, 0.8)" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="rgba(198, 69, 157, 0)" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorProfitStroke" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="5%" stopColor="rgba(198, 69, 157, 0.9)" stopOpacity={1}/>
                                                <stop offset="95%" stopColor="rgba(198, 69, 157, 0.6)" stopOpacity={1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="name" tick={chartTick} axisLine={false} tickLine={false} />
                                        {/* UPDATED HERE */}
                                        <YAxis tick={chartTick} axisLine={false} tickLine={false} tickFormatter={formatIndianNumber} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{color: 'var(--text-color)'}} />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="url(#colorProfitStroke)"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorProfitFill)"
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>


                    {/* --- 4) Top Products & Stock Sold --- */}
                    <div className="grid-col-2">

                        {/* 4a) Top Sold Products (Bubble) */}
                        <div className="glass-card">
                            <h3 className="chart-title">Top Sold Products</h3>
                            <div className="chart-inner-container bubble-layout-container">
                                {/* --- UPDATED: product.count to product.value --- */}
                                {topProductsData.map((product) => {
                                    const size = product.value * 1.5 + 50; // Use .value
                                    return (
                                        <div
                                            key={product.name}
                                            className="product-bubble"
                                            style={{
                                                width: `${size}px`,
                                                height: `${size}px`
                                            }}
                                            title={`${product.name}: ${formatIndianNumber(product.value)} sold`} // Use .value
                                            onClick={() => handleProductBubbleClick(product.name)}
                                        >
                                            {/* UPDATED HERE */}
                                            <span className="bubble-count">{formatIndianNumber(product.value)}</span> {/* Use .value */}
                                            <span className="bubble-name">{product.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* --- *** SWAPPED BLOCK: Was 2b) STOCK SOLD *** --- */}
                        <div className="glass-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Stock Sold</h3>
                                <div className="totals-container">
                                    <div className="total-box">
                                        <span className="total-label">Total Stock Sold</span>
                                        {/* UPDATED HERE */}
                                        <span className="total-value stock">{formatIndianNumber(totalStockSold)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-inner-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* --- UPDATED: data and dataKey --- */}
                                    <BarChart data={monthlyStockData} layout="vertical" margin={{ left: 10 }}>
                                        <defs>
                                            <linearGradient id="colorStockBar" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={1}/>
                                                <stop offset="95%" stopColor="#a78bfa" stopOpacity={1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={chartTick} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                                        <Bar dataKey="value" fill="url(#colorStockBar)" radius={[0, 8, 8, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;