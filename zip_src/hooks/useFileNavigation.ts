import { useState, useCallback } from 'react';
import { fileNavigationService, NavigationOptions } from '@/utils/fileNavigation';

export interface UseFileNavigationReturn {
  navigateToFile: (identifier: string, options?: NavigationOptions) => Promise<void>;
  isNavigating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * React hook for file navigation with loading states and error handling
 * @returns File navigation utilities and state
 */
export const useFileNavigation = (): UseFileNavigationReturn => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateToFile = useCallback(async (
    identifier: string, 
    options: NavigationOptions = {}
  ) => {
    setIsNavigating(true);
    setError(null);
    
    try {
      console.log('[useFileNavigation] Navigating to:', identifier);
      await fileNavigationService.navigateToFile(identifier, {
        showErrorToast: true,
        ...options
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[useFileNavigation] Navigation failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsNavigating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    navigateToFile,
    isNavigating,
    error,
    clearError
  };
};

/**
 * Hook for creating vault links
 * @returns Utilities for creating and handling vault links
 */
export const useVaultLinks = () => {
  const createVaultLink = useCallback((pathOrNodeId: string) => {
    return fileNavigationService.createVaultLink(pathOrNodeId);
  }, []);

  const extractFromVaultLink = useCallback((vaultUrl: string) => {
    return fileNavigationService.extractFromVaultLink(vaultUrl);
  }, []);

  return {
    createVaultLink,
    extractFromVaultLink
  };
};