/**
 * Hook for managing merge confirmation dialog visibility preference
 * Migrated from desktop app - manages localStorage preference for hiding merge confirmation
 */

import { useState, useEffect } from 'react';

export const useHideMergeConfirm = (): [boolean, (value: boolean) => void] => {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    // Load initial value from localStorage
    try {
      const stored = localStorage.getItem('mc.hideMergeConfirmation');
      if (stored !== null) {
        setHide(stored === 'true');
      }
    } catch (error) {
      console.warn('Failed to load merge confirmation preference:', error);
    }
  }, []);

  const setHideValue = (value: boolean) => {
    setHide(value);
    try {
      localStorage.setItem('mc.hideMergeConfirmation', value.toString());
    } catch (error) {
      console.warn('Failed to save merge confirmation preference:', error);
    }
  };

  return [hide, setHideValue];
};