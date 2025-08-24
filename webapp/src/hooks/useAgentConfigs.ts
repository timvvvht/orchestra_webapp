/**
 * React Hook for Agent Configurations - ACS Integration
 * 
 * Provides agent configurations from the ACS service with proper error handling
 * and fallback configurations for archived sessions.
 */

import { useState, useEffect, useCallback } from 'react';
import { getDefaultACSClient } from '@/services/acs';
import type { ACSAgentConfig } from '@/services/acs/agent-configs';

// Interface matching the desktop version
export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  ai_config?: {
    model_id?: string;
  };
  display_name?: string;
  model_id?: string;
  provider_name?: string;
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
 * Convert ACS agent config to local format
 */
function convertACSConfig(acsConfig: ACSAgentConfig): AgentConfig {
  return {
    id: acsConfig.id,
    name: acsConfig.name,
    description: acsConfig.description,
    display_name: acsConfig.display_name,
    model_id: acsConfig.model_id,
    provider_name: acsConfig.provider_name,
    ai_config: {
      model_id: acsConfig.model_id,
    },
  };
}

/**
 * Get fallback agent configurations when ACS is not available
 */
function getFallbackConfigs(): Record<string, AgentConfig> {
  const fallbackConfigs: AgentConfig[] = [
    {
      id: 'general',
      name: 'general',
      description: 'General purpose AI assistant',
      display_name: 'General Assistant',
      model_id: 'gpt-4',
      provider_name: 'openai',
      ai_config: {
        model_id: 'gpt-4',
      },
    },
    {
      id: 'coding',
      name: 'coding',
      description: 'Specialized coding assistant',
      display_name: 'Coding Assistant',
      model_id: 'gpt-4',
      provider_name: 'openai',
      ai_config: {
        model_id: 'gpt-4',
      },
    },
  ];

  return fallbackConfigs.reduce((acc, config) => {
    acc[config.id] = config;
    acc[config.name] = config; // Also index by name for compatibility
    return acc;
  }, {} as Record<string, AgentConfig>);
}

/**
 * Hook for accessing agent configurations
 * Loads from ACS service with fallback support
 */
export function useAgentConfigs(): UseAgentConfigsResult {
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentConfig>>(() => getFallbackConfigs());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 [useAgentConfigs] Loading agent configs from ACS...');
      
      const acsClient = getDefaultACSClient();
      const acsConfigs = await acsClient.agentConfigs.getAgentConfigs();
      
      console.log('🤖 [useAgentConfigs] Loaded configs from ACS:', acsConfigs);
      
      // Convert ACS configs to local format and create lookup map
      const configMap: Record<string, AgentConfig> = {};
      
      acsConfigs.forEach(acsConfig => {
        const config = convertACSConfig(acsConfig);
        configMap[config.id] = config;
        configMap[config.name] = config; // Also index by name for compatibility
      });
      
      // Ensure we always have fallback configs available
      const fallbackConfigs = getFallbackConfigs();
      Object.keys(fallbackConfigs).forEach(key => {
        if (!configMap[key]) {
          configMap[key] = fallbackConfigs[key];
        }
      });
      
      setAgentConfigs(configMap);
      console.log('🤖 [useAgentConfigs] Successfully loaded agent configs:', Object.keys(configMap));
      
    } catch (err) {
      console.error('🤖 [useAgentConfigs] Failed to load agent configs from ACS:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agent configs');
      
      // Use fallback configs on error
      const fallbackConfigs = getFallbackConfigs();
      setAgentConfigs(fallbackConfigs);
      console.log('🤖 [useAgentConfigs] Using fallback configs due to error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const agentConfigsArray = Object.values(agentConfigs).filter((config, index, array) => {
    // Remove duplicates (since we index by both id and name)
    return array.findIndex(c => c.id === config.id) === index;
  });

  const refresh = useCallback(() => {
    console.log('🤖 [useAgentConfigs] Refreshing agent configs...');
    loadConfigs();
  }, [loadConfigs]);

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