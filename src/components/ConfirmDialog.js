// src/components/ConfirmDialog.js
import React from 'react';
import { useConfirm } from '../context/ConfirmContext';

const ConfirmDialog = () => {
    const { confirmationState, handleClose } = useConfirm();

    if (!confirmationState) {
        return null;
    }

    // Basic styles
    const styles = {
        overlay: { /* ... same as AlertDialog ... */ },
        dialog: { /* ... same as AlertDialog ... */ },
        buttonContainer: {
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
            marginTop: '20px',
        },
        confirmButton: {
            padding: '10px 25px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: '#28a745', // Green for confirm
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
        },
        cancelButton: {
            padding: '10px 25px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            backgroundColor: 'white',
            color: '#333',
            cursor: 'pointer',
            fontSize: '16px',
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <p>{confirmationState.message}</p>
                <div style={styles.buttonContainer}>
                    <button style={styles.cancelButton} onClick={() => handleClose(false)}>
                        Cancel
                    </button>
                    <button style={styles.confirmButton} onClick={() => handleClose(true)}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;