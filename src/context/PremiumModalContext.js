import React, { createContext, useContext, useState } from 'react';

// 1. Create the context
const PremiumModalContext = createContext();

// 2. Create the provider
export const PremiumModalProvider = ({ children }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Functions to be shared
    const openPremiumModal = () => setIsModalOpen(true);
    const closePremiumModal = () => setIsModalOpen(false);

    return (
        <PremiumModalContext.Provider value={{ isModalOpen, openPremiumModal, closePremiumModal }}>
            {children}
        </PremiumModalContext.Provider>
    );
};

// 3. Create the custom hook
export const usePremiumModal = () => {
    return useContext(PremiumModalContext);
};