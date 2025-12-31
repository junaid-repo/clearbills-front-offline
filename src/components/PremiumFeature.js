import React from 'react';
import { usePremium } from '../context/PremiumContext';
import { usePremiumModal } from '../context/PremiumModalContext';
import { FaCrown } from 'react-icons/fa';
import './PremiumFeature.css'; // We will create this CSS file next

/**
 * This wrapper handles inline premium features (like buttons).
 * - If user IS premium: It just shows the feature.
 * - If user IS NOT premium: It wraps the feature in a disabled,
 * clickable-to-upgrade component with a crown and tooltip.
 */
const PremiumFeature = ({ children }) => {
    const { isPremium } = usePremium();
    const { openPremiumModal } = usePremiumModal();

    if (isPremium) {
        return <>{children}</>;
    }

    // --- Non-Premium User ---
    return (
        <div className="premium-feature-wrapper" onClick={openPremiumModal} data-tooltip="Premium Feature">
            <div className="premium-feature-icon">
                <FaCrown />
            </div>
            <div className="premium-feature-disabled-child">
                {children}
            </div>
        </div>
    );
};

export default PremiumFeature;