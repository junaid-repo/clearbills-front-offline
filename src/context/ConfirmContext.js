// src/context/ConfirmContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
    const [confirmationState, setConfirmationState] = useState(null);

    const showConfirm = useCallback((message) => {
        return new Promise((resolve) => {
            setConfirmationState({
                message,
                resolve, // Store the promise's resolve function
            });
        });
    }, []);

    const handleClose = useCallback((choice) => {
        if (confirmationState) {
            confirmationState.resolve(choice); // Resolve the promise with true or false
            setConfirmationState(null); // Close the dialog
        }
    }, [confirmationState]);

    const value = { showConfirm, handleClose, confirmationState };

    return (
        <ConfirmContext.Provider value={value}>
            {children}
        </ConfirmContext.Provider>
    );
};