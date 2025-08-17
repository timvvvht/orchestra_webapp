/**
 * useGlobalServices - React hook for interacting with global services
 * 
 * Provides:
 * - Service status monitoring
 * - Manual service control
 * - Health check triggers
 * - Error handling and recovery
 */

import { useState, useEffect, useCallback } from 'react';
import { globalServiceManager } from '@/services/GlobalServiceManager';

interface ServiceStatus {
  isRunning: boolean;
  isHealthy: boolean;
  reconnectAttempts: number;
  lastHealthCheck: number;
  uptime: number;
  errorCount?: number;
  lastError?: string;
}

interface GlobalServicesState {
  isInitialized: boolean;
  orchestrator: ServiceStatus;
  firehose: {
    isConnected: boolean;
    connectionType: string;
    reconnectAttempts: number;
  };
  timestamp: number;
}

interface UseGlobalServicesReturn {
  // State
  status: GlobalServicesState | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  restart: () => Promise<void>;
  forceHealthCheck: () => void;
  resetCounters: () => void;
  refresh: () => void;
  
  // Computed
  isHealthy: boolean;
  isAllRunning: boolean;
  hasErrors: boolean;
}

/**
 * Hook for monitoring and controlling global services
 */
export const useGlobalServices = (options: {
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}): UseGlobalServicesReturn => {
  const { autoRefresh = true, refreshInterval = 5000 } = options;
  
  const [status, setStatus] = useState<GlobalServicesState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh status from global service manager
  const refresh = useCallback(() => {
    try {
      const currentStatus = globalServiceManager.getStatus();
      setStatus(currentStatus);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to get global service status:', err);
    }
  }, []);

  // Restart all services
  const restart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await globalServiceManager.restart();
      refresh(); // Refresh status after restart
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart services';
      setError(errorMessage);
      console.error('Failed to restart global services:', err);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // Force health check on orchestrator
  const forceHealthCheck = useCallback(() => {
    try {
      const orchestrator = (globalServiceManager as any).orchestrator;
      if (orchestrator?.forceHealthCheck) {
        orchestrator.forceHealthCheck();
        // Refresh status after a short delay to see the results
        setTimeout(refresh, 1000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to force health check';
      setError(errorMessage);
      console.error('Failed to force health check:', err);
    }
  }, [refresh]);

  // Reset error counters and reconnect attempts
  const resetCounters = useCallback(() => {
    try {
      const orchestrator = (globalServiceManager as any).orchestrator;
      if (orchestrator?.resetCounters) {
        orchestrator.resetCounters();
        refresh(); // Refresh to show updated counters
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset counters';
      setError(errorMessage);
      console.error('Failed to reset counters:', err);
    }
  }, [refresh]);

  // Auto-refresh effect
  useEffect(() => {
    // Initial refresh
    refresh();

    if (!autoRefresh) return;

    // Set up interval for auto-refresh
    const interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  }, [refresh, autoRefresh, refreshInterval]);

  // Computed values
  const isHealthy = status ? 
    status.orchestrator.isHealthy && status.firehose.isConnected : false;
  
  const isAllRunning = status ? 
    status.orchestrator.isRunning && status.firehose.isConnected : false;
  
  const hasErrors = status ? 
    (status.orchestrator.errorCount || 0) > 0 || !!status.orchestrator.lastError : false;

  return {
    // State
    status,
    isLoading,
    error,
    
    // Actions
    restart,
    forceHealthCheck,
    resetCounters,
    refresh,
    
    // Computed
    isHealthy,
    isAllRunning,
    hasErrors
  };
};

/**
 * Hook for simple service health monitoring
 */
export const useServiceHealth = () => {
  const { status, isHealthy, isAllRunning, hasErrors } = useGlobalServices({
    autoRefresh: true,
    refreshInterval: 10000 // Check every 10 seconds
  });

  return {
    isHealthy,
    isAllRunning,
    hasErrors,
    orchestratorUptime: status?.orchestrator.uptime || 0,
    firehoseConnected: status?.firehose.isConnected || false,
    lastError: status?.orchestrator.lastError
  };
};

/**
 * Hook for service diagnostics (development only)
 */
export const useServiceDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const getDiagnostics = useCallback(() => {
    try {
      const orchestrator = (globalServiceManager as any).orchestrator;
      if (orchestrator?.getDiagnostics) {
        const diag = orchestrator.getDiagnostics();
        setDiagnostics(diag);
        return diag;
      }
    } catch (error) {
      console.error('Failed to get diagnostics:', error);
    }
    return null;
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      getDiagnostics();
      
      // Refresh diagnostics every 30 seconds in development
      const interval = setInterval(getDiagnostics, 30000);
      return () => clearInterval(interval);
    }
  }, [getDiagnostics]);

  return {
    diagnostics,
    refresh: getDiagnostics
  };
};

export default useGlobalServices;
