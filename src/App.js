import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import LandingPage from './components/LandingPage';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import DashboardPage from './pages/DashboardPage';
// ... (all your other page imports)
import CustomersPage from './pages/CustomersPage';
import PaymentsPage from './pages/PaymentsPage';
import BillingPage from './pages/BillingPage';
import BillingPage2 from './pages/BillingPage2';
import ProductsPage from './pages/ProductsPage';

import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import UserProfilePage from './pages/UserProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import Notification from './pages/Notification';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import AdminChatPage from './pages/AdminChatPage';
import SubscriptionPage from './pages/SubscriptionPage';

// This is your full-page blocker
import PremiumGuard from './context/PremiumGuard'; // Respecting your file path

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig } from "./pages/ConfigProvider";
import { useSearchKey } from "./context/SearchKeyContext";
import { Toaster } from 'react-hot-toast';
import { AlertProvider } from './context/AlertContext';
import AlertDialog from './components/AlertDialog';
import axios from 'axios';

import { PremiumProvider, usePremium } from './context/PremiumContext';

// --- NEW ---
// 1. Import the new modal context and component
import { PremiumModalProvider } from './context/PremiumModalContext';
import PremiumModal from './components/PremiumModal';
// --- END NEW ---

const queryClient = new QueryClient();


axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized (401). Token likely expired. Logging out.');
            if (!window.location.pathname.includes('/login')) {
                alert('Your session has expired. Please log in again.');
            }
            localStorage.removeItem('userToken');
            localStorage.removeItem('theme');
            setTimeout(() => {
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }, 1500);

            return Promise.resolve({ data: null, __handledByInterceptor__: true });
        }
        return Promise.reject(error);
    }
);

// ----------------------------------------------------------------------
// --- AppContent COMPONENT ---
// ----------------------------------------------------------------------
function AppContent() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [warning, setWarning] = useState(false);
    const [countdown, setCountdown] = useState(360);
    const countdownRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const config = useConfig();
    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    const { setIsPremium } = usePremium();

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        document.body.classList.remove('dark-theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        localStorage.setItem('theme', theme);
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#111135' : '#f8fcff00');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    Number.prototype.toLocaleString = function (locales, options) {
        return new Intl.NumberFormat("en-IN", options).format(this.valueOf());
    };

    const clearTimers = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        inactivityTimerRef.current = null;
        countdownRef.current = null;
    }, []);

    const checkSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/shop/user/profileWithRole`, {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setUser(data);

                if (data.roles && data.roles.includes('ROLE_PREMIUM')) {
                    setIsPremium(true);
                } else {
                    setIsPremium(false);
                }

                try {
                    const settingsResponse = await fetch(`${apiUrl}/api/shop/get/user/settings`, {
                        method: 'GET',
                        credentials: 'include',
                    });
                    if (settingsResponse.ok) {
                        const settingsData = await settingsResponse.json();
                        if ( settingsData.ui.darkModeDefault) {
                            setTheme('dark');
                        } else {
                            setTheme('light');
                        }
                        localStorage.setItem('autoPrintInvoice', settingsData.ui.autoPrintInvoice);
                        localStorage.setItem('autoSendInvoice', settingsData.billing.autoSendInvoice);
                        localStorage.setItem('doParitalBilling', settingsData.billing.showPartialPaymentOption);
                        localStorage.setItem('showRemarksOptions', settingsData.billing.showRemarksOnSummarySide);

                    } else {
                        console.warn("Could not fetch user UI settings. Using defaults.");
                    }
                } catch (settingsError) {
                    console.error('Error fetching user UI settings:', settingsError);
                }

            } else {
                setUser(null);
                setIsPremium(false);
                clearTimers();
            }
        } catch (error) {
            console.error('Error checking session:', error);
            setUser(null);
            setIsPremium(false);
            clearTimers();
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, clearTimers, setIsPremium]);


    const handleLogin = () => {
        setIsLoading(true);
        checkSession();
    };

    const handleLogout = async () => {
        try {
            await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) { console.error('Logout failed', e); }
        setUser(null);
        setIsPremium(false);
        setSelectedPage('dashboard');
        clearTimers();
        setWarning(false);
    };

    const startInactivityWarning = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

        inactivityTimerRef.current = setTimeout(() => {
            setWarning(true);
            let timeLeft = 360;
            setCountdown(timeLeft);

            if (countdownRef.current) clearInterval(countdownRef.current);

            countdownRef.current = setInterval(() => {
                timeLeft -= 1;
                setCountdown(timeLeft);
                if (timeLeft <= 0) {
                    clearTimers();
                    alert("You have been logged out due to inactivity.");
                    handleLogout();
                }
            }, 1000);
        }, 14 * 60 * 1000);
    }, [clearTimers, handleLogout]);

    const handleUserActivity = useCallback(() => {
        if (!user) return;
        clearTimers();
        setWarning(false);
        startInactivityWarning();
    }, [user, clearTimers, setWarning, startInactivityWarning]);

    const { setSearchKey } = useSearchKey();

    useEffect(() => {
        checkSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount

    useEffect(() => {
        if (user) {
            const resetEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            const activityHandler = () => handleUserActivity();

            resetEvents.forEach(evt => window.addEventListener(evt, activityHandler, { capture: true, passive: true }));
            console.log("Activity listeners added.");

            handleUserActivity();

            return () => {
                console.log("Removing activity listeners.");
                resetEvents.forEach(evt => window.removeEventListener(evt, activityHandler, { capture: true }));
                clearTimers();
            };
        } else {
            clearTimers();
            console.log("No user, ensuring timers are clear.");
        }
    }, [user, handleUserActivity, clearTimers]);

    const [selectedPage, setSelectedPage] = useState('dashboard');

    useEffect(() => {
        if (selectedPage !== 'customers') {
            setSearchKey('');
        }
    }, [selectedPage, setSearchKey]);

    const isAdmin = user?.roles?.includes('ADMIN') ?? false;

    let effectivePage = selectedPage;
    if (isAdmin && selectedPage === 'chat') {
        effectivePage = 'adminChat';
    }

    // This pages object correctly uses PremiumGuard for full-page protection
    const pages = {
        dashboard: <DashboardPage setSelectedPage={setSelectedPage} />,
        products: <ProductsPage setSelectedPage={setSelectedPage} />,
        sales: <SalesPage setSelectedPage={setSelectedPage} />,
        customers: <CustomersPage setSelectedPage={setSelectedPage} />,
        payments: <PaymentsPage setSelectedPage={setSelectedPage} />,
        billing: <BillingPage setSelectedPage={setSelectedPage} />,
        billing2: <BillingPage2 setSelectedPage={setSelectedPage} />,
        subscribe: <SubscriptionPage setSelectedPage={setSelectedPage} />,
        reports: (
            <PremiumGuard>
                <ReportsPage setSelectedPage={setSelectedPage} />
            </PremiumGuard>
        ),
        profile: <UserProfilePage setSelectedPage={setSelectedPage} />,
        analytics: (
            <PremiumGuard>
                <AnalyticsPage setSelectedPage={setSelectedPage} />
            </PremiumGuard>
        ),
        terms: <TermsPage setSelectedPage={setSelectedPage} />,
        privacy: <PrivacyPage setSelectedPage={setSelectedPage} />,
        help: <HelpPage setSelectedPage={setSelectedPage} />,
        notifications: <Notification setSelectedPage={setSelectedPage} />,
        settings: <SettingsPage setSelectedPage={setSelectedPage} />,
        chat: <ChatPage setSelectedPage={setSelectedPage} />,
        adminChat: <AdminChatPage adminUsername={user?.username} />
    };

    if (isLoading) {
        return <div>Loading Application...</div>;
    }

    // The content part returns the Router
    return (
        <Router>
            <AlertDialog />

            {/* --- NEW --- */}
            {/* 2. Render the single, global Premium Modal */}
            {/* It's available to be opened from anywhere */}
            <PremiumModal setSelectedPage={setSelectedPage} />
            {/* --- END NEW --- */}

            <Routes>
                <Route
                    path="/"
                    element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />}
                />
                <Route
                    path="/subscribe"
                    element={
                        user ? (
                            <MainLayout
                                onLogout={handleLogout}
                                theme={theme}
                                toggleTheme={toggleTheme}
                                selectedPage={'subscribe'} // Set the page
                                setSelectedPage={setSelectedPage}
                                pages={pages}
                                isAdmin={isAdmin}
                            />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/login"
                    element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />}
                />
                <Route
                    path="/*"
                    element={
                        user ? (
                            <MainLayout
                                onLogout={handleLogout}
                                theme={theme}
                                toggleTheme={toggleTheme}
                                selectedPage={effectivePage}
                                setSelectedPage={setSelectedPage}
                                pages={pages}
                                isAdmin={isAdmin}
                            />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 2000,
                    style: {
                        background: 'lightgreen',
                        color: 'var(--text-color)',
                        borderRadius: '25px',
                        padding: '12px',
                        minWidth: '350px',
                        fontSize: '16px',
                    },
                }}
            />
        </Router>
    );
}

// ----------------------------------------------------------------------
// --- UPDATED App COMPONENT ---
// This is now just the provider wrapper
// ----------------------------------------------------------------------
function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AlertProvider>
                <PremiumProvider>
                    {/* --- NEW --- */}
                    {/* 3. Wrap AppContent with the Modal Provider */}
                    <PremiumModalProvider>
                        <AppContent />
                    </PremiumModalProvider>
                    {/* --- END NEW --- */}
                </PremiumProvider>
            </AlertProvider>
        </QueryClientProvider>
    );
}

export default App;