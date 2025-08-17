import { useChatStore } from '../index';
import { useMemo } from 'react';
import type { ChatSession, SessionMeta, ChatMessage } from '@/types/chatTypes';

/**
 * Hook for accessing chat state - provides optimized selectors
 * Components should use these instead of accessing the store directly
 */
export const useChatState = () => {
    const sessions = useChatStore(state => state.sessions);
    const chats = useChatStore(state => state.chats);
    const currentSessionId = useChatStore(state => state.currentSessionId);
    const isInitialized = useChatStore(state => state.isInitialized);
    
    return {
        sessions,
        chats,
        currentSessionId,
        isInitialized,
        
        // Computed values
        sessionCount: Object.keys(sessions).length,
        hasAnySessions: Object.keys(sessions).length > 0,
        currentSession: currentSessionId ? chats[currentSessionId] : undefined,
    };
};

/**
 * Hook for accessing a specific session's state
 */
export const useSessionState = (sessionId: string | undefined) => {
    const sessions = useChatStore(state => state.sessions);
    const chats = useChatStore(state => state.chats);
    const currentSessionId = useChatStore(state => state.currentSessionId);
    const messagesLoadingState = useChatStore(state => 
        sessionId ? (state.messagesLoadingState[sessionId] || 'idle') : 'idle'
    );
    
    const sessionMeta = sessionId ? sessions[sessionId] : undefined;
    const session = sessionId ? chats[sessionId] : undefined;
    const isCurrentSession = sessionId === currentSessionId;
    
    return {
        session,
        sessionMeta,
        messagesLoadingState,
        isCurrentSession
    };
};

/**
 * Hook for accessing current session
 */
export const useCurrentSession = () => {
    const currentSessionId = useChatStore(state => state.currentSessionId);
    const session = useChatStore(state => currentSessionId ? state.chats[currentSessionId] : undefined);
    const sessionMeta = useChatStore(state => currentSessionId ? state.sessions[currentSessionId] : undefined);
    
    return {
        currentSessionId,
        session,
        sessionMeta
    };
};

/**
 * Hook for accessing a specific session's state (legacy)
 */
const useSessionStateLegacy = (sessionId: string | undefined) => {
    const session = useChatStore(state => sessionId ? state.chats[sessionId] : undefined);
    const sessionMeta = useChatStore(state => sessionId ? state.sessions[sessionId] : undefined);
    const messageLoadingState = useChatStore(state => sessionId ? (state.messagesLoadingState[sessionId] || 'idle') : 'idle');
    const isCurrentSession = useChatStore(state => state.currentSessionId === sessionId);
    
    // Memoize computed values to prevent unnecessary recalculations
    const computedValues = useMemo(() => {
        const messages = session?.messages || EMPTY_MESSAGES;
        const messageCount = messages.length;
        const hasMessages = messageCount > 0;
        const sessionName = session?.name || sessionMeta?.name || 'Unknown Session';
        const sessionAvatar = session?.avatar || sessionMeta?.avatar || 'assets/robots/robot1.png';
        const lastUpdated = session?.lastUpdated || sessionMeta?.lastUpdated || 0;
        
        return {
            messages,
            messageCount,
            hasMessages,
            sessionName,
            sessionAvatar,
            lastUpdated,
        };
    }, [session, sessionMeta]);
    
    // Memoize loading state booleans
    const loadingStates = useMemo(() => ({
        isLoading: messageLoadingState === 'loading',
        isLoaded: messageLoadingState === 'loaded',
        hasError: messageLoadingState === 'error',
    }), [messageLoadingState]);
    
    return {
        session,
        sessionMeta,
        messageLoadingState,
        isCurrentSession,
        ...computedValues,
        ...loadingStates,
    };
};

/**
 * Hook for accessing session list for sidebar
 */
export const useSessionList = () => {
    const sessions = useChatStore(state => state.sessions);
    const chats = useChatStore(state => state.chats);
    
    // Memoize the session list computation
    const sessionList = useMemo(() => {
        return Object.values(sessions)
            .map(sessionMeta => ({
                ...sessionMeta,
                chat: chats[sessionMeta.id],
                messageCount: chats[sessionMeta.id]?.messages?.length || 0,
            }))
            .sort((a, b) => b.lastUpdated - a.lastUpdated);
    }, [sessions, chats]);
    
    // Memoize computed values
    const computedValues = useMemo(() => ({
        sessionCount: sessionList.length,
        hasAnySessions: sessionList.length > 0,
    }), [sessionList.length]);
    
    return {
        sessions: sessionList,
        ...computedValues,
    };
};

// Create a stable empty array to avoid infinite re-renders
const EMPTY_MESSAGES: ChatMessage[] = [];

/**
 * Hook for accessing messages of a specific session
 */
export const useSessionMessages = (sessionId: string | undefined) => {
    // Use stable selectors that don't create new objects
    const messages = useChatStore(state => {
        if (!sessionId || !state.chats[sessionId]) {
            return EMPTY_MESSAGES; // Return stable reference
        }
        return state.chats[sessionId].messages || EMPTY_MESSAGES;
    });
    
    const messageLoadingState = useChatStore(state => 
        sessionId ? (state.messagesLoadingState[sessionId] || 'idle') : 'idle'
    );
    
    // Memoize computed values to prevent unnecessary recalculations
    const computedValues = useMemo(() => {
        const messageCount = messages.length;
        const hasMessages = messageCount > 0;
        const lastMessage = hasMessages ? messages[messageCount - 1] : undefined;
        const hasStreamingMessage = messages.some(m => m.isStreaming);
        const hasThinkingMessage = messages.some(m => m.thinking);
        
        return {
            messageCount,
            hasMessages,
            lastMessage,
            hasStreamingMessage,
            hasThinkingMessage,
        };
    }, [messages]);
    
    // Memoize loading state booleans
    const loadingStates = useMemo(() => ({
        isLoading: messageLoadingState === 'loading',
        isLoaded: messageLoadingState === 'loaded',
        hasError: messageLoadingState === 'error',
    }), [messageLoadingState]);
    
    return {
        messages,
        ...computedValues,
        ...loadingStates,
    };
};

/**
 * Hook for performance monitoring
 */
export const useChatPerformance = () => {
    const processedEventKeys = useChatStore(state => state.processedEventKeys);
    const isInitialized = useChatStore(state => state.isInitialized);
    
    return {
        isInitialized,
        processedEventCount: processedEventKeys.size,
        
        // Performance metrics
        memoryUsage: {
            processedEvents: processedEventKeys.size,
            // Add more metrics as needed
        }
    };
};