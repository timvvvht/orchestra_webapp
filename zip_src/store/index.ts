/**
 * Store Index - Zustand
 * 
 * Central export point for all Zustand stores and selectors.
 */

// Messages Store
export {
  useMessagesStore,
  useMessages,
  useTimeline,
  useSseEvents,
  useMessagesLoading,
  useHasStreamingMessage,
  useStreamingMessages,
  useMessageCount,
  useTimelineCount,
} from './messagesStore';

// Chat Core Store
export {
  useChatCoreStore,
  useSessions,
  useCurrentSession,
  useCurrentSessionId,
  useAgentConfigs,
  useCurrentAgentConfig,
  useCurrentAgentConfigId,
  useIsInitialized,
  useIsConnected,
  useConnectionStatus,
  useSessionCount,
  useAgentConfigCount,
  useIsAuthenticated,
} from './chatCoreStore';

// Combined selectors for convenience
export const useChatState = () => ({
  // Messages
  messages: useMessages(),
  timeline: useTimeline(),
  sseEvents: useSseEvents(),
  isLoading: useMessagesLoading(),
  hasStreamingMessage: useHasStreamingMessage(),
  
  // Chat Core
  sessions: useSessions(),
  currentSession: useCurrentSession(),
  currentSessionId: useCurrentSessionId(),
  agentConfigs: useAgentConfigs(),
  currentAgentConfig: useCurrentAgentConfig(),
  currentAgentConfigId: useCurrentAgentConfigId(),
  isInitialized: useIsInitialized(),
  isConnected: useIsConnected(),
  connectionStatus: useConnectionStatus(),
});

// Store actions for imperative usage
export const getMessagesActions = () => {
  const store = useMessagesStore.getState();
  return {
    setMessages: store.setMessages,
    addMessage: store.addMessage,
    updateMessage: store.updateMessage,
    clearMessages: store.clearMessages,
    pushSseEvent: store.pushSseEvent,
    clearSseEvents: store.clearSseEvents,
    setLoading: store.setLoading,
    setStreamingMessage: store.setStreamingMessage,
    clear: store.clear,
  };
};

export const getChatCoreActions = () => {
  const store = useChatCoreStore.getState();
  return {
    setSessions: store.setSessions,
    addSession: store.addSession,
    updateSession: store.updateSession,
    removeSession: store.removeSession,
    setCurrentSession: store.setCurrentSession,
    setCurrentSessionId: store.setCurrentSessionId,
    clearSessions: store.clearSessions,
    setAgentConfigs: store.setAgentConfigs,
    addAgentConfig: store.addAgentConfig,
    updateAgentConfig: store.updateAgentConfig,
    removeAgentConfig: store.removeAgentConfig,
    setCurrentAgentConfigId: store.setCurrentAgentConfigId,
    setCurrentAgentConfig: store.setCurrentAgentConfig,
    clearAgentConfigs: store.clearAgentConfigs,
    setInitialized: store.setInitialized,
    setConnected: store.setConnected,
    setConnectionStatus: store.setConnectionStatus,
    clear: store.clear,
  };
};