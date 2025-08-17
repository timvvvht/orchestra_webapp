import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage, ChatSession, SessionMeta } from '@/types/chatTypes';

/**
 * Optimized chat store hooks that prevent unnecessary re-renders
 * by using selective subscriptions and memoization
 */

// Hook for specific chat data with shallow comparison
export const useOptimizedChatData = (agentId: string | null) => {
  // Memoize the selector function to prevent infinite loops
  const selector = useMemo(
    () => (state: any) => {
      if (!agentId) {
        return { 
          chat: undefined, 
          currentAgent: null, 
          messages: [], 
          messageCount: 0,
          lastMessageTimestamp: 0
        };
      }
      
      const chat = state.chats[agentId];
      const currentAgent = state.sessions[agentId];
      const messages = chat?.messages || [];
      
      // Return stable references and derived data
      return { 
        chat, 
        currentAgent, 
        messages,
        messageCount: messages.length,
        lastMessageTimestamp: messages.length > 0 ? messages[messages.length - 1].timestamp : 0
      };
    },
    [agentId]
  );

  return useChatStore(
    selector,
    // Custom equality function for shallow comparison
    (prev, next) => {
      if (!agentId) return true;
      
      return (
        prev.chat === next.chat &&
        prev.currentAgent === next.currentAgent &&
        prev.messageCount === next.messageCount &&
        prev.lastMessageTimestamp === next.lastMessageTimestamp
      );
    }
  );
};

// Stable selector for chat actions
const chatActionsSelector = (state: any) => ({
  sendMessage: state.sendMessage,
  setCurrentSession: state.setCurrentSession,
  initialize: state.initialize,
  isInitialized: state.isInitialized,
  createSession: state.createSession,
  deleteSession: state.deleteSession,
  updateChatSessionConfig: state.updateChatSessionConfig,
});

// Stable equality function for actions
const chatActionsEqualityFn = (prev: any, next: any) => {
  return (
    prev.sendMessage === next.sendMessage &&
    prev.setCurrentSession === next.setCurrentSession &&
    prev.initialize === next.initialize &&
    prev.isInitialized === next.isInitialized &&
    prev.createSession === next.createSession &&
    prev.deleteSession === next.deleteSession &&
    prev.updateChatSessionConfig === next.updateChatSessionConfig
  );
};

// Hook for chat actions (stable references)
export const useOptimizedChatActions = () => {
  return useChatStore(chatActionsSelector, chatActionsEqualityFn);
};

// Stable selector function defined outside the hook
const sessionListSelector = (state: any) => {
  const sessions = Object.values(state.sessions);
  const sessionCount = sessions.length;
  const lastUpdated = Math.max(...sessions.map((s: any) => s.lastUpdated), 0);
  
  return {
    sessions: state.sessions,
    sessionList: sessions,
    sessionCount,
    lastUpdated,
    currentSessionId: state.currentSessionId
  };
};

// Stable equality function
const sessionListEqualityFn = (prev: any, next: any) => {
  return (
    prev.sessionCount === next.sessionCount &&
    prev.lastUpdated === next.lastUpdated &&
    prev.currentSessionId === next.currentSessionId
  );
};

// Hook for session list (for sidebar)
export const useOptimizedSessionList = () => {
  // Use a ref to cache the sessionList array to maintain referential stability
  const sessionListRef = useRef<any[]>([]);
  const sessionsRef = useRef<any>({});
  
  return useChatStore(
    (state) => {
      const sessions = state.sessions;
      
      // Check if sessions object has actually changed
      const sessionsChanged = sessions !== sessionsRef.current;
      
      if (sessionsChanged) {
        // Only create new array when sessions actually change
        sessionListRef.current = Object.values(sessions);
        sessionsRef.current = sessions;
      }
      
      const sessionCount = sessionListRef.current.length;
      const lastUpdated = sessionCount > 0 
        ? Math.max(...sessionListRef.current.map((s: any) => s.lastUpdated)) 
        : 0;
      
      return {
        sessions: sessions,
        sessionList: sessionListRef.current, // Return stable reference
        sessionCount,
        lastUpdated,
        currentSessionId: state.currentSessionId
      };
    },
    sessionListEqualityFn
  );
};

// Hook for typing indicators across all sessions
export const useOptimizedTypingIndicators = () => {
  // Memoize the selector function to prevent infinite loops
  const selector = useMemo(
    () => (state: any) => {
      const typingSessions = new Set<string>();
      
      Object.entries(state.chats).forEach(([sessionId, chat]: [string, any]) => {
        if (chat.messages.some((msg: any) => msg.isStreaming)) {
          typingSessions.add(sessionId);
        }
      });
      
      return {
        typingSessions,
        hasAnyTyping: typingSessions.size > 0
      };
    },
    []
  );

  return useChatStore(
    selector,
    // Compare by typing sessions
    (prev, next) => {
      if (prev.typingSessions.size !== next.typingSessions.size) return false;
      
      for (const sessionId of prev.typingSessions) {
        if (!next.typingSessions.has(sessionId)) return false;
      }
      
      return true;
    }
  );
};

// Hook for specific session metadata only
export const useOptimizedSessionMeta = (sessionId: string | null) => {
  // Memoize the selector function to prevent infinite loops
  const selector = useMemo(
    () => (state: any) => {
      if (!sessionId) return null;
      return state.sessions[sessionId] || null;
    },
    [sessionId]
  );

  return useChatStore(
    selector,
    // Reference equality for session meta
    (prev, next) => prev === next
  );
};

// Stable selector for initialization status
const initStatusSelector = (state: any) => ({
  isInitialized: state.isInitialized
});

// Stable equality function for init status
const initStatusEqualityFn = (prev: any, next: any) => prev.isInitialized === next.isInitialized;

// Hook for initialization status only
export const useOptimizedInitStatus = () => {
  return useChatStore(initStatusSelector, initStatusEqualityFn);
};

// Hook for message streaming status for a specific session
export const useOptimizedStreamingStatus = (sessionId: string | null) => {
  // Memoize the selector function to prevent infinite loops
  const selector = useMemo(
    () => (state: any) => {
      if (!sessionId) return { isTyping: false, isWaitingForAI: false };
      
      const chat = state.chats[sessionId];
      if (!chat || !chat.messages.length) {
        return { isTyping: false, isWaitingForAI: false };
      }
      
      const messages = chat.messages;
      const lastMessage = messages[messages.length - 1];
      
      const isTyping = messages.some((msg: any) => msg.isStreaming);
      const isWaitingForAI = lastMessage.role === 'user' || 
        (lastMessage.role === 'assistant' && (lastMessage.isStreaming || lastMessage.thinking));
      
      return { isTyping, isWaitingForAI };
    },
    [sessionId]
  );

  return useChatStore(
    selector,
    (prev, next) => {
      return prev.isTyping === next.isTyping && prev.isWaitingForAI === next.isWaitingForAI;
    }
  );
};

// Debounced input hook for better performance
export const useDebouncedInput = (initialValue: string = '', delay: number = 100) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return [value, handleChange, debouncedValue] as const;
};

// Message processing utilities
export const useMessageProcessing = () => {
  const isPureResultMessage = useCallback((msg: ChatMessage) =>
    Array.isArray(msg.content) &&
    msg.content.length > 0 &&
    msg.content.every(p => p.type === 'tool_result'), []);

  const isToolOnlyMessage = useCallback((msg: ChatMessage) =>
    Array.isArray(msg.content) &&
    msg.content.length > 0 &&
    msg.content.every(p => p.type === 'tool_use' || p.type === 'tool_result') &&
    !msg.content.some(p => p.type === 'text'), []);

  const mergeToolMessages = useCallback((msgs: ChatMessage[]) => {
    const merged: ChatMessage[] = [];

    for (let i = 0; i < msgs.length; i++) {
      const cur = msgs[i];

      const hasToolUse =
        Array.isArray(cur.content) && cur.content.some(p => p.type === 'tool_use');

      if (cur.role === 'assistant' && hasToolUse) {
        const clone: ChatMessage = { ...cur, content: [...cur.content] };

        let j = i + 1;
        while (j < msgs.length && isPureResultMessage(msgs[j])) {
          clone.content.push(...msgs[j].content);
          j++;
        }

        merged.push(clone);
        i = j - 1;
        continue;
      }

      merged.push(cur);
    }

    return merged;
  }, [isPureResultMessage]);

  return {
    isPureResultMessage,
    isToolOnlyMessage,
    mergeToolMessages
  };
};

