/**
 * React Hook for Agent Configurations - Webapp Stub Implementation
 * 
 * This is a stub implementation for the webapp migration. The original desktop
 * version used AgentConfigContext which may not be fully implemented in the webapp yet.
 * 
 * TODO: Implement full AgentConfigContext and useAgentConfigs when needed
 */

import { useState, useEffect } from 'react';

// Stub interface matching the desktop version
export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  ai_config?: {
    model_id?: string;
  };
  // Add other properties as needed
}

export interface UseAgentConfigsResult {
  /** Agent configs as a map (id -> config) */
  agentConfigs: Record<string, AgentConfig>;
  /** Agent configs as an array */
  agentConfigsArray: AgentConfig[];
  /** Whether configs are currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Refresh the agent configs */
  refresh?: () => void;
}

/**
 * Hook for accessing agent configurations
 * STUB IMPLEMENTATION - Returns empty configs for webapp
 */
export function useAgentConfigs(): UseAgentConfigsResult {
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentConfig>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Stub implementation - could load from API in the future
    console.log('🤖 [useAgentConfigs] STUB: Would load agent configs from API', {
      note: 'Agent configs not implemented in webapp - returning empty configs'
    });

    setIsLoading(false);
    setError(null);
    setAgentConfigs({});
  }, []);

  const agentConfigsArray = Object.values(agentConfigs);

  const refresh = () => {
    console.log('🤖 [useAgentConfigs] STUB: Would refresh agent configs');
    // Stub - no actual refresh logic
  };

  return {
    agentConfigs,
    agentConfigsArray,
    isLoading,
    error,
    refresh,
  };
}

// Re-export with alternative name for compatibility
export const useACSAgentConfigs = useAgentConfigs;