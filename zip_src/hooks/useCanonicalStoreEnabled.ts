/**
 * useCanonicalStoreEnabled - Hook to check if canonical store is enabled
 * 
 * Provides a reactive way to check the canonical store feature flag
 */

import { USE_CANONICAL_STORE } from '@/utils/envFlags';

/**
 * Hook to check if canonical store is enabled
 * 
 * @returns boolean indicating if canonical store should be used
 */
export const useCanonicalStoreEnabled = (): boolean => {
  return USE_CANONICAL_STORE;
};