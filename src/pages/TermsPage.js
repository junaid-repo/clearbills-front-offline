// src/pages/TermsPage.js
import React from 'react';
import './DashboardPage.css'; // ✅ reuse styling

const TermsPage = ({ setSelectedPage }) => {
    return (
        <div className="dashboard">
            <h2>Terms & Conditions</h2>

            <div className="glass-card" style={{ padding: '30px', lineHeight: '1.8' }}>
                <p>
                    Welcome to <strong>Clear Bill</strong> (<a href="https://web.clearbills.info">clearbills.info</a>).
                    These Terms & Conditions govern your use of our billing and invoicing application. By registering
                    with your email and using our services, you agree to comply fully with the terms outlined below.
                </p>

                <h3 style={{ marginTop: '20px' }}>1. Acceptance of Terms</h3>
                <p style={{ marginLeft: '15px' }}>
                    By accessing or using Clear Bill, you confirm that you have read, understood, and agreed to these
                    Terms & Conditions. If you disagree with any part of these Terms, you must stop using the service
                    immediately.
                </p>

                <h3 style={{ marginTop: '20px' }}>2. User Registration</h3>
                <p style={{ marginLeft: '15px' }}>
                    To access our services, users are required to register with a valid email address. You are solely
                    responsible for safeguarding your login credentials and for any actions performed under your
                    account. Sharing accounts is strictly prohibited.
                </p>

                <h3 style={{ marginTop: '20px' }}>3. Services Provided</h3>
                <p style={{ marginLeft: '15px' }}>
                    Clear Bill offers tools for billing, invoicing, sales tracking, stock management, and revenue
                    analytics. We may enhance, modify, or discontinue any part of the services at our discretion, with
                    or without prior notice.
                </p>

                <h3 style={{ marginTop: '20px' }}>4. User Responsibilities</h3>
                <ul style={{ marginLeft: '35px' }}>
                    <li>Provide accurate, complete, and up-to-date information when registering.</li>
                    <li>Use Clear Bill only for lawful business purposes.</li>
                    <li>Refrain from attempting to gain unauthorized access to other users' accounts or data.</li>
                    <li>Maintain your own backups of important financial and billing data.</li>
                    <li>Immediately notify Clear Bill of any unauthorized use of your account.</li>
                </ul>

                <h3 style={{ marginTop: '20px' }}>5. Payments & Subscriptions</h3>
                <p style={{ marginLeft: '15px' }}>
                    Certain features may be available through paid subscriptions. By subscribing, you agree to pay all
                    applicable fees as described at the time of purchase. Subscription charges are non-refundable
                    except as required by applicable law. Renewal of subscriptions is automatic unless canceled prior
                    to the renewal date.
                </p>

                <h3 style={{ marginTop: '20px' }}>6. Data Privacy & Security</h3>
                <p style={{ marginLeft: '15px' }}>
                    Your privacy is important to us. We collect and process personal and business data in accordance
                    with our Privacy Policy. While we use industry-standard practices to protect your information, you
                    acknowledge that no method of online transmission or storage is 100% secure.
                </p>

                <h3 style={{ marginTop: '20px' }}>7. Intellectual Property</h3>
                <p style={{ marginLeft: '15px' }}>
                    All intellectual property rights related to Clear Bill, including logos, trademarks, software, and
                    documentation, remain the sole property of Clear Bill. You are granted a limited, non-transferable
                    license to use the platform for your business operations.
                </p>

                <h3 style={{ marginTop: '20px' }}>8. Limitation of Liability</h3>
                <p style={{ marginLeft: '15px' }}>
                    Clear Bill is provided "as is" and without any warranties. We are not liable for indirect, incidental,
                    or consequential damages, including but not limited to loss of revenue, profits, or data resulting
                    from the use of our services.
                </p>

                <h3 style={{ marginTop: '20px' }}>9. Termination of Service</h3>
                <p style={{ marginLeft: '15px' }}>
                    We reserve the right to suspend or terminate your account if you breach these Terms, misuse the
                    platform, or engage in fraudulent or illegal activities. You may also terminate your account at any
                    time by contacting support.
                </p>

                <h3 style={{ marginTop: '20px' }}>10. Governing Law</h3>
                <p style={{ marginLeft: '15px' }}>
                    These Terms shall be governed by and construed under the laws of your jurisdiction. Any disputes
                    shall be resolved through arbitration or courts as applicable under local regulations.
                </p>

                <h3 style={{ marginTop: '20px' }}>11. Changes to Terms</h3>
                <p style={{ marginLeft: '15px' }}>
                    We may update these Terms & Conditions periodically to reflect changes in our services or
                    business practices. Continued use of Clear Bill after updates constitutes acceptance of the revised
                    Terms.
                </p>

                <h3 style={{ marginTop: '20px' }}>12. Contact Information</h3>
                <p style={{ marginLeft: '15px' }}>
                    For questions regarding these Terms & Conditions, please contact us at
                    <a href="mailto:admin@clearbills.info"> admin@clearbills.info</a>.
                </p>
            </div>
        </div>
    );
};

export default TermsPage;
