import React from 'react';
import { usePremiumModal } from '../context/PremiumModalContext';
import Modal from './Modal'; // Reuse your existing Modal component
import { FaCrown, FaStar, FaRocket } from 'react-icons/fa';
import {useNavigate} from "react-router-dom";

const PremiumModal = ({setSelectedPage}) => {
    const { isModalOpen, closePremiumModal } = usePremiumModal();
    const navigate = useNavigate();
    const handleUpgradeClick = () => {
        closePremiumModal(); // Close the modal
       // navigate('/subscribe'); // <-- 3. Navigate to the new page
        setSelectedPage('subscribe');
    };
    return (
        // Use your existing Modal component
        <Modal title="Upgrade to Premium" show={isModalOpen} onClose={closePremiumModal}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <FaCrown size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />

                <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Unlock All Features!</h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-color-secondary)', margin: '16px 0' }}>
                    Get access to powerful tools by upgrading to a Premium plan.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: '30px 0' }}>
                    <li style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '1.1rem',
                        marginBottom: '15px'
                    }}>
                        <i className="fa-duotone fa-solid fa-rocket-launch"></i>
                        <span>Bulk CSV Product Uploads</span>
                    </li>
                    <li style={{
                        display: 'flex',
                        alignItems: 'center', gap: '12px', fontSize: '1.1rem', marginBottom: '15px'
                    }}>
                        <i className="fa-duotone fa-solid fa-chart-mixed"></i>
                        <span>Advanced Analytics & Reports</span>
                    </li>
                    <li style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem'}}>
                        <i className="fa-duotone fa-solid fa-infinity"></i>
                        <span>Unlimited Invoices</span>
                    </li>
                </ul>

                <button
                    className="btn"
                    style={{ width: '100%', fontSize: '1.1rem', padding: '12px 0' }}
                    onClick={handleUpgradeClick} // <-- 4. Use the new handler
                >
                    Buy Premium
                </button>
            </div>
        </Modal>
    );
};

export default PremiumModal;