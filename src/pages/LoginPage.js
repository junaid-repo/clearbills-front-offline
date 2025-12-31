import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { useConfig } from "./ConfigProvider";
import { GoogleLogin } from '@react-oauth/google';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import AssessmentIcon from '@mui/icons-material/Assessment';

const LoginPage = ({ onLogin }) => {
    // Login
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Unified modal controller: null | 'forgot' | 'otp' | 'result' | 'register'
    const [modal, setModal] = useState(null);

    // --- New States for Policy Modal ---
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [policyContent, setPolicyContent] = useState({ title: '', content: '' });

    // Forgot password flow
    const [forgotInput, setForgotInput] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotAttempts, setForgotAttempts] = useState(0);

    // OTP + reset flow (Only for Forgot Password now)
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpError, setOtpError] = useState('');

    // Final result
    const [resultMessage, setResultMessage] = useState('');

    const navigate = useNavigate();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";
    const [resendTimer, setResendTimer] = useState(0);
    const [retryCount, setRetryCount] = useState(null);

    // --- NEW STATES FOR REGISTER FLOW ---
    const [registerData, setRegisterData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [registerMessage, setRegisterMessage] = useState("");

    // new state for Google error feedback
    const [googleError, setGoogleError] = useState('');

    // --- Generic Policy Content ---
    const termsText = (
        <>
            <p className="mb-4">Welcome to Clear Bill! These terms and conditions outline the rules and regulations for the use of our services.</p>
            <h3 className="text-lg font-bold mb-2">1. Acceptance of Terms</h3>
            <p className="mb-4">By accessing and using our service, you accept and agree to be bound by the terms and provision of this agreement.</p>
            <h3 className="text-lg font-bold mb-2">2. User Accounts</h3>
            <p className="mb-4">You are responsible for safeguarding your account details, and you are responsible for all activities that occur under your account.</p>
        </>
    );

    const privacyText = (
        <>
            <p className="mb-4">Your privacy is important to us. It is Clear Bill's policy to respect your privacy regarding any information we may collect from you.</p>
            <h3 className="text-lg font-bold mb-2">1. Information We Collect</h3>
            <p className="mb-4">We only ask for personal information when we truly need it to provide a service to you.</p>
        </>
    );

    // Feature list for the showcase
    const features = [
        {
            icon: <DashboardIcon style={{ fontSize: 36, color: "#3b82f6" }} />,
            title: 'Analytics Dashboard',
            description: 'Visualize your sales, profits, and growth with our intuitive dashboard.'
        },
        {
            icon: <Inventory2Icon style={{ fontSize: 36, color: "#f59e0b" }} />,
            title: 'Stock Management',
            description: 'Effortlessly track inventory, manage stock levels, and get low-stock alerts.'
        },
        {
            icon: <PeopleAltIcon style={{ fontSize: 36, color: "#10b981" }} />,
            title: 'Customer Management',
            description: 'Build strong customer relationships with a centralized database and history.'
        },
        {
            icon: <ReceiptLongIcon style={{ fontSize: 36, color: "#6366f1" }} />,
            title: 'Effortless Billing',
            description: 'Create and send professional invoices in seconds. Billing made simple.'
        },
        {
            icon: <PaymentIcon style={{ fontSize: 36, color: "#ef4444" }} />,
            title: 'Payment Tracking',
            description: 'Manage all incoming payments, track dues, and send reminders easily.'
        },
        {
            icon: <AssessmentIcon style={{ fontSize: 36, color: "#8b5cf6" }} />,
            title: 'Report Generation',
            description: 'Generate detailed sales, stock, and financial reports with just a click.'
        },
    ];

    // --- Handlers for Policy Modal ---
    const openPolicyModal = (type) => {
        if (type === 'terms') {
            setPolicyContent({ title: 'Terms of Service', content: termsText });
        } else {
            setPolicyContent({ title: 'Privacy Policy', content: privacyText });
        }
        setShowPolicyModal(true);
    };

    const closePolicyModal = () => setShowPolicyModal(false);

    // --- HELPERS TO OPEN/CLOSE ---
    const openRegisterModal = () => {
        setRegisterData({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
        setRegisterMessage("");
        setModal("register");
    };
    const closeRegisterModal = () => {
        setModal(null);
        setRegisterMessage("");
    };

    // ✅ MODIFIED: useEffect now only handles retry counts for Forgot Password OTP
    useEffect(() => {
        let interval;
        // Only run logic for forgot password otp
        if (modal === 'otp') {
            setResendTimer(60);
            interval = setInterval(() => {
                setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
            }, 1000);

            // Fetch retry count for forgot password
            if (forgotInput) {
                const fetchRetry = async () => {
                    try {
                        const res = await fetch(`${authApiUrl}/auth/otp-retry-count?username=${forgotInput}`);
                        const data = await res.json();
                        setRetryCount(data.retryLeft ?? null);
                    } catch (err) {
                        console.error("Retry count fetch error:", err);
                        setRetryCount(null);
                    }
                };
                fetchRetry();
            }
        }
        return () => clearInterval(interval);
    }, [modal, forgotInput, authApiUrl]);

    // ---------- GOOGLE LOGIN HANDLER -------------
    const handleGoogleSuccess = async (credentialResponse) => {
        const idToken = credentialResponse?.credential;
        if (!idToken) {
            setGoogleError("Google did not return a credential/token");
            return;
        }
        try {
            const resp = await fetch(authApiUrl + "/auth/new/google/user", {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                onLogin(true);
                navigate('/');
            } else {
                setGoogleError(data.message || "Google Login failed");
            }
        } catch (err) {
            setGoogleError("Google Login error: " + err.message);
        }
    };

    const handleGoogleError = () => {
        setGoogleError("Google Login was cancelled or failed");
    };

    // --- HANDLE REGISTER API CALL (UPDATED: NO OTP) ---
    const handleRegister = async () => {
        const { fullName, email, phone, password, confirmPassword } = registerData;
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            setRegisterMessage("❌ All fields are required");
            return;
        }
        if (password !== confirmPassword) {
            setRegisterMessage("❌ Passwords do not match");
            return;
        }

        try {
            const res = await fetch(authApiUrl + "/auth/register/newuser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerData)
            });
            const data = await res.json();

            if (data.success) {
                // ✅ DIRECT SUCCESS: No OTP modal
                setIsSuccess(true);
                setModal(null); // Close register modal
                const registeredUsername = data.username || email;
                openResultModal(`✅ Registration Successful!\n\nYour Username is: ${registeredUsername}`);
            } else {
                setRegisterMessage("❌ " + (data.message || "Registration failed"));
            }
        } catch (err) {
            setRegisterMessage("❌ Error: " + err.message);
        }
    };

    // ---------- LOGIN ----------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(authApiUrl + "/auth/authenticate", {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const textResponse = await response.text();

            if (textResponse === "Please login using google login") {
                setError(textResponse);
                return;
            }

            if (textResponse) {
                onLogin(true);
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        }
    };

    // Helpers to open/close specific modals
    const openForgotModal = () => {
        setForgotMessage('');
        setModal('forgot');
    };

    const closeForgotModal = () => {
        setForgotMessage('');
        setModal(null);
    };

    const openOtpModal = () => {
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpError('');
        setModal('otp');
    };

    const closeOtpModal = () => {
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpError('');
        setModal(null);
    };

    const openResultModal = (message) => {
        setResultMessage(message);
        setModal('result');
    };

    const closeResultModal = () => {
        setResultMessage('');
        setModal(null);
    };

    // ---------- FORGOT PASSWORD ----------
    const handleForgotPassword = async () => {
        if (!forgotInput) {
            setForgotMessage("❌ Please enter Email or UserId");
            return;
        }

        if (forgotAttempts >= 5) {
            setForgotMessage("❌ Too many attempts. Please try again later.");
            return;
        }

        setForgotAttempts(prev => prev + 1);

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status) {
                setForgotMessage("✅ OTP sent to your email address");
                setModal(null);
                openOtpModal();
            } else {
                setForgotMessage(`❌ ${data.message || "Invalid request"}`);
            }
        } catch (err) {
            setForgotMessage("❌ Error: " + err.message);
        }
    };

    const handleResendPasswordOtp = async () => {
        setOtpError('');
        if (!forgotInput) {
            setOtpError("User identifier is missing. Please start over.");
            return;
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status) {
                setOtpError("✅ A new OTP has been sent.");
                setResendTimer(60);
            } else {
                setOtpError(`❌ ${data.message || "Failed to resend OTP"}`);
            }
        } catch (err) {
            setOtpError("❌ Error: " + err.message);
        }
    };


    // ---------- RESET PASSWORD ----------
    const handlePasswordReset = async () => {
        if (!otp || !newPassword || !confirmPassword) {
            setOtpError("❌ All fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            setOtpError("❌ Passwords do not match");
            return;
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            otp,
            newPassword,
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/update-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setIsSuccess(true);
                closeOtpModal();
                openResultModal("✅ " + (data.message || "Password updated successfully!"));
            } else {
                setOtp('');
                setOtpError("❌ " + (data.message || "Wrong OTP, try again."));

                // Re-fetch retry count for password reset flow
                if (forgotInput) {
                    const updatedRetryCountRes = await fetch(`${authApiUrl}/auth/otp-retry-count?username=${forgotInput}`);
                    const updatedRetryData = await updatedRetryCountRes.json();
                    const retriesLeft = updatedRetryData.retryLeft;
                    setRetryCount(retriesLeft);

                    if (retriesLeft <= 0) {
                        setModal(null);
                        openResultModal("❌ Too many wrong OTP attempts. Please resend OTP.");
                    }
                }
            }
        } catch (err) {
            setOtpError("❌ Error: " + err.message);
        }
    };

    return (
        <>
            <div className="login-page-wrapper">
                <div className="shape shape1"></div>
                <div className="shape shape2"></div>

                <div className="main-container">
                    {/* Feature Showcase Section */}
                    <div className="features-container">
                        <h1 className="brand-logo">ClearBills</h1>
                        <p className="tagline">Streamline Your Business Operations</p>
                        <ul className="feature-list">
                            {features.map((feature, index) => (
                                <li
                                    key={index}
                                    className={`feature-item ${index % 2 === 0 ? "left" : "right"}`}
                                >
                                    <div className="feature-icon">{feature.icon}</div>
                                    <div className="feature-text">
                                        <h3>{feature.title}</h3>
                                        <p>{feature.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Login Form Section */}
                    <div className="login-container">
                        <div className="login-box">
                            <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center" style={{paddingBottom: "30px"}}>Welcome Back!</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="input-group">
                                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                                </div>
                                <div className="input-group">
                                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                    <a href="#" onClick={openForgotModal} className="forgot-password-link" style={{marginTop: "45px"}}>Forgot Password?</a>
                                </div>
                                {error && <p className="error-message">{error}</p>}
                                <button type="submit" className="btn login-btn" style={{marginTop: "24px", marginBottom: "0px"}}>Login</button>
                                <p className="terms-text" style={{marginBottom: "45px", marginTop: "10px"}}>
                                    By logging in, you agree to our <br />
                                    <span onClick={() => openPolicyModal('terms')}>Terms</span> & <span onClick={() => openPolicyModal('privacy')}>Privacy Policy</span>.
                                </p>
                            </form>
                            <div className="login-actions">
                                <button className="btn register-btn" onClick={openRegisterModal}>Register</button>
                                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} shape="pill" />
                            </div>
                            {googleError && <p className="error-message" style={{ marginTop: "1rem" }}>{googleError}</p>}
                        </div>
                    </div>
                </div>

                {/* Policy Modal */}
                {showPolicyModal && (
                    <div className="modal-overlay" onClick={closePolicyModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{policyContent.title}</h2>
                                <button className="close-btn" onClick={closePolicyModal}>&times;</button>
                            </div>
                            <div style={{ padding: '0 10px', textAlign: 'left', overflowY: 'auto', maxHeight: '60vh', lineHeight: '1.6' }}>
                                {policyContent.content}
                            </div>
                        </div>
                    </div>
                )}


                {/* Forgot Password Modal */}
                {modal === 'forgot' && (
                    <div className="modal-overlay" onClick={closeForgotModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Forgot Password</h2>
                                <button className="close-btn" onClick={closeForgotModal}>&times;</button>
                            </div>
                            <div className="form-group">
                                <label>Enter Email or User ID</label>
                                <input
                                    type="text"
                                    value={forgotInput}
                                    onChange={(e) => setForgotInput(e.target.value)}
                                    placeholder="Email or UserId"
                                />
                            </div>
                            {forgotMessage && (
                                <p className="error-message" style={{ color: forgotMessage.startsWith("✅") ? "green" : "red" }}>
                                    {forgotMessage}
                                </p>
                            )}
                            <div className="form-actions">
                                <button className="btn" onClick={handleForgotPassword}>Send OTP</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Registration Modal */}
                {modal === "register" && (
                    <div className="modal-overlay" onClick={closeRegisterModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Create Account</h2>
                                <button className="close-btn" onClick={closeRegisterModal}>&times;</button>
                            </div>
                            <div className="form-group"><input type="text" placeholder="Full Name" value={registerData.fullName} onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}/></div>
                            <div className="form-group"><input type="email" placeholder="Email" value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} /></div>
                            <div className="form-group"><input type="tel" placeholder="Phone"
                                                               maxLength="10"
                                                               pattern="[5-9][0-9]{9}"
                                                               title="Phone number must be 10 digits and start with 5, 6, 7, 8, or 9"
                                                               value={registerData.phone} onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })} /></div>
                            <div className="form-group"><input type="password" placeholder="Password" value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} /></div>
                            <div className="form-group"><input type="password" placeholder="Confirm Password" value={registerData.confirmPassword} onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })} /></div>
                            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }} >
                                <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                                <label htmlFor="terms">I agree to the <span onClick={() => setShowTermsModal(true)} style={{ color: 'var(--theme-color)', textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</span></label>
                            </div>
                            {registerMessage && <p className="error-message" style={{ color: registerMessage.startsWith("✅") ? "green" : "red" }}>{registerMessage}</p>}
                            <div className="form-actions"><button className="btn" onClick={handleRegister} disabled={!termsAccepted}>Register</button></div>
                        </div>
                    </div>
                )}

                {/* ✅ Forgot Password OTP & Reset Password Modal */}
                {modal === 'otp' && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Reset Password</h2>
                                <button className="close-btn" onClick={closeOtpModal}>×</button>
                            </div>
                            <div className="form-group">
                                <label>Enter 6-digit OTP</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.5rem" }}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                                {/* Now displays dynamic retry count from backend */}
                                {retryCount !== null && (
                                    <small style={{ opacity: 0.7 }}>
                                        Attempts left: {retryCount}
                                    </small>
                                )}
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                            {otpError && (
                                <p className="error-message" style={{ color: otpError.startsWith("✅") ? "green" : "red", marginTop: "1rem" }}>
                                    {otpError}
                                </p>
                            )}
                            <div className="form-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "1rem" }}>
                                <button className="btn" onClick={handlePasswordReset}>Submit</button>
                                <button className="btn" disabled={resendTimer > 0} onClick={handleResendPasswordOtp}>
                                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Result Modal */}
                {modal === 'result' && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ textAlign: "center" }}>
                            <h2 style={{ color: isSuccess ? "green" : "red" }}>
                                {/* Preserve line breaks in message */}
                                {resultMessage.split('\n').map((str, i) => <p key={i}>{str}</p>)}
                            </h2>
                            <div className="form-actions" style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
                                {/* Only show Resend OTP if it's the Forgot Password flow failure */}
                                {resultMessage.includes("Too many wrong OTP") && (
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            closeResultModal();
                                            openForgotModal();
                                        }}
                                    >
                                        Resend OTP
                                    </button>
                                )}
                                <button className="btn" onClick={closeResultModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default LoginPage;