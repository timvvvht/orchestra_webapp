import { useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChatActions, useChatOperations } from '@/stores/chat/hooks/useChatActions';
import { useChatState, useCurrentSession, useSessionMessages, useSessionList } from '@/stores/chat/hooks/useChatState';
import { useChatStore } from '@/stores/chat';
import type { ChatSession, ChatMessage } from '@/types/chatTypes';

/**
 * Unified React hook for chat UI integration
 * Combines all chat functionality into a clean, reusable interface
 * 
 * This hook provides:
 * - Automatic initialization
 * - Session management
 * - Message handling
 * - Real-time updates
 * - Error recovery
 * - Navigation integration
 */
export interface UseChatUIOptions {
  /** Auto-initialize the chat store on mount */
  autoInitialize?: boolean;
  /** Auto-load messages for the current session */
  autoLoadMessages?: boolean;
  /** Enable coding mode support */
  enableCodingMode?: boolean;
  /** Default agent config ID for new sessions */
  defaultAgentConfigId?: string;
}

export interface UseChatUIReturn {
  // State
  isInitialized: boolean;
  currentSessionId: string | undefined;
  currentSession: ChatSession | undefined;
  messages: ChatMessage[];
  sessions: Array<{
    id: string;
    name: string;
    avatar: string;
    lastUpdated: number;
    messageCount: number;
  }>;
  
  // Loading states
  isLoading: boolean;
  hasStreamingMessage: boolean;
  hasThinkingMessage: boolean;
  
  // Actions
  sendMessage: (content: string, options?: any) => Promise<void>;
  createSession: (agentConfigId?: string, name?: string) => Promise<string>;
  createSessionAndSendMessage: (message: string, agentConfigId?: string, sessionName?: string) => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  switchToSession: (sessionId: string) => void;
  loadMoreMessages: (sessionId?: string, limit?: number) => Promise<void>;
  
  // Navigation helpers
  navigateToSession: (sessionId: string) => void;
  navigateToChat: () => void;
  
  // Utility
  refresh: () => Promise<void>;
  cleanup: () => void;
}

/**
 * Main chat UI hook - provides everything needed for chat integration
 */
export const useChatUI = (options: UseChatUIOptions = {}): UseChatUIReturn => {
  const {
    autoInitialize = true,
    autoLoadMessages = true,
    enableCodingMode = false,
    defaultAgentConfigId
  } = options;
  
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  
  // Core hooks
  const actions = useChatActions();
  const operations = useChatOperations();
  const { isInitialized, currentSessionId } = useChatState();
  const { session: currentSession } = useCurrentSession();
  const { sessions } = useSessionList();
  const { messages, isLoading, hasStreamingMessage, hasThinkingMessage } = useSessionMessages(currentSessionId);
  
  // Auto-initialization
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      console.log('[useChatUI] Auto-initializing chat store...');
      actions.initialize().catch(error => {
        console.error('[useChatUI] Failed to initialize chat store:', error);
      });
    }
  }, [autoInitialize, isInitialized, actions.initialize]);
  
  // Handle URL session changes
  useEffect(() => {
    if (urlSessionId && urlSessionId !== currentSessionId && isInitialized) {
      console.log('[useChatUI] Switching to URL session:', urlSessionId);
      actions.setCurrentSession(urlSessionId);
    }
  }, [urlSessionId, currentSessionId, isInitialized, actions.setCurrentSession]);
  
  // Auto-load messages for current session
  useEffect(() => {
    if (autoLoadMessages && currentSessionId && isInitialized) {
      console.log('[useChatUI] Auto-loading messages for session:', currentSessionId);
      actions.loadInitialMessagesForSession(currentSessionId, 30).catch(error => {
        console.error('[useChatUI] Failed to load messages:', error);
      });
    }
  }, [autoLoadMessages, currentSessionId, isInitialized, actions.loadInitialMessagesForSession]);
  
  // Enhanced send message with error handling
  const sendMessage = useCallback(async (content: string, options?: any) => {
    if (!content.trim()) {
      throw new Error('Message content cannot be empty');
    }
    
    const targetSessionId = options?.targetSessionId || currentSessionId;
    if (!targetSessionId) {
      throw new Error('No active session to send message to');
    }
    
    try {
      await actions.sendMessage(content, {
        ...options,
        targetSessionId,
        ...(enableCodingMode && options?.codingMode ? { codingMode: options.codingMode } : {})
      });
    } catch (error) {
      console.error('[useChatUI] Failed to send message:', error);
      throw error;
    }
  }, [currentSessionId, actions.sendMessage, enableCodingMode]);
  
  // Enhanced create session
  const createSession = useCallback(async (agentConfigId?: string, name?: string) => {
    const configId = agentConfigId || defaultAgentConfigId;
    if (!configId) {
      throw new Error('Agent config ID is required to create a session');
    }
    
    try {
      const sessionId = await actions.createSession(configId, name);
      console.log('[useChatUI] Created new session:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('[useChatUI] Failed to create session:', error);
      throw error;
    }
  }, [defaultAgentConfigId, actions.createSession]);
  
  // Create session and send first message
  const createSessionAndSendMessage = useCallback(async (
    message: string,
    agentConfigId?: string,
    sessionName?: string
  ) => {
    const configId = agentConfigId || defaultAgentConfigId;
    if (!configId) {
      throw new Error('Agent config ID is required to create a session');
    }
    
    try {
      const sessionId = await operations.createSessionAndSendMessage(
        configId,
        message,
        sessionName
      );
      console.log('[useChatUI] Created session and sent message:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('[useChatUI] Failed to create session and send message:', error);
      throw error;
    }
  }, [defaultAgentConfigId, operations.createSessionAndSendMessage]);
  
  // Enhanced delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await actions.deleteSession(sessionId);
      console.log('[useChatUI] Deleted session:', sessionId);
      
      // If we deleted the current session, navigate away
      if (sessionId === currentSessionId) {
        navigate('/whatsapp');
      }
    } catch (error) {
      console.error('[useChatUI] Failed to delete session:', error);
      throw error;
    }
  }, [actions.deleteSession, currentSessionId, navigate]);
  
  // Switch to session
  const switchToSession = useCallback((sessionId: string) => {
    console.log('[useChatUI] Switching to session:', sessionId);
    actions.setCurrentSession(sessionId);
  }, [actions.setCurrentSession]);
  
  // Load more messages
  const loadMoreMessages = useCallback(async (sessionId?: string, limit = 30) => {
    const targetSessionId = sessionId || currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session specified for loading messages');
    }
    
    try {
      await actions.loadMoreMessagesForSession(targetSessionId, limit);
    } catch (error) {
      console.error('[useChatUI] Failed to load more messages:', error);
      throw error;
    }
  }, [currentSessionId, actions.loadMoreMessagesForSession]);
  
  // Navigation helpers
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  }, [navigate]);
  
  const navigateToChat = useCallback(() => {
    navigate('/whatsapp');
  }, [navigate]);
  
  // Refresh everything
  const refresh = useCallback(async () => {
    try {
      console.log('[useChatUI] Refreshing chat data...');
      await actions.initialize();
      if (currentSessionId) {
        await actions.loadInitialMessagesForSession(currentSessionId, 30);
      }
    } catch (error) {
      console.error('[useChatUI] Failed to refresh:', error);
      throw error;
    }
  }, [actions.initialize, actions.loadInitialMessagesForSession, currentSessionId]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[useChatUI] Cleaning up...');
    actions.cleanupProcessedEventKeys();
  }, [actions.cleanupProcessedEventKeys]);
  
  // Memoized return value to prevent unnecessary re-renders
  return useMemo(() => ({
    // State
    isInitialized,
    currentSessionId,
    currentSession,
    messages,
    sessions,
    
    // Loading states
    isLoading,
    hasStreamingMessage,
    hasThinkingMessage,
    
    // Actions
    sendMessage,
    createSession,
    createSessionAndSendMessage,
    deleteSession,
    switchToSession,
    loadMoreMessages,
    
    // Navigation helpers
    navigateToSession,
    navigateToChat,
    
    // Utility
    refresh,
    cleanup
  }), [
    isInitialized,
    currentSessionId,
    currentSession,
    messages,
    sessions,
    isLoading,
    hasStreamingMessage,
    hasThinkingMessage,
    sendMessage,
    createSession,
    createSessionAndSendMessage,
    deleteSession,
    switchToSession,
    loadMoreMessages,
    navigateToSession,
    navigateToChat,
    refresh,
    cleanup
  ]);
};

/**
 * Simplified hook for basic chat functionality
 * Perfect for simple integrations that don't need all features
 */
export const useSimpleChatUI = (agentConfigId?: string) => {
  const chat = useChatUI({
    autoInitialize: true,
    autoLoadMessages: true,
    ...(agentConfigId && { defaultAgentConfigId: agentConfigId })
  });
  
  return {
    // Essential state
    isReady: chat.isInitialized,
    messages: chat.messages,
    isLoading: chat.isLoading,
    
    // Essential actions
    sendMessage: chat.sendMessage,
    createAndSendMessage: chat.createSessionAndSendMessage,
    
    // Navigation
    goToChat: chat.navigateToChat
  };
};

/**
 * Hook for session management only
 * Useful for sidebar components or session lists
 */
export const useChatSessions = () => {
  const { sessions } = useSessionList();
  const { currentSessionId } = useChatState();
  const actions = useChatActions();
  const navigate = useNavigate();
  
  const switchToSession = useCallback((sessionId: string) => {
    actions.setCurrentSession(sessionId);
    navigate(`/chat/${sessionId}`);
  }, [actions.setCurrentSession, navigate]);
  
  const deleteSession = useCallback(async (sessionId: string) => {
    await actions.deleteSession(sessionId);
    if (sessionId === currentSessionId) {
      navigate('/whatsapp');
    }
  }, [actions.deleteSession, currentSessionId, navigate]);
  
  return {
    sessions,
    currentSessionId,
    switchToSession,
    deleteSession,
    createSession: actions.createSession
  };
};

export default useChatUI;
