// context/BillingContext.js
import { createContext, useContext, useReducer, useEffect, useCallback } from "react";

const BillingContext = createContext();
export const useBilling = () => useContext(BillingContext);

const BILLING_SESSION_KEY = 'billingContextState';

// 1. Define the default state
const initialState = {
    selectedCustomer: null,
    cart: [],
    paymentMethod: 'CASH',
    products: [], // This is transient search data, won't be saved
    payingAmount: 0,
    isPayingAmountManuallySet: false,
    useGstinBill: false,
    gstinNumber: "",
    useCustomerGstin: false,
};

// 2. Create a "lazy initializer" to load state from session storage
const loadState = () => {
    try {
        const savedState = sessionStorage.getItem(BILLING_SESSION_KEY);
        if (savedState) {
            // Parse the saved state and reset transient data like 'products'
            return { ...JSON.parse(savedState), products: [] };
        }
    } catch (e) {
        console.error("Failed to load billing state from session storage", e);
        sessionStorage.removeItem(BILLING_SESSION_KEY);
    }
    // Return default state if nothing is saved
    return initialState;
};

// 3. Create a reducer to handle all state changes
const billingReducer = (state, action) => {
    switch (action.type) {
        case 'LOAD_PRODUCTS':
            return { ...state, products: action.payload };

        case 'ADD_PRODUCT': {
            const product = action.payload;
            if (product.stock <= 0) return state; // No stock, no change

            const existing = state.cart.find(item => item.id === product.id);
            let newCart;
            if (existing) {
                // Increment quantity
                newCart = state.cart.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                // Add new item
                newCart = [...state.cart, { ...product, quantity: 1, details: product.details || '' }];
            }
            return { ...state, cart: newCart };
        }

        case 'REMOVE_PRODUCT':
            return {
                ...state,
                cart: state.cart.filter(item => item.id !== action.payload.productId)
            };

        case 'UPDATE_CART_ITEM':
            return {
                ...state,
                cart: state.cart.map(item =>
                    item.id === action.payload.productId
                        ? { ...item, ...action.payload.changes }
                        : item
                )
            };

        case 'CLEAR_BILL':
            // Reset to default, but keep the 'products' list
            return { ...initialState, products: state.products };

        case 'SET_CUSTOMER':
            return { ...state, selectedCustomer: action.payload };

        case 'SET_PAYMENT_METHOD':
            return { ...state, paymentMethod: action.payload };

        case 'SET_PAYING_AMOUNT':
            return {
                ...state,
                payingAmount: action.payload // Any manual set triggers this
            };

        case 'SET_MANUAL_PAY_FLAG':
            return { ...state, isPayingAmountManuallySet: action.payload };

        case 'SET_USE_GSTIN_BILL':
            return { ...state, useGstinBill: action.payload };

        case 'SET_GSTIN_NUMBER':
            return { ...state, gstinNumber: action.payload };

        case 'SET_USE_CUSTOMER_GSTIN':
            return { ...state, useCustomerGstin: action.payload };

        default:
            return state;
    }
};

// 4. Create the provider
export const BillingProvider = ({ children }) => {

    // 5. Use the reducer, passing the 'loadState' function as the initializer
    // This runs ONCE on load, before the component renders
    const [state, dispatch] = useReducer(billingReducer, null, loadState);

    // 6. Use useEffect to SAVE state to session storage on *every* change
    useEffect(() => {
        // We don't need to save the 'products' search list,
        // so we destructure it out before saving.
        const { products, ...stateToSave } = state;
        sessionStorage.setItem(BILLING_SESSION_KEY, JSON.stringify(stateToSave));
    }, [state]); // This dependency array saves on ANY state change

    // 7. Define dispatch functions (memoized with useCallback)
    const loadProducts = useCallback((productList) => {
        dispatch({ type: 'LOAD_PRODUCTS', payload: productList });
    }, []);

    const addProduct = useCallback((product) => {
        dispatch({ type: 'ADD_PRODUCT', payload: product });
    }, []);

    const removeProduct = useCallback((productId) => {
        dispatch({ type: 'REMOVE_PRODUCT', payload: { productId } });
    }, []);

    const updateCartItem = useCallback((productId, changes) => {
        dispatch({ type: 'UPDATE_CART_ITEM', payload: { productId, changes } });
    }, []);

    const clearBill = useCallback(() => {
        dispatch({ type: 'CLEAR_BILL' });
    }, []);

    const setSelectedCustomer = useCallback((customer) => {
        dispatch({ type: 'SET_CUSTOMER', payload: customer });
    }, []);

    const setPaymentMethod = useCallback((method) => {
        dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
    }, []);

    const setPayingAmount = useCallback((amount) => {
        dispatch({ type: 'SET_PAYING_AMOUNT', payload: amount });
    }, []);

    const setIsPayingAmountManuallySet = useCallback((isManual) => {
        dispatch({ type: 'SET_MANUAL_PAY_FLAG', payload: isManual });
    }, []);

    const setUseGstinBill = useCallback((value) => {
        dispatch({ type: 'SET_USE_GSTIN_BILL', payload: value });
    }, []);

    const setGstinNumber = useCallback((value) => {
        dispatch({ type: 'SET_GSTIN_NUMBER', payload: value });
    }, []);

    const setUseCustomerGstin = useCallback((value) => {
        dispatch({ type: 'SET_USE_CUSTOMER_GSTIN', payload: value });
    }, []);

    // 8. Define the context value
    // This no longer needs useMemo because 'state' is a stable object
    // and all functions are wrapped in useCallback.
    const value = {
        // State values
        selectedCustomer: state.selectedCustomer,
        cart: state.cart,
        paymentMethod: state.paymentMethod,
        products: state.products,
        payingAmount: state.payingAmount,
        isPayingAmountManuallySet: state.isPayingAmountManuallySet,
        useGstinBill: state.useGstinBill,
        gstinNumber: state.gstinNumber,
        useCustomerGstin: state.useCustomerGstin,

        // Setter functions
        setSelectedCustomer,
        addProduct,
        removeProduct,
        setPaymentMethod,
        clearBill,
        loadProducts,
        updateCartItem,
        setPayingAmount,
        setIsPayingAmountManuallySet,
        setUseGstinBill,
        setGstinNumber,
        setUseCustomerGstin
    };

    return (
        <BillingContext.Provider value={value}>
            {children}
        </BillingContext.Provider>
    );
};