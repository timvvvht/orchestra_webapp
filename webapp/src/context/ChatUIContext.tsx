import React, { createContext, useContext } from 'react';

/**
 * ChatUIContext - Stub implementation for webapp migration
 * 
 * This is a minimal stub version of ChatUIContext to support the migration
 * from desktop app to webapp. It provides the basic interface that other
 * components expect without requiring the full ACS chat implementation.
 * 
 * TODO: Implement full ChatUIContext with useACSChatUI hook when needed
 */

// Minimal interface that SelectionContext expects
interface ChatUIContextValue {
  currentSession?: {
    id?: string;
    model_id?: string;
    agent_config_id?: string;
  } | null;
  currentAgentConfig?: {
    id?: string;
    ai_config?: {
      model_id?: string;
    };
  } | null;
}

const ChatUIContext = createContext<ChatUIContextValue | null>(null);

export const ChatUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Stub implementation - returns minimal data structure
  const chatUIValue: ChatUIContextValue = {
    currentSession: null,
    currentAgentConfig: null,
  };
  
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