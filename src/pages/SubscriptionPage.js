import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaCrown } from 'react-icons/fa';
import './SubscriptionPage.css'; // We will create this CSS file
import { useConfig } from "./ConfigProvider";
import { usePremium } from '../context/PremiumContext';
import toast from 'react-hot-toast';

const SubscriptionPage = ({ setSelectedPage }) => {
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const { setIsPremium } = usePremium();

    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isYearlyLoading, setIsYearlyLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // --- 1. UPDATED COUNTDOWN STATE ---
    const TOTAL_DURATION = 5000; // 5 seconds in milliseconds
    const [countdown, setCountdown] = useState(TOTAL_DURATION / 1000); // Start at 5
    const [countdownPercent, setCountdownPercent] = useState(100); // For the graph
    // --- END ---

    // --- Calculate Savings ---
    const monthlyPrice = 199;
    const yearlyPrice = 1999;
    const annualCostOfMonthly = monthlyPrice * 12;
    const savings = annualCostOfMonthly - yearlyPrice;
    const savingsPercentage = Math.round((savings / annualCostOfMonthly) * 100);

    // --- 2. UPDATED useEffect for smooth countdown ---
    useEffect(() => {
        let interval;
        if (showSuccessModal) {
            let remainingTime = TOTAL_DURATION;
            setCountdown(remainingTime / 1000);
            setCountdownPercent(100);

            interval = setInterval(() => {
                remainingTime -= 100; // Update every 100ms for smoothness

                // Update text every full second
                if (remainingTime % 1000 === 0) {
                    setCountdown(remainingTime / 1000);
                }

                // Update progress bar
                setCountdownPercent((remainingTime / TOTAL_DURATION) * 100);

                if (remainingTime <= 0) {
                    clearInterval(interval);
                    setIsPremium(true);
                    setShowSuccessModal(false);
                    if (setSelectedPage) {
                        setSelectedPage('dashboard');
                    }
                }
            }, 100); // 100ms interval
        }
        return () => clearInterval(interval);
    }, [showSuccessModal, setIsPremium, setSelectedPage]);


    const handlePayment = async (planType, amount) => {
        if (planType === 'MONTHLY') {
            setIsMonthlyLoading(true);
        } else {
            setIsYearlyLoading(true);
        }

        let subscriptionId = null;

        try {
            // Step 1: Create Subscription Record
            const createSubResponse = await fetch(`${apiUrl}/api/shop/subscription/create`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planType: planType,
                    amount: amount * 100
                }),
            });
            if (!createSubResponse.ok) throw new Error('Failed to create subscription record.');

            // Step 2: Create Razorpay Order
            const orderResponse = await fetch(`${apiUrl}/api/razorpay/create-order`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount * 100, currency: "INR" }),
            });
            if (!orderResponse.ok) throw new Error('Failed to create Razorpay order.');

            const orderData2 = await orderResponse.json(); // This is your variable

            // Step 3: Get Order Details
            const orderData = await createSubResponse.json();
            subscriptionId = orderData.subscriptionId;

            // Step 4: Open Razorpay Gateway
            const options = {
                key: "rzp_test_RM94Bh3gUaJSjZ",
                order_id: orderData2.id,
                amount: orderData2.amount,
                name: "ClearBill Premium",
                description: "Subscription",

                // --- 3. UPDATED HANDLER ---
                handler: async (response) => {

                    // --- FIX 1: SHOW MODAL IMMEDIATELY ---
                    setShowSuccessModal(true);
                    // --- END FIX ---

                    // --- Step F: Verify Payment (runs in background) ---
                    try {
                        const verifyResponse = await fetch(`${apiUrl}/api/shop/subscription/verify`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                subscriptionId: subscriptionId
                            }),
                        });
                        if (!verifyResponse.ok) {
                            // If verification fails, we can show a toast
                            // The modal is already open, so this is just a background check
                            toast.error('Payment verification failed. Please contact support.');
                        }
                    } catch (verifyErr) {
                        console.error("Verification failed:", verifyErr);
                        toast.error('Payment verification failed. Please contact support.');
                    }

                    // --- Step G & H (moved to useEffect) ---
                },
                theme: { color: "#3399cc" },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response) => {
                toast.error(`Payment Failed: ${response.error.description}`);
            });
            rzp.open();

        } catch (err) {
            console.error("Payment flow error:", err);
            toast.error(err.message || "An error occurred. Please try again.");
        } finally {
            setIsMonthlyLoading(false);
            setIsYearlyLoading(false);
        }
    };


    return (
        <>
            {/* --- 4. UPDATED SUCCESS MODAL JSX --- */}
            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal-content">

                        {/* --- NEW Timer/Graph --- */}
                        <div className="countdown-timer">
                            <svg className="countdown-svg" viewBox="0 0 36 36">
                                <path
                                    className="countdown-circle-bg"
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className="countdown-circle-progress"
                                    style={{ strokeDasharray: `${countdownPercent}, 100` }}
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <div className="countdown-text">{countdown}</div>
                        </div>

                        <div className="hurrah-animation">
                            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h2>Hurrah! Payment Successful!</h2>

                        {/* --- NEW Styled Text --- */}


                        <p style={{marginTop: '20px'}}>
                            Redirecting you to the dashboard...
                        </p>
                        <p className="success-modal-detail-email">
                            Your order details have been sent to your registered email id.
                        </p>
                        <p className="success-modal-detail-profile">
                            View subscription details in your profile section.
                        </p>
                    </div>
                </div>
            )}
            {/* --- END MODAL --- */}

            <div className="subscription-page-container">
                <div className="subscription-header">
                    <FaCrown size={48} />
                    <h1>Go Premium</h1>
                    <p>Unlock powerful features to supercharge your business.</p>
                </div>

                <div className="subscription-content">
                    {/* --- Feature List --- */}
                    <div className="features-list-card">
                        <h2>Premium Features Include:</h2>
                        <div className="simple-feature-list">
                            <p><i className="fa-solid fa-circle-check"></i> Unlimited Invoices (removes 20/day limit)</p>
                            <p><i className="fa-solid fa-circle-check"></i> Bulk Product Upload via CSV</p>
                            <p><i className="fa-solid fa-circle-check"></i> Advanced Analytics & Reports</p>
                            <p><i className="fa-solid fa-circle-check"></i> Detailed Customer Insights</p>
                            <p><i className="fa-solid fa-circle-check"></i> Payment Reminders</p>
                            <p><i className="fa-solid fa-circle-check"></i> Priority Email Support</p>
                            <p><i className="fa-solid fa-circle-check"></i> Chat and Ticket based support</p>
                            <p><i className="fa-solid fa-circle-check"></i> All Future Premium Updates</p>
                        </div>
                    </div>

                    {/* --- Plan Options --- */}
                    <div className="plans-container">
                        {/* ... (Monthly and Yearly plan cards) ... */}
                        <div className="plan-card">
                            <div className="plan-header">
                                <h3>Monthly</h3>
                                <p className="plan-price">
                                    ₹{monthlyPrice}
                                    <span>/ month</span>
                                </p>
                            </div>
                            <p className="plan-billed-info">Billed every month</p>
                            <button
                                className="btn-subscribe"
                                onClick={() => handlePayment('MONTHLY', monthlyPrice)}
                                disabled={isMonthlyLoading || isYearlyLoading}
                            >
                                {isMonthlyLoading ? 'Processing...' : 'Choose Monthly'}
                            </button>
                        </div>

                        <div className="plan-card popular">
                            <div className="plan-badge">Best Value</div>
                            <div className="plan-header">
                                <h3>Yearly</h3>
                                <p className="plan-price">
                                    ₹{yearlyPrice}
                                    <span>/ year</span>
                                </p>
                            </div>
                            <p className="plan-billed-info">Billed once per year</p>
                            <button
                                className="btn-subscribe"
                                onClick={() => handlePayment('YEARLY', yearlyPrice)}
                                disabled={isMonthlyLoading || isYearlyLoading}
                            >
                                {isYearlyLoading ? 'Processing...' : 'Choose Yearly'}
                            </button>
                            <p className="plan-savings">
                                Save {savingsPercentage}% (₹{savings}) vs Monthly
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SubscriptionPage;