import React, { createContext, useContext, useMemo } from 'react';
import { useParams } from 'react-router';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';

/**
 * ChatUIContext - Provides current session and agent config information
 * 
 * This context integrates with the mission control store and agent configs
 * to provide the current session and agent configuration data that other
 * components need for proper functionality.
 */

// Interface that SelectionContext and other components expect
interface ChatUIContextValue {
  currentSession?: {
    id?: string;
    model_id?: string;
    agent_config_id?: string;
    agent_config_name?: string;
  } | null;
  currentAgentConfig?: {
    id?: string;
    name?: string;
    ai_config?: {
      model_id?: string;
    };
  } | null;
}

const ChatUIContext = createContext<ChatUIContextValue | null>(null);

export const ChatUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { agentConfigs } = useAgentConfigs();
  const { 
    activeSessions, 
    archivedSessions, 
    viewMode, 
    selectedSession 
  } = useMissionControlStore();
  
  // Get current session from either active or archived sessions
  const currentSession = useMemo(() => {
    const targetSessionId = sessionId || selectedSession;
    if (!targetSessionId) return null;
    
    // Look in active sessions first
    let session = activeSessions.find(s => s.id === targetSessionId);
    
    // If not found and we're in archived mode, look in archived sessions
    if (!session && viewMode === 'archived') {
      session = archivedSessions.find(s => s.id === targetSessionId);
    }
    
    if (!session) return null;
    
    return {
      id: session.id,
      model_id: session.model_id || undefined,
      agent_config_id: session.agent_config_name || undefined,
      agent_config_name: session.agent_config_name || undefined,
    };
  }, [sessionId, selectedSession, activeSessions, archivedSessions, viewMode]);
  
  // Get current agent config based on session's agent_config_name
  const currentAgentConfig = useMemo(() => {
    if (!currentSession?.agent_config_name) {
      // Return default 'general' config if available
      const generalConfig = agentConfigs['general'];
      if (generalConfig) {
        return {
          id: generalConfig.id,
          name: generalConfig.name,
          ai_config: generalConfig.ai_config,
        };
      }
      return null;
    }
    
    const agentConfig = agentConfigs[currentSession.agent_config_name];
    if (!agentConfig) {
      console.warn(`[ChatUIContext] Agent config '${currentSession.agent_config_name}' not found, using fallback`);
      // Return default 'general' config as fallback
      const generalConfig = agentConfigs['general'];
      if (generalConfig) {
        return {
          id: generalConfig.id,
          name: generalConfig.name,
          ai_config: generalConfig.ai_config,
        };
      }
      return null;
    }
    
    return {
      id: agentConfig.id,
      name: agentConfig.name,
      ai_config: agentConfig.ai_config,
    };
  }, [currentSession?.agent_config_name, agentConfigs]);
  
  const chatUIValue: ChatUIContextValue = {
    currentSession,
    currentAgentConfig,
  };
  
  // Debug logging
  console.log('🎯 [ChatUIContext] Current state:', {
    sessionId,
    selectedSession,
    viewMode,
    currentSession,
    currentAgentConfig,
    availableAgentConfigs: Object.keys(agentConfigs),
  });
  
  return (
    <ChatUIContext.Provider value={chatUIValue}>
      {children}
    </ChatUIContext.Provider>
  );
};

export const useChatUI = () => {
  const ctx = useContext(ChatUIContext);
  if (!ctx) {
    throw new Error('useChatUI must be used inside ChatUIProvider');
  }
  return ctx;
};

export default ChatUIContext;