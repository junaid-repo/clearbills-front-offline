import { useEffect, useCallback } from 'react';

/**
 * A custom hook to easily add keyboard shortcuts (hotkeys) to your components.
 *
 * @param {string} key The key to listen for (e.g., 's', 'Enter', 'F2').
 * @param {function} callback The function to execute when the hotkey is pressed.
 * @param {object} options
 * @param {boolean} [options.ctrlKey=false] - Is the Ctrl key required?
 * @param {boolean} [options.shiftKey=false] - Is the Shift key required?
 * @param {boolean} [options.altKey=false] - Is the Alt key required?
 * @param {boolean} [enabled=true] - Is the hotkey currently active?
 */
const useHotkeys = (key, callback, { ctrlKey = false, shiftKey = false, altKey = false } = {}, enabled = true) => {

    // Memoize the callback to prevent re-binding the event listener on every render
    const memoizedCallback = useCallback(callback, [callback]);

    useEffect(() => {
        // Make sure the hotkey is enabled
        if (!enabled) {
            return;
        }

        const handleKeyDown = (event) => {
            // Check if the pressed key and modifiers match
            if (
                event.key.toLowerCase() === key.toLowerCase() &&
                event.ctrlKey === ctrlKey &&
                event.shiftKey === shiftKey &&
                event.altKey === altKey
            ) {
                // Prevent default browser behavior (e.g., Ctrl+S saving the page)
                event.preventDefault();
                // Run the callback
                memoizedCallback();
            }
        };

        // Add the event listener to the whole document
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup function to remove the listener when the component unmounts
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };

        // Dependencies: Re-run the effect if any of these change
    }, [key, ctrlKey, shiftKey, altKey, memoizedCallback, enabled]);
};

export default useHotkeys;