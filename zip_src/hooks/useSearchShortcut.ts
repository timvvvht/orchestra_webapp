import { useEffect, useRef } from 'react';
import { useKeyboardShortcuts, showNotification } from './useKeyboardShortcuts';
import { useSearchModal } from './useSearchModal';

/**
 * Custom hook to register search-related keyboard shortcuts
 */
export const useSearchShortcut = () => {
  const { registerShortcut } = useKeyboardShortcuts();
  // Import all necessary functions/state from the modal store
  const { open, close, isOpen } = useSearchModal(); 
  const registeredRef = useRef(false);
  
  useEffect(() => {
    // Function to open search modal
    const openSearchModal = () => {
      console.log('Opening search modal');
      open();
      // showNotification('Search'); // Optional: notification when opening
    };
    
    // Function to close search modal on Escape
    const closeSearchModalOnEscape = () => {
      // Check if the modal is actually open before trying to close
      // This access isOpen directly from the hook's closure which has the latest value from useSearchModal
      if (isOpen) { 
        console.log('Closing search modal via Escape key');
        close();
      }
    };

    // Register the shortcuts only once
    if (!registeredRef.current) {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      
      // Register Cmd+K / Ctrl+K to open search
      registerShortcut({
        id: 'open-search',
        key: 'k',
        metaKey: isMac,
        ctrlKey: !isMac,
        description: 'Open search modal',
        group: 'search',
        global: true,
        handler: openSearchModal,
      });
      
      // Register Cmd+Shift+F / Ctrl+Shift+F as an alternative to open search
      registerShortcut({
        id: 'open-search-alt',
        key: 'f',
        metaKey: isMac,
        ctrlKey: !isMac,
        shiftKey: true,
        description: 'Open search modal (alternative)',
        group: 'search',
        global: true,
        handler: openSearchModal,
      });

      // Register Escape key to close search modal
      registerShortcut({
        id: 'close-search-esc',
        key: 'Escape', // Use 'Escape' for the Escape key
        description: 'Close search modal',
        group: 'search',
        global: true, // Ensure it works even when input inside modal is focused
        handler: closeSearchModalOnEscape,
      });
      
      console.log(`Registered search opening shortcuts: ${isMac ? 'Cmd' : 'Ctrl'}+K and ${isMac ? 'Cmd' : 'Ctrl'}+Shift+F`);
      console.log('Registered Escape key to close search modal.');
      registeredRef.current = true;
    }
    
    // useEffect dependencies: if these change, the effect re-runs.
    // registerShortcut is stable. open, close, isOpen are from Zustand, so they are also stable 
    // unless the store itself is recreated, which is unlikely.
  }, [registerShortcut, open, close, isOpen]); 
};
