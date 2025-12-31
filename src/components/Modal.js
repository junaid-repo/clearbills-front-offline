// src/components/Modal.js
import React, { useEffect, useRef } from 'react'; // No changes here
import { FaTimes } from 'react-icons/fa'; // No changes here

const Modal = ({ show, onClose, title, children }) => {
    const modalRef = useRef(null);

    // --- FIX 1: Store onClose in a ref ---
    // This ref will hold the *latest* version of the onClose function
    // without causing the main effect to re-run.
    const onCloseRef = useRef(onClose);

    // --- FIX 2: Update the ref when onClose changes ---
    // This small effect runs when onClose changes, keeping the ref fresh.
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // This is the query to find all focusable elements
    const focusableQuery = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // This effect handles all keyboard interaction for the modal
    useEffect(() => {
        if (!show) {
            return;
        }

        const lastFocusedElement = document.activeElement;

        const handleKeyDown = (e) => {
            // 1. Handle Escape key
            if (e.key === 'Escape') {
                // --- FIX 3: Call the ref's current value ---
                // This guarantees we always call the latest function.
                onCloseRef.current();
                return;
            }

            // 2. Handle Tab key (the focus trap)
            if (e.key === 'Tab') {
                if (!modalRef.current) return;

                // Find all focusable elements within the modal
                const focusableElements = Array.from(modalRef.current.querySelectorAll(focusableQuery));
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // --- Focus the first element inside the modal when it opens ---
        const focusTimer = setTimeout(() => {
            if (modalRef.current) {
                const firstInBody = modalRef.current.querySelector(
                    '.modal-body ' + focusableQuery
                );

                if (firstInBody) {
                    firstInBody.focus();
                } else {
                    const firstInModal = modalRef.current.querySelector(focusableQuery);
                    if (firstInModal) {
                        firstInModal.focus();
                    } else {
                        modalRef.current.focus();
                    }
                }
            }
        }, 100);

        // Cleanup function
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            clearTimeout(focusTimer);
            lastFocusedElement?.focus();
        };

        // --- FIX 4: Remove onClose from the dependency array ---
        // Now, this entire effect only runs when `show` changes!
    }, [show]);

    if (!show) {
        return null;
    }

    // Your JSX remains exactly the same
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                tabIndex="-1"
            >
                <div className="modal-header">
                    <h2 id="modal-title">{title}</h2>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;