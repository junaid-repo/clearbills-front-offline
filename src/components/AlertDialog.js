// src/components/AlertDialog.js
import React from 'react';
import { useAlert } from '../context/AlertContext';

const AlertDialog = () => {
    const { alert, hideAlert } = useAlert();

    if (!alert) {
        return null;
    }

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(137,137,137,0.64)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        },
        dialog: {
            background: 'white',
            borderRadius: '25px',
            padding: '20px 30px 20px 20px' ,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            textAlign: 'center',
        }
    };

    return (
        <div style={styles.overlay} onClick={hideAlert}>
            <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
                {/* --- Style added here --- */}
                <p style={{ marginBottom: '20px' }}>{alert.message}</p>

                <button className="btn" onClick={hideAlert}>
                    OK
                </button>
            </div>
        </div>
    );
};

export default AlertDialog;