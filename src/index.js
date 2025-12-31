import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './fonts.css';
import {BillingProvider} from './context/BillingContext';
import {ConfigProvider} from "./pages/ConfigProvider";
import {GoogleOAuthProvider} from '@react-oauth/google';
import { SearchKeyProvider } from './context/SearchKeyContext';
import { NumberFormatProvider } from "./context/NumberFormatContext";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ConfigProvider>
        <GoogleOAuthProvider clientId="642231628593-eso4jie2p3cu670djrtqauq0qh741nk3.apps.googleusercontent.com" useOneTap={false}>
            <BillingProvider>
                <SearchKeyProvider>
                    <NumberFormatProvider>
                    <App/>
                    </NumberFormatProvider>
                </SearchKeyProvider>
            </BillingProvider>
        </GoogleOAuthProvider>
    </ConfigProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
