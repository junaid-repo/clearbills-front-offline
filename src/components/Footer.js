// src/components/Footer.js
import React from 'react';

const Footer = ({ setSelectedPage }) => {
    const handleClick = (page) => {
        if (setSelectedPage) setSelectedPage(page);
    };

    return (
        <footer className="footer" style={{
            borderTop: '1px solid var(--border-color, #e6e6e6)',
            background: 'var(--footer-bg, transparent)',
            padding: '6px 16px',
            fontSize: '0.85rem',
            color: 'var(--text-color)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <button onClick={() => handleClick('terms')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Terms &amp; Conditions</button>
                <span style={{ opacity: 0.5 }}>|</span>
                <button onClick={() => handleClick('privacy')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Privacy Policy</button>
                <span style={{ opacity: 0.5 }}>|</span>
                <button onClick={() => handleClick('help')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Help &amp; Support</button>
            </div>
        </footer>
    );
};

export default Footer;

