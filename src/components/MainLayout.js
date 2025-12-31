// src/components/MainLayout.js
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";
import './MainLayout.css'; // <-- 1. Import the new CSS file
import useHotkeys from '../hooks/useHotkeys';

const MainLayout = ({ children, onLogout, toggleTheme, theme, selectedPage, setSelectedPage, pages, isAdmin }) => {
    const navigate = useNavigate();

    // sidebar collapsed state (persist in localStorage)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            const s = localStorage.getItem('sidebar_collapsed');
            return s === 'true';
        } catch (e) {
            return false;
        }
    });

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar_collapsed', String(next)); } catch (e) {}
            return next;
        });
    };

    useHotkeys('d', () => setSelectedPage('dashboard'), { altKey: true });

    // Alt + B -> Billing
    useHotkeys('b', () => setSelectedPage('billing2'), { altKey: true });

    // Alt + P -> Products
    useHotkeys('i', () => setSelectedPage('products'), { altKey: true });

    // Alt + C -> Customers
    useHotkeys('c', () => setSelectedPage('customers'), { altKey: true });

    // Alt + S -> Sales
    useHotkeys('s', () => setSelectedPage('sales'), { altKey: true });

    // if storage changed elsewhere, keep it in sync
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'sidebar_collapsed') {
                try { setIsCollapsed(e.newValue === 'true'); } catch (err) {}
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const handleLogout = () => {
        if (onLogout) {
            onLogout(); // clear token
        }
        navigate("/login"); // redirect to login page
    };

    return (
        // 2. This class now controls the *entire* app layout
        <div className={`app-layout ${isCollapsed ? 'collapsed' : ''}`}>

            {/* 3. Topbar is now at the top, outside of any other container. */}
            {/* We pass 'isCollapsed' and 'toggleSidebar' to it. */}
            <Topbar
                onLogout={handleLogout}
                toggleTheme={toggleTheme}
                theme={theme}
                isCollapsed={isCollapsed}
                toggleSidebar={toggleSidebar} // <-- Pass toggle function
                setSelectedPage={setSelectedPage}
            />

            {/* 4. This new 'content-area' holds the Sidebar and Main Content */}
            <div className="content-area">

                {/* 5. Sidebar no longer needs 'toggleSidebar' prop */}
                <Sidebar
                    isCollapsed={isCollapsed}
                    selectedPage={selectedPage}
                    setSelectedPage={setSelectedPage}
                    isAdmin={isAdmin}
                />

                {/* 6. 'main-content' no longer contains Topbar */}
                <div className="main-content">
                    <main>{(pages && selectedPage && pages[selectedPage]) ? pages[selectedPage] : children}</main>
                    <Footer setSelectedPage={setSelectedPage} />
                </div>
            </div>
        </div>
    );
};

export default MainLayout;