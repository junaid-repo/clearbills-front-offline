// src/components/PremiumBadge.js

import React from 'react';
import { FaCrown } from 'react-icons/fa';

/**
 * This is just a simple, reusable crown icon.
 * You can place this next to menu items, buttons, or titles
 * to mark them as "premium" for all users to see.
 */
const PremiumBadge = () => {
    return (
        <FaCrown
            style={{
                color: '#f59e0b', // Gold
                marginLeft: '8px',
                fontSize: '0.8em'
            }}
        />
    );
};

export default PremiumBadge;