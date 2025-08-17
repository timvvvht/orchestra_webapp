/**
 * useEventTapDebug - Hook for managing event tap debug overlay
 * 
 * Provides state management and keyboard shortcuts for the debug overlay.
 * Only active when VITE_EVENT_TAP=true environment variable is set.
 */

import { useState, useEffect } from 'react';

const isEnabled = import.meta.env.VITE_EVENT_TAP === 'true';

export function useEventTapDebug() {
  const [isVisible, setIsVisible] = useState(false);

  // Keyboard shortcut to toggle debug overlay (Ctrl+Shift+E for "Events")
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Console command to toggle debug overlay
  useEffect(() => {
    if (!isEnabled) return;

    // Expose debug controls to window for console access
    (window as any).eventTapDebug = {
      show: () => setIsVisible(true),
      hide: () => setIsVisible(false),
      toggle: () => setIsVisible(prev => !prev),
      isVisible: () => isVisible
    };

    return () => {
      delete (window as any).eventTapDebug;
    };
  }, [isVisible]);

  const toggle = () => setIsVisible(prev => !prev);
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return {
    isEnabled,
    isVisible,
    toggle,
    show,
    hide
  };
}