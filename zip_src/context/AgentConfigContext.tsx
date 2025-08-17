import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { getDefaultACSClient } from '@/services/acs';
import type { ACSAgentConfig } from '@/services/acs/agent-configs';
import type { AgentConfigTS } from '@/types/agentTypes';

/**
 * Convert ACS agent config to Orchestra format for compatibility
 */
function convertACSToOrchestra(acsConfig: ACSAgentConfig): AgentConfigTS {
  return {
    id: acsConfig.id || acsConfig.name,
    name: acsConfig.display_name || acsConfig.name,
    description: acsConfig.description || '',
    version: '1.0',
    agent: {
      name: acsConfig.name,
      description: acsConfig.description || '',
      system_prompt: acsConfig.system_prompt || '',
      avatar: null, // ACS doesn't provide avatars in the current API
      metadata: {
        tags: acsConfig.metadata?.tags || [],
        capabilities: acsConfig.metadata?.capabilities || [],
        skills: acsConfig.metadata?.tags || [] // Map tags to skills for compatibility
      }
    },
    ai_config: {
      model_id: acsConfig.model_id || 'gpt-4',
      provider_name: acsConfig.provider_name || 'openai',
      temperature: acsConfig.temperature || 0.7,
      max_tokens: acsConfig.max_tokens || 2048,
    },
    tool_groups: [], // ACS doesn't expose tool groups in the summary API
    created_at: acsConfig.created_at || new Date().toISOString(),
    updated_at: acsConfig.updated_at || new Date().toISOString(),
    is_public: acsConfig.is_public !== undefined ? acsConfig.is_public : true,
    publisher: 'ACS',
    publisher_id: 'acs-system',
    user_id: acsConfig.user_id || null
  };
}

export interface AgentConfigContextValue {
  // Core data
  agentConfigs: Record<string, AgentConfigTS>;
  agentConfigsArray: AgentConfigTS[];
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAgentConfigs: () => Promise<void>;
  refreshAgentConfigs: () => Promise<void>;
  getAgentConfigById: (id: string) => AgentConfigTS | undefined;
  
  // Extended functionality
  getFeaturedConfigs: () => Promise<AgentConfigTS[]>;
  getCategories: () => Promise<string[]>;
  
  // Cache management
  lastFetchTime: number | null;
  isStale: boolean;
}

const AgentConfigContext = createContext<AgentConfigContextValue | null>(null);

export interface AgentConfigProviderProps {
  children: React.ReactNode;
  // Cache duration in milliseconds (default: 5 minutes)
  cacheDuration?: number;
  // Auto-refresh interval in milliseconds (default: disabled)
  autoRefreshInterval?: number;
}

export function AgentConfigProvider({ 
  children, 
  cacheDuration = 5 * 60 * 1000, // 5 minutes
  autoRefreshInterval 
}: AgentConfigProviderProps) {
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentConfigTS>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Convert configs object to array for compatibility
  const agentConfigsArray = Object.values(agentConfigs).filter(Boolean);

  // Check if data is stale
  const isStale = lastFetchTime ? (Date.now() - lastFetchTime) > cacheDuration : true;

  const fetchAgentConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🤖 [AgentConfigProvider] Fetching agent configs from ACS API...');
      
      const acsClient = getDefaultACSClient();
      const acsConfigs = await acsClient.agentConfigs.getAgentConfigs();
      
      console.log('🤖 [AgentConfigProvider] Received ACS configs:', acsConfigs);
      
      // Convert ACS configs to Orchestra format and create lookup object
      const configsMap: Record<string, AgentConfigTS> = {};
      
      if (Array.isArray(acsConfigs)) {
        acsConfigs.forEach(acsConfig => {
          const orchestraConfig = convertACSToOrchestra(acsConfig);
          configsMap[orchestraConfig.id] = orchestraConfig;
        });
      }
      
      console.log(`🤖 [AgentConfigProvider] Converted ${Object.keys(configsMap).length} configs to Orchestra format`);
      
      setAgentConfigs(configsMap);
      setLastFetchTime(Date.now());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent configs';
      console.error('🤖 [AgentConfigProvider] Error fetching configs:', err);
      setError(errorMessage);
      
      // Provide fallback config to prevent UI breakage
      const fallbackConfig: AgentConfigTS = {
        id: 'general',
        name: 'General Assistant',
        description: 'A helpful AI assistant for general tasks',
        version: '1.0',
        agent: {
          name: 'general',
          description: 'A helpful AI assistant for general tasks',
          system_prompt: 'You are a helpful AI assistant.',
          avatar: null,
          metadata: {
            tags: ['general'],
            capabilities: ['conversation'],
            skills: ['general']
          }
        },
        ai_config: {
          model_id: 'gpt-4',
          provider_name: 'openai',
          temperature: 0.7,
          max_tokens: 2048,
        },
        tool_groups: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: true,
        publisher: 'ACS',
        publisher_id: 'acs-system',
        user_id: null
      };
      
      setAgentConfigs({ 'general': fallbackConfig });
      setLastFetchTime(Date.now());
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAgentConfigs = useCallback(async () => {
    // Force refresh by clearing cache
    setLastFetchTime(null);
    await fetchAgentConfigs();
  }, [fetchAgentConfigs]);

  const getAgentConfigById = useCallback((id: string): AgentConfigTS | undefined => {
    return agentConfigs[id];
  }, [agentConfigs]);

  const getFeaturedConfigs = useCallback(async (): Promise<AgentConfigTS[]> => {
    try {
      console.log('🤖 [AgentConfigProvider] Fetching featured configs...');
      
      const acsClient = getDefaultACSClient();
      const featuredACSConfigs = await acsClient.agentConfigs.getFeaturedAgentConfigs();
      
      const featuredConfigs = featuredACSConfigs.map(convertACSToOrchestra);
      
      console.log(`🤖 [AgentConfigProvider] Found ${featuredConfigs.length} featured configs`);
      
      return featuredConfigs;
      
    } catch (err) {
      console.error('🤖 [AgentConfigProvider] Error fetching featured configs:', err);
      return [];
    }
  }, []);

  const getCategories = useCallback(async (): Promise<string[]> => {
    try {
      console.log('🤖 [AgentConfigProvider] Fetching categories...');
      
      const acsClient = getDefaultACSClient();
      const categories = await acsClient.agentConfigs.getAgentConfigCategories();
      
      console.log(`🤖 [AgentConfigProvider] Found categories:`, categories);
      
      return categories;
      
    } catch (err) {
      console.error('🤖 [AgentConfigProvider] Error fetching categories:', err);
      return ['general'];
    }
  }, []);

  // Auto-fetch on mount or when data is stale
  useEffect(() => {
    if (isStale && !isLoading) {
      fetchAgentConfigs();
    }
  }, [isStale, isLoading, fetchAgentConfigs]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval && autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        if (isStale) {
          fetchAgentConfigs();
        }
      }, autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval, isStale, fetchAgentConfigs]);

  const contextValue: AgentConfigContextValue = {
    agentConfigs,
    agentConfigsArray,
    isLoading,
    error,
    fetchAgentConfigs,
    refreshAgentConfigs,
    getAgentConfigById,
    getFeaturedConfigs,
    getCategories,
    lastFetchTime,
    isStale
  };

  return (
    <AgentConfigContext.Provider value={contextValue}>
      {children}
    </AgentConfigContext.Provider>
  );
}

/**
 * Hook to consume agent config context
 * Provides the same interface as useACSAgentConfigs for easy migration
 */
export function useAgentConfigs(): AgentConfigContextValue {
  console.log('🌍 [AgentConfigContext] useAgentConfigs hook called from context!');
  
  const context = useContext(AgentConfigContext);
  
  console.log('🌍 [AgentConfigContext] Context value:', {
    context_exists: !!context,
    agentConfigs_exists: !!context?.agentConfigs,
    agentConfigs_size: context?.agentConfigs ? Object.keys(context.agentConfigs).length : 'N/A',
    isLoading: context?.isLoading,
    error: context?.error
  });
  
  if (!context) {
    throw new Error('useAgentConfigs must be used within an AgentConfigProvider');
  }
  
  return context;
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useAgentConfigs instead
 */
export const useACSAgentConfigsFromContext = useAgentConfigs;