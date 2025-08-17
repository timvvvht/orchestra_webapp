// src/hooks/useNavigationShortcuts.tsx
// ❌ Old: registered Cmd+1/2/3/N globally
// ✅ New: empty stub (does nothing)

import { useEffect } from 'react';

/**
 * NO-OP navigation shortcuts.
 * Global Cmd+1/2/3/N are disabled.
 * Mission Control should register its own shortcuts elsewhere.
 */
export const useNavigationShortcuts = () => {
  useEffect(() => {
    if (import.meta.env.DEV)
      console.log('[Keyboard] Navigation shortcuts disabled (legacy)');
  }, []);
};