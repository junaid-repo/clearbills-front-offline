import React, { createContext, useContext, useState } from 'react';

// 1. Create the context
const PremiumContext = createContext();

// 2. Create the provider component
export const PremiumProvider = ({ children }) => {
    // This state will hold whether the user is premium or not
    const [isPremium, setIsPremium] = useState(false);

    return (
        <PremiumContext.Provider value={{ isPremium, setIsPremium }}>
            {children}
        </PremiumContext.Provider>
    );
};

// 3. Create the custom hook to access the context
export const usePremium = () => {
    return useContext(PremiumContext);
};