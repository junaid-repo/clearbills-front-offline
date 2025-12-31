// src/pages/PrivacyPage.js
import React from 'react';
import './DashboardPage.css'; // ✅ reuse styling

const PrivacyPage = ({ setSelectedPage }) => {
    return (
        <div className="dashboard">
            <h2>Privacy Policy</h2>

            <div className="glass-card" style={{ padding: '30px', lineHeight: '1.8' }}>
                <p>
                    At <strong>Clear Bill</strong> (<a href="https://web.clearbills.info">clearbills.info</a>), your privacy is our top priority.
                    This Privacy Policy explains how we collect, use, and protect your personal and business information when you register
                    and use our billing application.
                </p>

                <h3 style={{ marginTop: '20px' }}>1. Information We Collect</h3>
                <p style={{ marginLeft: '15px' }}>
                    When you register and use Clear Bill, we may collect the following types of information:
                </p>
                <ul style={{ marginLeft: '35px' }}>
                    <li>Personal details such as your name, email address, and phone number.</li>
                    <li>Business details such as invoices, sales records, product data, and customer information.</li>
                    <li>Technical data including device information, browser type, IP address, and usage statistics.</li>
                    <li>Payment details when subscribing to premium services (handled securely through third-party providers).</li>
                </ul>

                <h3 style={{ marginTop: '20px' }}>2. How We Use Your Information</h3>
                <p style={{ marginLeft: '15px' }}>
                    The data we collect is used to provide and improve our services. Specifically, we use your information to:
                </p>
                <ul style={{ marginLeft: '35px' }}>
                    <li>Enable account registration and secure login.</li>
                    <li>Generate invoices, manage sales, and track financial performance.</li>
                    <li>Send service-related updates, notifications, and customer support communications.</li>
                    <li>Enhance system security, prevent fraud, and improve user experience.</li>
                </ul>

                <h3 style={{ marginTop: '20px' }}>3. Data Storage & Security</h3>
                <p style={{ marginLeft: '15px' }}>
                    We use industry-standard encryption and security measures to protect your data. While we take all reasonable precautions,
                    you acknowledge that no method of internet transmission or storage can be guaranteed 100% secure. Users are encouraged
                    to maintain backups of critical business data.
                </p>

                <h3 style={{ marginTop: '20px' }}>4. Sharing of Information</h3>
                <p style={{ marginLeft: '15px' }}>
                    Clear Bill does not sell or rent your personal data. We may share information only in the following cases:
                </p>
                <ul style={{ marginLeft: '35px' }}>
                    <li>With trusted third-party service providers who help us operate the platform.</li>
                    <li>To comply with legal obligations, court orders, or enforceable government requests.</li>
                    <li>To protect the rights, property, and safety of Clear Bill, our users, or the public.</li>
                </ul>

                <h3 style={{ marginTop: '20px' }}>5. Cookies & Tracking</h3>
                <p style={{ marginLeft: '15px' }}>
                    Our website and application may use cookies and similar tracking technologies to improve your browsing experience,
                    analyze usage, and personalize features. You may disable cookies through your browser settings, but some features
                    may not function properly without them.
                </p>

                <h3 style={{ marginTop: '20px' }}>6. User Rights</h3>
                <p style={{ marginLeft: '15px' }}>
                    You have the right to access, update, or delete your personal information at any time. To exercise these rights,
                    please contact us at <a href="mailto:admin@clearbills.info">admin@clearbills.info</a>.
                    We will respond to requests within a reasonable timeframe.
                </p>

                <h3 style={{ marginTop: '20px' }}>7. Data Retention</h3>
                <p style={{ marginLeft: '15px' }}>
                    We retain your information for as long as your account is active or as needed to provide services. After termination,
                    we may retain minimal data for compliance, dispute resolution, and legal requirements.
                </p>

                <h3 style={{ marginTop: '20px' }}>8. Third-Party Links</h3>
                <p style={{ marginLeft: '15px' }}>
                    Clear Bill may include links to third-party websites. We are not responsible for the privacy practices or content
                    of those websites. We encourage you to review the privacy policies of external sites before sharing your data.
                </p>

                <h3 style={{ marginTop: '20px' }}>9. Changes to Privacy Policy</h3>
                <p style={{ marginLeft: '15px' }}>
                    We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.
                    Any updates will be posted on <a href="https://web.clearbills.info">clearbills.info</a>, and continued use of the
                    service constitutes acceptance of the revised policy.
                </p>

                <h3 style={{ marginTop: '20px' }}>10. Contact Us</h3>
                <p style={{ marginLeft: '15px' }}>
                    If you have questions or concerns about this Privacy Policy, please contact us at:
                    <br />
                    📧 <a href="mailto:admin@clearbills.info">admin@clearbills.info</a>
                </p>
            </div>
        </div>
    );
};

export default PrivacyPage;
