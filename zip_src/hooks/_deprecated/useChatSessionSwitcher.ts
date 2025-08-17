import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useChatStore } from '@/stores/chatStore';

export const useChatSessionSwitcher = () => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const location = useLocation();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const { sessions } = useChatStore();

  // Check if we're currently on a chat page
  const isOnChatPage = location.pathname.startsWith('/chat/');
  const currentSessionId = isOnChatPage ? location.pathname.split('/chat/')[1] : undefined;

  // Handle opening the switcher
  const openSwitcher = useCallback(() => {
    console.log('[ChatSwitcherDebug] openSwitcher CALLED. Sessions:', Object.keys(sessions).length, 'isOnChatPage:', isOnChatPage); // Added log
    // Only open if we have multiple sessions and we're on a chat page
    if (Object.keys(sessions).length > 1 && isOnChatPage) {
      setIsSwitcherOpen(true);
      setIsCtrlPressed(true);
      console.log('[ChatSwitcherDebug] Switcher OPENED.'); // Added log
    }
  }, [sessions, isOnChatPage]);

  // Handle closing the switcher
  const closeSwitcher = useCallback(() => {
    setIsSwitcherOpen(false);
    setIsCtrlPressed(false);
    console.log('[ChatSwitcherDebug] closeSwitcher CALLED. Switcher CLOSED.'); // Added log
  }, []);

  // Handle session selection
  const handleSessionSelect = useCallback((sessionId: string) => {
    closeSwitcher();
  }, [closeSwitcher]);

  // Register keyboard shortcuts only when on chat page
  useEffect(() => {
    if (!isOnChatPage) return;
    console.log('[ChatSwitcherDebug] useEffect for shortcut registration ENTERED. isOnChatPage:', isOnChatPage); // Added log

    // Detect platform to use appropriate modifier key
    const isMac = navigator.platform.toLowerCase().includes('mac');
    
    // Register Ctrl+Tab (or Cmd+Tab on Mac) shortcut
    registerShortcut({
      id: 'chat-switcher-forward',
      key: 'Tab',
      metaKey: isMac,
      ctrlKey: !isMac,
      description: 'Switch to next chat session',
      group: 'chat',
      global: false, // Only works in chat interface
      handler: openSwitcher,
    });

    // Register Ctrl+Shift+Tab (or Cmd+Shift+Tab on Mac) shortcut
    registerShortcut({
      id: 'chat-switcher-backward',
      key: 'Tab',
      metaKey: isMac,
      ctrlKey: !isMac,
      shiftKey: true,
      description: 'Switch to previous chat session',
      group: 'chat',
      global: false, // Only works in chat interface
      handler: openSwitcher,
    });

    // Cleanup function to unregister shortcuts
    return () => {
      unregisterShortcut('chat-switcher-forward');
      unregisterShortcut('chat-switcher-backward');
      console.log('[ChatSwitcherDebug] Shortcuts UNREGISTERED.'); // Added log
    };
  }, [isOnChatPage, registerShortcut, unregisterShortcut, openSwitcher]);

  // Handle global key events for Ctrl release detection
  useEffect(() => {
    console.log('[ChatSwitcherDebug] useEffect for global key events ENTERED. isSwitcherOpen:', isSwitcherOpen); // Added log
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log(`[ChatSwitcherDebug] KeyDown: ${e.key}, Meta: ${e.metaKey}, Ctrl: ${e.ctrlKey}`); // Added log
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      console.log(`[ChatSwitcherDebug] KeyUp: ${e.key}, isSwitcherOpen_at_keyup_start: ${isSwitcherOpen}`); // Added log
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
        // Close switcher when Ctrl is released
        if (isSwitcherOpen) {
          closeSwitcher();
          console.log('[ChatSwitcherDebug] Ctrl/Meta released, switcher was open, called closeSwitcher.'); // Added log
        }
      }
    };

    // Handle window blur to close switcher if user switches away
    const handleWindowBlur = () => {
      if (isSwitcherOpen) {
        closeSwitcher();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isSwitcherOpen, closeSwitcher]);

  // Close switcher when navigating away from chat pages
  useEffect(() => {
    if (!isOnChatPage && isSwitcherOpen) {
      closeSwitcher();
    }
  }, [isOnChatPage, isSwitcherOpen, closeSwitcher]);

  return {
    isSwitcherOpen,
    currentSessionId,
    isOnChatPage,
    openSwitcher,
    closeSwitcher,
    handleSessionSelect,
    isCtrlPressed,
    sessionCount: Object.keys(sessions).length
  };
};