// Hook for using ACS Agent Configurations in non-chat components
// This provides a lightweight interface for components like landing pages
// that need to display and select agent configurations

import { useState, useEffect, useCallback } from 'react';
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

export interface UseACSAgentConfigsReturn {
  agentConfigs: Record<string, AgentConfigTS>;
  agentConfigsArray: AgentConfigTS[];
  isLoading: boolean;
  error: string | null;
  fetchAgentConfigs: () => Promise<void>;
  getAgentConfigById: (id: string) => AgentConfigTS | undefined;
  getFeaturedConfigs: () => Promise<AgentConfigTS[]>;
  getCategories: () => Promise<string[]>;
}

/**
 * Hook for accessing ACS agent configurations in landing pages and other components
 * Provides a similar interface to the legacy useAgentConfigStore but uses ACS API
 */
export const useACSAgentConfigs = (): UseACSAgentConfigsReturn => {
  console.log('🚀 [useACSAgentConfigs] Hook called! Starting initialization...');
  
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentConfigTS>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🚀 [useACSAgentConfigs] State initialized:', {
    agentConfigs_size: Object.keys(agentConfigs).length,
    isLoading,
    error
  });

  // Convert configs object to array for compatibility
  const agentConfigsArray = Object.values(agentConfigs).filter(Boolean);

  const fetchAgentConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🤖 [useACSAgentConfigs] Fetching agent configs from ACS API...');
      console.log('🤖 [useACSAgentConfigs] Current state before fetch:', {
        agentConfigs_size: Object.keys(agentConfigs).length,
        isLoading,
        error
      });
      
      const acsClient = getDefaultACSClient();
      const acsConfigs = await acsClient.agentConfigs.getAgentConfigs();
      
      console.log('🤖 [useACSAgentConfigs] Received ACS configs:', acsConfigs);
      
      // Convert ACS configs to Orchestra format and create lookup object
      const configsMap: Record<string, AgentConfigTS> = {};
      
      if (Array.isArray(acsConfigs)) {
        acsConfigs.forEach(acsConfig => {
          const orchestraConfig = convertACSToOrchestra(acsConfig);
          configsMap[orchestraConfig.id] = orchestraConfig;
        });
      }
      
      console.log(`🤖 [useACSAgentConfigs] Converted ${Object.keys(configsMap).length} configs to Orchestra format`);
      console.log('🤖 [useACSAgentConfigs] Final configsMap:', configsMap);
      
      setAgentConfigs(configsMap);
      console.log('🤖 [useACSAgentConfigs] ✅ Successfully set agent configs in state');
      
      // DEBUG: Verify state was actually set
      setTimeout(() => {
        console.log('🤖 [useACSAgentConfigs] State verification after setTimeout:', {
          agentConfigs_size: Object.keys(agentConfigs).length,
          agentConfigs_keys: Object.keys(agentConfigs)
        });
      }, 100);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent configs';
      console.error('🤖 [useACSAgentConfigs] Error fetching configs:', err);
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
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAgentConfigById = useCallback((id: string): AgentConfigTS | undefined => {
    return agentConfigs[id];
  }, [agentConfigs]);

  const getFeaturedConfigs = useCallback(async (): Promise<AgentConfigTS[]> => {
    try {
      console.log('🤖 [useACSAgentConfigs] Fetching featured configs...');
      
      const acsClient = getDefaultACSClient();
      const featuredACSConfigs = await acsClient.agentConfigs.getFeaturedAgentConfigs();
      
      const featuredConfigs = featuredACSConfigs.map(convertACSToOrchestra);
      
      console.log(`🤖 [useACSAgentConfigs] Found ${featuredConfigs.length} featured configs`);
      
      return featuredConfigs;
      
    } catch (err) {
      console.error('🤖 [useACSAgentConfigs] Error fetching featured configs:', err);
      return [];
    }
  }, []);

  const getCategories = useCallback(async (): Promise<string[]> => {
    try {
      console.log('🤖 [useACSAgentConfigs] Fetching categories...');
      
      const acsClient = getDefaultACSClient();
      const categories = await acsClient.agentConfigs.getAgentConfigCategories();
      
      console.log(`🤖 [useACSAgentConfigs] Found categories:`, categories);
      
      return categories;
      
    } catch (err) {
      console.error('🤖 [useACSAgentConfigs] Error fetching categories:', err);
      return ['general'];
    }
  }, []);

  // Track agentConfigs state changes
  useEffect(() => {
    console.log('🤖 [useACSAgentConfigs] agentConfigs state changed:', {
      size: Object.keys(agentConfigs).length,
      keys: Object.keys(agentConfigs),
      isEmpty: Object.keys(agentConfigs).length === 0
    });
  }, [agentConfigs]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAgentConfigs();
  }, [fetchAgentConfigs]);

  return {
    agentConfigs,
    agentConfigsArray,
    isLoading,
    error,
    fetchAgentConfigs,
    getAgentConfigById,
    getFeaturedConfigs,
    getCategories
  };
};