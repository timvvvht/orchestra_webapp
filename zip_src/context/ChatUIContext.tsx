import React, { createContext, useContext } from 'react';
import { useACSChatUIRefactored as useACSChatUI } from '@/hooks/acs-chat';
import type { UnifiedTimelineEvent } from '@/types/unifiedTimeline';

/**
 * ChatUIContext - Adapter for ACS-powered chat functionality
 * 
 * This context wraps the useACSChatUI hook and provides it to components
 * that need access to chat functionality. It serves as an adapter layer
 * during the migration from legacy Zustand stores to ACS-powered system.
 */

const ChatUIContext = createContext<ReturnType<typeof useACSChatUI> | null>(null);

export const ChatUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const chat = useACSChatUI({ 
    autoInitialize: true, 
    autoConnectStreaming: true,
    debug: process.env.NODE_ENV === 'development'
  });
  
  return (
    <ChatUIContext.Provider value={chat}>
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