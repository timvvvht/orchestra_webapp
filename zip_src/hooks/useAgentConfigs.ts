// Lightweight hook that uses the AgentConfigContext
// This provides the same interface as the original useACSAgentConfigs
// but gets data from the context provider instead of making direct API calls

import { useAgentConfigs as useAgentConfigsContext } from '@/context/AgentConfigContext';

/**
 * Hook for accessing agent configurations from the context provider
 * 
 * This replaces the original useACSAgentConfigs hook and provides the same interface,
 * but gets data from the AgentConfigProvider context instead of making direct API calls.
 * 
 * Benefits:
 * - Single source of truth for agent configs
 * - No duplicate API calls
 * - Shared loading/error states
 * - Automatic caching and refresh
 * 
 * Usage:
 * ```tsx
 * const { agentConfigs, agentConfigsArray, isLoading, error } = useAgentConfigs();
 * ```
 */
export const useAgentConfigs = useAgentConfigsContext;

// Re-export the context hook with a more descriptive name
export { useAgentConfigs as useACSAgentConfigs } from '@/context/AgentConfigContext';