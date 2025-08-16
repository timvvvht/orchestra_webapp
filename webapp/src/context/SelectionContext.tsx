import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useChatUI } from './ChatUIContext';

/**
 * SelectionContext - Manages UI-only model and agent selections
 * 
 * This context handles the visual state of model and agent selections in the ChatHeader
 * without immediately persisting to the backend. The selections are applied as overrides
 * when sending messages to the ACS/converse endpoint.
 * 
 * Benefits:
 * - No API calls on every selection change
 * - Immediate visual feedback
 * - Users can experiment with different models/agents
 * - Cleaner separation between UI state and persistent state
 */

export interface SelectionContextValue {
  // Current selections
  selectedModelId: string | null;
  selectedAgentConfigId: string | null;
  
  // Selection actions
  setSelectedModelId: (modelId: string | null) => void;
  setSelectedAgentConfigId: (agentConfigId: string | null) => void;
  
  // Utility functions
  clearSelections: () => void;
  resetToSessionDefaults: () => void;
  
  // Computed values
  hasSelections: boolean;
  effectiveModelId: string | null; // Selected or session default
  effectiveAgentConfigId: string | null; // Selected or session default
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export interface SelectionProviderProps {
  children: React.ReactNode;
  // Optional: Persist selections to localStorage
  persistToStorage?: boolean;
  // Optional: Storage key prefix
  storageKeyPrefix?: string;
}

export function SelectionProvider({ 
  children, 
  persistToStorage = true,
  storageKeyPrefix = 'orchestra_selections'
}: SelectionProviderProps) {
  const chatUI = useChatUI();
  const currentSession = chatUI.currentSession;
  const currentAgentConfig = chatUI.currentAgentConfig;
  
  // Local selection state
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null);
  const [selectedAgentConfigId, setSelectedAgentConfigIdState] = useState<string | null>(null);
  
  // Storage keys
  const modelStorageKey = `${storageKeyPrefix}_model_id`;
  const agentStorageKey = `${storageKeyPrefix}_agent_config_id`;
  
  // Load selections from localStorage on mount
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      const savedModelId = localStorage.getItem(modelStorageKey);
      const savedAgentConfigId = localStorage.getItem(agentStorageKey);
      
      console.log('🔍 [LOCALSTORAGE LOAD]', {
        savedModelId,
        savedAgentConfigId,
        modelStorageKey,
        agentStorageKey,
        allLocalStorageKeys: Object.keys(localStorage),
        timestamp: new Date().toISOString()
      });
      
      if (savedModelId) {
        console.log('⚠️ [LOADING SAVED MODEL]', savedModelId);
        setSelectedModelIdState(savedModelId);
      }
      if (savedAgentConfigId) {
        console.log('⚠️ [LOADING SAVED AGENT]', savedAgentConfigId);
        setSelectedAgentConfigIdState(savedAgentConfigId);
      }
    }
  }, [persistToStorage, modelStorageKey, agentStorageKey]);

  // 🎯 PATCH: Sync localStorage to session's model_id when session changes
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined' && currentSession?.model_id) {
      const sessionModelId = currentSession.model_id;
      const savedModelId = localStorage.getItem(modelStorageKey);
      
      // If session has a model_id and it's different from localStorage, sync it
      if (sessionModelId && sessionModelId !== savedModelId) {
        console.log('🔄 [SYNC SESSION MODEL]', {
          sessionModelId,
          savedModelId,
          action: 'syncing localStorage to session model_id',
          timestamp: new Date().toISOString()
        });
        
        // Update localStorage to match session
        localStorage.setItem(modelStorageKey, sessionModelId);
        
        // Update state to match session
        setSelectedModelIdState(sessionModelId);
      }
    }
  }, [currentSession?.model_id, persistToStorage, modelStorageKey]);
  
  // Clear selections when session changes (optional behavior)
  // DISABLED: Auto-clearing was preventing model overrides from persisting
  // when navigating from landing page to chat interface
  // useEffect(() => {
  //   // Optionally clear selections when switching sessions
  //   // Comment out if you want selections to persist across sessions
  //   if (currentSession?.id) {
  //     console.log('[SelectionContext] Session changed, clearing selections');
  //     setSelectedModelIdState(null);
  //     setSelectedAgentConfigIdState(null);
  //     
  //     if (persistToStorage && typeof window !== 'undefined') {
  //       localStorage.removeItem(modelStorageKey);
  //       localStorage.removeItem(agentStorageKey);
  //     }
  //   }
  // }, [currentSession?.id, persistToStorage, modelStorageKey, agentStorageKey]);
  
  // Selection setters with persistence
  const setSelectedModelId = useCallback((modelId: string | null) => {
    console.log('🎯 [MODEL SELECTION CHANGE]', {
      from: selectedModelId,
      to: modelId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    setSelectedModelIdState(modelId);
    
    if (persistToStorage && typeof window !== 'undefined') {
      if (modelId) {
        localStorage.setItem(modelStorageKey, modelId);
      } else {
        localStorage.removeItem(modelStorageKey);
      }
    }
  }, [selectedModelId, persistToStorage, modelStorageKey]);
  
  const setSelectedAgentConfigId = useCallback((agentConfigId: string | null) => {
    console.log('[SelectionContext] Setting selected agent config ID:', agentConfigId);
    setSelectedAgentConfigIdState(agentConfigId);
    
    if (persistToStorage && typeof window !== 'undefined') {
      if (agentConfigId) {
        localStorage.setItem(agentStorageKey, agentConfigId);
      } else {
        localStorage.removeItem(agentStorageKey);
      }
    }
  }, [persistToStorage, agentStorageKey]);
  
  // Utility functions
  const clearSelections = useCallback(() => {
    console.log('[SelectionContext] Clearing all selections');
    setSelectedModelId(null);
    setSelectedAgentConfigId(null);
  }, [setSelectedModelId, setSelectedAgentConfigId]);
  
  const resetToSessionDefaults = useCallback(() => {
    console.log('[SelectionContext] Resetting to session defaults');
    // Clear selections to fall back to session/agent config defaults
    clearSelections();
  }, [clearSelections]);
  
  // Computed values
  const hasSelections = selectedModelId !== null || selectedAgentConfigId !== null;
  
  // Effective values (selection takes precedence over session/agent config)
  const effectiveModelId = selectedModelId || currentSession?.model_id || currentAgentConfig?.ai_config?.model_id || null;
  const effectiveAgentConfigId = selectedAgentConfigId || currentSession?.agent_config_id || null;
  
  // Debug logging
  useEffect(() => {
    console.log('📊 [SELECTION CONTEXT STATE]', {
      '🎯 Selected': { modelId: selectedModelId, agentConfigId: selectedAgentConfigId },
      '✅ Effective': { modelId: effectiveModelId, agentConfigId: effectiveAgentConfigId },
      '📋 Fallbacks': {
        sessionModelId: currentSession?.model_id,
        sessionAgentConfigId: currentSession?.agent_config_id,
        agentConfigModelId: currentAgentConfig?.ai_config?.model_id
      },
      '🔄 HasSelections': hasSelections,
      '🚨 PROBLEM': {
        'currentAgentConfig_exists': !!currentAgentConfig,
        'currentAgentConfig_id': currentAgentConfig?.id,
        'currentAgentConfig_model': currentAgentConfig?.ai_config?.model_id,
        'session_has_model': !!currentSession?.model_id,
        'session_model': currentSession?.model_id
      },
      '⏰ Timestamp': new Date().toISOString()
    });
  }, [
    selectedModelId, 
    selectedAgentConfigId, 
    effectiveModelId, 
    effectiveAgentConfigId, 
    hasSelections,
    currentSession?.model_id,
    currentSession?.agent_config_id,
    currentAgentConfig?.ai_config?.model_id,
    currentAgentConfig?.id
  ]);
  
  const contextValue: SelectionContextValue = {
    selectedModelId,
    selectedAgentConfigId,
    setSelectedModelId,
    setSelectedAgentConfigId,
    clearSelections,
    resetToSessionDefaults,
    hasSelections,
    effectiveModelId,
    effectiveAgentConfigId
  };
  
  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
    </SelectionContext.Provider>
  );
}

/**
 * Hook to consume selection context
 */
export function useSelections(): SelectionContextValue {
  const context = useContext(SelectionContext);
  
  if (!context) {
    throw new Error('useSelections must be used within a SelectionProvider');
  }
  
  return context;
}

/**
 * Get effective overrides for ACS API calls
 * This is NOT a hook, so it can be called from within event handlers
 * Returns the overrides object to pass to sendMessage
 */
export const getAcsOverrides = (selections: SelectionContextValue) => {
  const result = {
    agentConfigName: selections.effectiveAgentConfigId || 'general',
    overrides: selections.effectiveModelId ? { model_id: selections.effectiveModelId } : undefined,
  };
  
  console.log('🚀 [GET ACS OVERRIDES]', {
    '📥 Input': {
      selectedModelId: selections.selectedModelId,
      selectedAgentConfigId: selections.selectedAgentConfigId,
      effectiveModelId: selections.effectiveModelId,
      effectiveAgentConfigId: selections.effectiveAgentConfigId
    },
    '📤 Output': result,
    '⏰ Timestamp': new Date().toISOString()
  });
  
  return result;
};


export default SelectionContext;