import { useState, useCallback, useMemo } from 'react';
import { baseDirFromCwd } from '@/utils/pathHelpers';

interface CwdFilterConfig {
  initialCwd?: string;
  agents?: any[];
}

/**
 * Hook for managing CWD (Current Working Directory) filtering of agents.
 * Extracts unique CWDs from agents and provides filtering functionality.
 * 
 * @param config - Configuration object with initial CWD and agents list
 * @returns Object with filter state, available CWDs, filtered agents, and handlers
 */
export const useCwdFilter = (config: CwdFilterConfig = {}) => {
  const { initialCwd = '', agents = [] } = config;
  
  const [selectedCwd, setSelectedCwd] = useState<string>(initialCwd);

  // Extract unique base directories from agents (prefer base_dir, fallback to derived)
  const availableCwds = useMemo(() => {
    const cwds = new Set<string>();
    agents.forEach(agent => {
      const baseDir = agent.base_dir ?? baseDirFromCwd(agent.cwd);
      if (baseDir) {
        cwds.add(baseDir);
      }
    });
    return Array.from(cwds).sort();
  }, [agents]);

  // Filter agents by selected base directory (prefer base_dir, fallback to derived)
  const filteredAgents = useMemo(() => {
    if (!selectedCwd) return agents;
    return agents.filter(agent => (agent.base_dir ?? baseDirFromCwd(agent.cwd)) === selectedCwd);
  }, [agents, selectedCwd]);

  const handleCwdChange = useCallback((cwd: string) => {
    setSelectedCwd(cwd);
  }, []);

  const clearFilter = useCallback(() => {
    setSelectedCwd('');
  }, []);

  return {
    selectedCwd,
    availableCwds,
    filteredAgents,
    handleCwdChange,
    clearFilter,
    hasFilter: !!selectedCwd,
  };
};