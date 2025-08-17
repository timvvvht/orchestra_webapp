import { useState, useEffect } from 'react';

const KEY = 'mc.hideMergeConfirmation';

export const useHideMergeConfirm = (): [boolean, (value: boolean) => void] => {
  const [hide, setHideState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setHide = (value: boolean) => {
    try {
      localStorage.setItem(KEY, String(value));
      setHideState(value);
    } catch (error) {
      console.warn('Failed to save merge confirmation preference:', error);
      setHideState(value);
    }
  };

  // Sync with localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === KEY) {
        setHideState(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return [hide, setHide];
};