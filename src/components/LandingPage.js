import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Carousel } from 'react-responsive-carousel';
import { ToastContainer, toast } from 'react-toastify';

// Import required CSS files
import './LandingPage.css';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import 'react-toastify/dist/ReactToastify.css';

const LandingPage = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
    });

    const [errors, setErrors] = useState({});

    const handleLoginNav = () => {
        navigate('/login');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Clear error on change
        if (errors[name]) {
            setErrors({ ...errors, [name]: null });
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!formData.phone) newErrors.phone = 'Phone is required';
        if (!formData.subject) newErrors.subject = 'Subject is required';
        if (!formData.message) newErrors.message = 'Message is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            // --- MOCK API CALL ---
            // In a real app, you'd send data to your backend here
            console.log('Form Data Submitted:', formData);

            // Show success toast
            toast.success('Message sent successfully!');

            // Reset form
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: '',
            });
            setErrors({});
        } else {
            toast.error('Please correct the errors in the form.');
        }
    };

    return (
        <div className="landing-page">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            {/* 1. Sticky Header */}
            <header className="landing-header">
                <div className="logo">ClearBills</div>
                <nav className="landing-nav">
                    <a href="#home">Home</a>
                    <a href="#features">Features</a>
                    <a href="#demo">Demo</a>
                    <a href="#contact">Contact Us</a>
                </nav>
                <div className="auth-buttons">
                    <button className="btn btn-secondary" onClick={handleLoginNav}>Login</button>
                    <button className="btn" onClick={handleLoginNav}>Register</button>
                </div>
            </header>

            <main>
                {/* 2. Carousel Section */}
                <section id="home" className="landing-section">
                    <Carousel
                        showThumbs={false}
                        autoPlay={true}
                        infiniteLoop={true}
                        showStatus={false}
                        className="main-carousel"
                    >
                        <div className="slide-content">

                            <div className="slide-text">
                                <h2>Works on Any Device</h2>
                                <p>Access your billing data from your desktop, tablet, or smartphone. Your data is always in sync.</p>
                                <button className="btn" onClick={handleLoginNav}>Sign Up Free</button>
                            </div>
                            <div className="slide-image">
                                <img src="LandingPageImages/Dashboard.png" alt="Billing Dashboard" />
                            </div>
                        </div>
                        <div className="slide-content">
                            <div className="slide-text">
                                <h2>Inventory Management</h2>
                                <p>Track stock levels in real-time. Get low-stock alerts and manage your products all in one place.</p>
                                <button className="btn" onClick={handleLoginNav}>Explore Features</button>
                            </div>
                            <div className="slide-image">
                                <img src="LandingPageImages/inventorymangement.png" alt="Inventory Tracking" />
                            </div>
                        </div>
                        <div className="slide-content">
                            <div className="slide-text">
                                <h2>Powerful GST Billing</h2>
                                <p>Create professional GST-compliant invoices in seconds. Manage clients, track payments, and file reports with ease.</p>
                                <button className="btn" onClick={handleLoginNav}>Get Started Now</button>
                            </div>
                            <div className="slide-image">
                                <img src="LandingPageImages/gstInvoiceShopkeeper.png" alt="Mobile Access" />
                            </div>
                        </div>
                    </Carousel>
                </section>

                {/* 3. Features Grid Section */}
                <section id="features" className="landing-section glass-card">
                    <h2 className="section-title">All The Features You Need</h2>
                    <div className="features-grid">
                        <ul>
                            <li><i className="fa-solid fa-check-circle"></i> Professional GST Invoicing</li>
                            <li><i className="fa-solid fa-check-circle"></i> Customer Management</li>
                            <li><i className="fa-solid fa-check-circle"></i> Product & Service Catalog</li>
                            <li><i className="fa-solid fa-check-circle"></i> Stock & Inventory Control</li>
                            <li><i className="fa-solid fa-check-circle"></i> Purchase Order Management</li>
                            <li><i className="fa-solid fa-check-circle"></i> Payment Reminders</li>
                        </ul>
                        <ul>
                            <li><i className="fa-solid fa-check-circle"></i> Detailed Sales Reports</li>
                            <li><i className="fa-solid fa-check-circle"></i> Data Backup & Restore</li>
                            <li><i className="fa-solid fa-check-circle"></i> Share Invoices on WhatsApp</li>
                            <li><i className="fa-solid fa-check-circle"></i> Thermal Printer Support</li>
                            <li><i className="fa-solid fa-check-circle"></i> Barcode Scanning</li>
                            <li><i className="fa-solid fa-check-circle"></i> 24/7 Customer Support</li>
                        </ul>
                    </div>
                </section>

                {/* 4. Demo Video Section */}
                <section id="demo" className="landing-section">
                    <h2 className="section-title">Watch ClearBills in Action</h2>
                    <div className="video-container">
                        <iframe
                            src="https://www.youtube.com/embed/NK4kMvhujPQ" // <-- Replace with your demo video ID
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </section>

                {/* 5. Why Choose Us Section */}
                <section id="why-us" className="landing-section">
                    <h2 className="section-title">Why You Should Use ClearBills</h2>
                    <div className="why-us-grid">
                        <div className="why-us-item">
                            <i className="fa-duotone fa-shield-halved"></i>
                            <h3>Safe</h3>
                            <p>Your data is protected with bank-grade 256-bit SSL encryption. We never access your data without permission.</p>
                        </div>
                        <div className="why-us-item">
                            <i className="fa-duotone fa-face-smile"></i>
                            <h3>Simple</h3>
                            <p>Our intuitive interface is designed for business owners, not accountants. Get started in minutes, no training required.</p>
                        </div>
                        <div className="why-us-item">
                            <i className="fa-duotone fa-bolt"></i>
                            <h3>Fast</h3>
                            <p>Create and send invoices in under 30 seconds. Our cloud-based platform is optimized for speed and performance.</p>
                        </div>
                        <div className="why-us-item">
                            <i className="fa-duotone fa-lock"></i>
                            <h3>Secure</h3>
                            <p>With daily automated backups and secure cloud infrastructure, your valuable business data is always safe and accessible.</p>
                        </div>
                    </div>
                </section>

                {/* 6. Contact Us Section */}
                <section id="contact" className="landing-section glass-card">
                    <h2 className="section-title">Get In Touch</h2>
                    <div className="contact-grid">
                        <form className="contact-form" onSubmit={handleSubmit} noValidate>
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className={errors.name ? 'input-error' : ''} />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className={errors.email ? 'input-error' : ''} />
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone</label>
                                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className={errors.phone ? 'input-error' : ''} />
                                {errors.phone && <span className="error-message">{errors.phone}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="subject">Subject</label>
                                <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleInputChange} className={errors.subject ? 'input-error' : ''} />
                                {errors.subject && <span className="error-message">{errors.subject}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="message">Message</label>
                                <textarea id="message" name="message" rows="5" value={formData.message} onChange={handleInputChange} className={errors.message ? 'input-error' : ''}></textarea>
                                {errors.message && <span className="error-message">{errors.message}</span>}
                            </div>
                            <button type="submit" className="btn">Send Message</button>
                        </form>

                    </div>
                </section>
            </main>
        </div>
    );
};

export default LandingPage;