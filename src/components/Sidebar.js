// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Gauge, UsersFour, Invoice , Archive, ChartLineUp, MicrosoftExcelLogo, ShoppingCart, CreditCard, Receipt, Headset, Gear } from "@phosphor-icons/react";
// 👆 Added `Headset` icon for chat support

import './Sidebar.css';
import PremiumFeature from '../components/PremiumFeature';

const iconColors = {
    dashboard: "#353aad",
    products: "#353aad",
    sales: "#353aad",
    billing: "#353aad",
    customers: "#353aad",
    payments: "#353aad",
    reports: "#353aad",
    analytics: "#353aad",
    chat: "#353aad"
};

const Sidebar = ({ isCollapsed = false,  selectedPage, setSelectedPage }) => {
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' && document.body.classList.contains('dark-theme')
    );

    const [primaryColor, setPrimaryColor] = useState(() => {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
            return val ? val.trim() : '#00aaff';
        } catch (e) {
            return '#00aaff';
        }
    });

    useEffect(() => {
        const update = () => {
            try {
                setIsDark(document.body.classList.contains('dark-theme'));
            } catch (e) {}
            try {
                const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
                if (val) setPrimaryColor(val.trim());
            } catch (e) {}
        };

        update();
        const obs = new MutationObserver(update);
        try {
            obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (e) {}
        const storageHandler = (e) => {
            if (e.key === 'theme' || e.key === 'sidebar_collapsed') update();
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            obs.disconnect();
            window.removeEventListener('storage', storageHandler);
        };
    }, []);

    const collapsedIconColor = isDark ? '#ffffff' : '#353aad' || '#00aaff';
    const toggleColor = collapsedIconColor;

    const makeClickHandler = (page) => (e) => {
        e.preventDefault();
        if (setSelectedPage) setSelectedPage(page);
    };

    const navButtonBaseStyle = {
        border: 'none',
        textAlign: 'left',
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        borderRadius: '50px'
    };

    const buttonStyleFor = (page) => {
        if (selectedPage === page) return navButtonBaseStyle;
        return { ...navButtonBaseStyle, background: 'transparent' };
    };

    const footerNavButtonBaseStyle = {
        border: 'none',
        color: 'var(--primary-color)',
        textAlign: 'left',
        padding: '0.6rem 1rem',    // Smaller padding
        marginBottom: '0.25rem',   // Closer together
        borderRadius: '8px',       // Distinct (not a pill)
        fontSize: '0.7em',         // Smaller font
    };
    const footerButtonStyleFor = (page) => {
        if (selectedPage === page) return footerNavButtonBaseStyle;
        return { ...footerNavButtonBaseStyle, background: 'transparent' };
    };


    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>



            <nav className="sidebar-nav">
                <button
                    type="button"
                    onClick={makeClickHandler('dashboard')}
                    className={`nav-link ${selectedPage === 'dashboard' ? 'active' : ''}`}
                    title="Dashboard"
                    style={buttonStyleFor('dashboard')}
                >
                    <i className="fa-duotone fa-solid fa-gauge-simple-high"></i>
                   {/* <Gauge
                        weight="duotone"
                        style={{
                            color: isDark
                                ? '#ffffff'
                                : iconColors.dashboard
                        }}
                    />*/}
                    <span className="nav-text">Dashboard</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('products')}
                    className={`nav-link ${selectedPage === 'products' ? 'active' : ''}`}
                    title="Products"
                    style={buttonStyleFor('products')}
                >
                    {/*
                    <Archive weight="duotone" style={{ color: 'var(--text-color)' }} />
*/}
                    <i className="fa-duotone fa-solid fa-boxes-stacked" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text">Products</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('sales')}
                    className={`nav-link ${selectedPage === 'sales' ? 'active' : ''}`}
                    title="Sales"
                    style={buttonStyleFor('sales')}
                >
                    {/*<ShoppingCart weight="duotone" style={{ color: 'var(--text-color)' }} />*/}
                    <i className="fa-duotone fa-solid fa-cart-shopping" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text">Sales</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('billing2')}
                    className={`nav-link ${selectedPage === 'billing2' ? 'active' : ''}`}
                    title="GSTBilling"
                    style={buttonStyleFor('billing2')}
                >
                    {/*<Receipt weight="duotone" style={{ color: 'var(--text-color)' }} />*/}
                    <i className="fa-duotone fa-solid fa-file-invoice" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text">GSTBilling</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('customers')}
                    className={`nav-link ${selectedPage === 'customers' ? 'active' : ''}`}
                    title="Customers"
                    style={buttonStyleFor('customers')}
                >
                    {/*<UsersFour weight="duotone" style={{ color: 'var(--text-color)' }} />*/}
                    <i className="fa-duotone fa-regular fa-users" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text" >Customers</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('payments')}
                    className={`nav-link ${selectedPage === 'payments' ? 'active' : ''}`}
                    title="Payments"
                    style={buttonStyleFor('payments')}
                >
                    {/*<CreditCard weight="duotone" style={{ color: 'var(--text-color)' }} />*/}
                    <i className="fa-duotone fa-solid fa-credit-card" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text">Payments</span>
                </button>
              <PremiumFeature>
                <button
                    type="button"
                    onClick={makeClickHandler('reports')}
                    className={`nav-link ${selectedPage === 'reports' ? 'active' : ''}`}
                    title="Reports"
                    style={buttonStyleFor('reports')}
                >
                    {/*<MicrosoftExcelLogo weight="duotone" style={{ color: 'var(--text-color)' }} />*/}
                    <i className="fa-duotone fa-solid fa-file-spreadsheet" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text">Reports</span>
                </button>
              </PremiumFeature>
            <PremiumFeature>
                <button
                    type="button"
                    onClick={makeClickHandler('analytics')}
                    className={`nav-link ${selectedPage === 'analytics' ? 'active' : ''}`}
                    title="Analytics"
                    style={buttonStyleFor('analytics')}
                >
                    {/*<ChartLineUp weight="duotone" style={{ color: 'var(--text-color)' }} />*/}
                    <i className="fa-duotone fa-solid fa-chart-mixed" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text">Analytics</span>
                </button> </PremiumFeature>
            </nav>


            <div className="sidebar-footer">
                <button
                    type="button"
                    onClick={makeClickHandler('chat')}
                    className={`nav-link chat-support ${selectedPage === 'chat' ? 'active' : ''}`}
                    title="Chat Support"
                    style={footerButtonStyleFor('chat')}
                >
{/*
                    <Headset size={20} weight="duotone" style={{marginRight: '8px', color: "var(--text-color)"}}/>
*/}
                    <i className="fa-duotone fa-solid fa-user-headset" style={{ paddingRight:"15px", fontSize: '20px' }}></i>
                    <span className="nav-text">Chat Support</span>
                </button>
                {/*<button
                    type="button"
                    onClick={makeClickHandler('settings')}
                    className={`nav-link settings-button ${selectedPage === 'settings' ? 'active' : ''}`}
                    title="Settings"
                    style={footerButtonStyleFor('settings')}
                >
                    <Gear size={20} weight="duotone" style={{ marginRight: '8px' }} />
                    <span className="nav-text">Settings</span>
                </button>*/}
            </div>
        </aside>
    );
};

export default Sidebar;
