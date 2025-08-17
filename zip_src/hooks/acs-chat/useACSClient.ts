import { useMemo, useState, useCallback } from 'react';
import { createOrchestACSClient, getDefaultACSClient } from '@/services/acs';
import type { OrchestACSClient } from '@/services/acs';

export interface UseACSClientOptions {
  customClient?: OrchestACSClient;
  streamingServiceFactory?: () => any;
}

export interface UseACSClientReturn {
  acsClient: OrchestACSClient;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  getHealthStatus: () => Promise<any>;
}

/**
 * Hook for managing ACS client instance and initialization
 * Handles client creation, initialization, and health checking
 */
export const useACSClient = (options: UseACSClientOptions = {}): UseACSClientReturn => {
  const { customClient, streamingServiceFactory } = options;
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Get or create ACS client
  const acsClient = useMemo(() => {
    if (customClient) {
      return customClient;
    }

    // If we have a custom streaming service factory, create a custom client
    if (streamingServiceFactory) {
      console.log('🎭 [useACSClient] Creating custom ACS client with streaming service factory');
      return createOrchestACSClient({}, streamingServiceFactory);
    }

    return getDefaultACSClient();
  }, [customClient, streamingServiceFactory]);

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      console.log('🚀 [G1] useACSClient.initialize() START');
      console.log('🚀 [G1] ACS client token:', acsClient.getAuthToken()?.slice(0, 15) + '...');
      // Add any client-specific initialization here
      setIsInitialized(true);
      console.log('✅ [G1] useACSClient.initialize() SUCCESS - clientInitialized=true');
    } catch (error) {
      console.error('❌ [G1] useACSClient.initialize() FAILED:', error);
      throw error;
    }
  }, [isInitialized, acsClient]);

  const getHealthStatus = useCallback(async () => {
    return acsClient.getHealthStatus();
  }, [acsClient]);

  return {
    acsClient,
    isInitialized,
    initialize,
    getHealthStatus
  };
};