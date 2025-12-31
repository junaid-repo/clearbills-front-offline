// src/components/PremiumGuard.js

import React from 'react';
import { usePremium } from './PremiumContext'; // Adjust path if needed
import { FaCrown } from 'react-icons/fa'; // Import a crown icon

/**
 * This component "guards" a feature.
 * - If the user IS premium, it shows the children (the feature).
 * - If the user IS NOT premium, it shows a "premium block" with a crown.
 */
const PremiumGuard = ({ children }) => {
    const { isPremium } = usePremium();

    if (isPremium) {
        // 2. User is premium, show the feature "normally"
        return <>{children}</>;
    }

    // 1. User is not premium, show the "crown icon" block
    return (
        <div className="premium-block-wrapper">
            <div className="premium-block-icon">
                <FaCrown size={24} color="#f59e0b" />
            </div>
            <h3>This is a Premium Feature</h3>
            <p>Upgrade your account to unlock this content.</p>
            <button className="upgrade-button">Upgrade Now</button>
        </div>
    );
};

export default PremiumGuard;