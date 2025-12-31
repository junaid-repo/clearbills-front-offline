// NumberFormatContext.js
import React, { createContext, useContext } from "react";

const NumberFormatContext = createContext((num) => num);

export const NumberFormatProvider = ({ children }) => {
    const format = (num) =>
        new Intl.NumberFormat("en-IN").format(num);

    return (
        <NumberFormatContext.Provider value={format}>
            {children}
        </NumberFormatContext.Provider>
    );
};

export const useNumberFormat = () => useContext(NumberFormatContext);
