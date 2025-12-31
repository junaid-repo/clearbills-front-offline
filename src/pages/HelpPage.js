// src/pages/HelpPage.js
import React from 'react';
import { FaWhatsapp } from 'react-icons/fa'; // ✅ WhatsApp icon
import './DashboardPage.css'; // reuse styling

const HelpPage = ({ setSelectedPage }) => {
    const faqStyle = {
        marginBottom: '20px', // space between questions
    };

    const questionStyle = {
        fontWeight: '600',
        fontSize: '16px'

    };

    const answerStyle = {
        marginLeft: '25px', // indent
        fontSize: '14px',

        marginTop: '6px'
    };



    return (
        <div className="dashboard">
            <h2>Help & Support</h2>

            <div className="glass-card" style={{ padding: '30px', lineHeight: '1.8' }}>
                {/* FAQs Section */}
                <h3>Frequently Asked Questions (FAQs)</h3>
                <div style={{ marginLeft: '15px', marginTop: '20px' }}>

                    <div style={faqStyle}>
                        <h5 style={questionStyle}>Q1: How do I register for Clear Bill?</h5>
                        <p style={answerStyle}>You can register at <a href="https://web.clearbills.info">clearbills.info</a> using your email.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q2: Is Clear Bill free to use?</p>
                        <p style={answerStyle}>Yes, Clear Bill provides free features with optional premium upgrades.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q3: How do I generate an invoice?</p>
                        <p style={answerStyle}>Go to the <em>Billing</em> section, add customer and product details, then click "Generate Invoice".</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q4: Can I export reports?</p>
                        <p style={answerStyle}>Yes, reports can be exported as PDF or Excel files.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q5: Is my data safe?</p>
                        <p style={answerStyle}>We use encryption and secure servers to protect your data.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q6: Can multiple users access one account?</p>
                        <p style={answerStyle}>Yes, Clear Bill supports multi-user access with role management.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q7: How do I reset my password?</p>
                        <p style={answerStyle}>Use the "Forgot Password" option on the login page to reset your password.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q8: Can I add multiple shops?</p>
                        <p style={answerStyle}>Yes, you can manage multiple shops under one account.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q9: Does Clear Bill work offline?</p>
                        <p style={answerStyle}>Currently, Clear Bill requires an internet connection for syncing data.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q10: Can I customize invoices?</p>
                        <p style={answerStyle}>Yes, you can add your shop details, logo, and GST information to invoices.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q11: Does it support multiple currencies?</p>
                        <p style={answerStyle}>Currently, Clear Bill supports INR. More currencies will be added in future updates.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q12: How can I view sales analytics?</p>
                        <p style={answerStyle}>Navigate to the <em>Analytics</em> section to view sales trends and charts.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q13: Can I manage stock levels?</p>
                        <p style={answerStyle}>Yes, Clear Bill provides inventory management to track product stock.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q14: Does Clear Bill support GST calculation?</p>
                        <p style={answerStyle}>Yes, GST is auto-calculated based on the percentage you set for each product.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q15: Can I send invoices via email?</p>
                        <p style={answerStyle}>Yes, invoices can be directly emailed to customers.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q16: Does it support online payments?</p>
                        <p style={answerStyle}>Yes, you can track online payment modes in the app.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q17: Can I export customer lists?</p>
                        <p style={answerStyle}>Yes, customer data can be exported from the <em>Customers</em> section.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q18: Is there mobile app support?</p>
                        <p style={answerStyle}>A mobile app is under development and will be released soon.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q19: Can I integrate Clear Bill with other systems?</p>
                        <p style={answerStyle}>API support is planned in upcoming releases for third-party integrations.</p>
                    </div>

                    <div style={faqStyle}>
                        <p style={questionStyle}>Q20: How do I contact support?</p>
                        <p style={answerStyle}>You can reach us via email, phone, or WhatsApp as listed below.</p>
                    </div>
                </div>

                {/* Support Contact Section */}
                <h3 style={{ marginTop: '30px' }}>Need More Help?</h3>
                <p style={{ marginLeft: '15px' }}>
                    If your query is not covered above, please contact us:
                </p>
                <ul style={{ marginLeft: '35px', marginTop: '10px' }}>
                    <li>📧 Email: <a href="mailto:admin@clearbills.info">admin@clearbills.info</a></li>
                    <li>📞 Phone: +91-9876543210</li>
                    <li>
                        <FaWhatsapp style={{ color: 'green' }} /> WhatsApp:
                        <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
                            +91-9876543210
                        </a>
                    </li>
                </ul>

                <p style={{ marginTop: '20px', fontSize: '14px', color: '#555' }}>
                    Our support team is available <strong>Monday to Saturday, 9 AM – 7 PM (IST)</strong>.
                </p>
            </div>
        </div>
    );
};

export default HelpPage;
