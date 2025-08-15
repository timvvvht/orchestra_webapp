/**
 * Browser environment detection
 * Safe to use at module top-level
 */
export const isBrowser =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof navigator !== 'undefined';