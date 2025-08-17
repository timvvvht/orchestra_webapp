import { useMemo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { shallow } from 'zustand/shallow';

/**
 * Optimized hook for accessing chat messages with loading state
 * Prevents unnecessary re-renders by using shallow comparison
 */
export const useOptimizedChatMessages = (sessionId: string | null) => {
  const { messages, loadingState } = useChatStore(
    state => ({
      messages: sessionId ? state.chats[sessionId]?.messages || [] : [],
      loadingState: sessionId ? state.messagesLoadingState[sessionId] || 'idle' : 'idle'
    }),
    shallow
  );

  const loadMessagesForSession = useChatStore(state => state.loadMessagesForSession);
  const loadMoreMessages = useChatStore(state => state.loadMoreMessages);

  return useMemo(() => ({
    messages,
    loadingState,
    loadMessagesForSession,
    loadMoreMessages
  }), [messages, loadingState, loadMessagesForSession, loadMoreMessages]);
};

/**
 * Hook for accessing session metadata without triggering re-renders on message updates
 */
export const useSessionMetadata = (sessionId: string | null) => {
  return useChatStore(
    state => sessionId ? state.sessions[sessionId] : null,
    shallow
  );
};

/**
 * Hook for accessing current session ID
 */
export const useCurrentSessionId = () => {
  return useChatStore(state => state.currentSessionId);
};