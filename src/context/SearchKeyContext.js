import React, { createContext, useContext, useState } from 'react';

// Create context (kept private, not exported directly)
const SearchKeyContext = createContext();

// Context provider to wrap your app
export const SearchKeyProvider = ({ children }) => {
    const [searchKey, setSearchKey] = useState('');

    return (
        <SearchKeyContext.Provider value={{ searchKey, setSearchKey }}>
            {children}
        </SearchKeyContext.Provider>
    );
};

// Custom hook to access the context
export const useSearchKey = () => {
    return useContext(SearchKeyContext);
};
