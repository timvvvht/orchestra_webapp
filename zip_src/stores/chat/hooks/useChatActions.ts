import { useChatStore } from '../index';
import { useMemo } from 'react';
import type { SendMessageOptions } from '../managers/MessageManager';
import type { ChatSession } from '@/types/chatTypes';

/**
 * Hook for chat actions - provides all the actions components need
 * This creates a stable API that components can use without worrying about store internals
 */
export const useChatActions = () => {
    const store = useChatStore();
    
    // Memoize the actions object to prevent unnecessary re-renders
    return useMemo(() => ({
        // Session actions
        createSession: store.createSession,
        deleteSession: store.deleteSession,
        setCurrentSession: store.setCurrentSession,
        
        // Message actions
        sendMessage: store.sendMessage,
        loadMessagesForSession: store.loadMessagesForSession,
        loadInitialMessagesForSession: store.loadInitialMessagesForSession,
        loadMoreMessagesForSession: store.loadMoreMessagesForSession,
        
        // Initialization
        initialize: store.initialize,
        
        // Utility actions
        cleanupProcessedEventKeys: store.cleanupProcessedEventKeys,
        
        // Session restoration (for error recovery)
        restoreBackendSession: store.restoreBackendSession,
        loadSessionFromSupabase: store.loadSessionFromSupabase,
    }), [
        store.createSession,
        store.deleteSession,
        store.setCurrentSession,
        store.sendMessage,
        store.loadMessagesForSession,
        store.loadInitialMessagesForSession,
        store.loadMoreMessagesForSession,
        store.initialize,
        store.cleanupProcessedEventKeys,
        store.restoreBackendSession,
        store.loadSessionFromSupabase,
    ]);
};

/**
 * Convenience hook for common chat operations
 * Provides higher-level operations that combine multiple actions
 */
export const useChatOperations = () => {
    const actions = useChatActions();
    
    // Memoize the operations object to prevent unnecessary re-renders
    return useMemo(() => ({
        ...actions,
        
        /**
         * Create a session and send the first message
         * Perfect for landing page usage
         */
        createSessionAndSendMessage: async (
            agentConfigId: string,
            message: string,
            sessionName?: string,
            template?: Partial<ChatSession>
        ): Promise<string> => {
            console.log('[useChatOperations] createSessionAndSendMessage: Starting',
                {
                    agentConfigId,
                    messageLength: message.length,
                    sessionName,
                    hasTemplate: !!template
                }
            );

            let sessionId: string;
            try {
                console.log('[useChatOperations] createSessionAndSendMessage: Creating session...');
                sessionId = await actions.createSession(agentConfigId, sessionName, template);
                console.log('[useChatOperations] createSessionAndSendMessage: Session created successfully:', sessionId);
            } catch (error) {
                console.error('[useChatOperations] createSessionAndSendMessage: Error during session creation:', error);
                // Re-throw to be caught by the calling component (e.g., LandingPageInfinite)
                // The calling component should handle UI feedback for session creation failure.
                throw error;
            }

            // If session creation was successful, proceed to initiate message sending but don't await it for navigation.
            // MessageManager.sendMessage handles optimistic UI updates internally and then async operations.
            console.log('[useChatOperations] createSessionAndSendMessage: Initiating first message send (non-blocking for navigation)...', {
                sessionId,
                messageLength: message.length
            });

            // Fire-and-forget from the perspective of this function's return value for navigation.
            // Error handling for the sendMessage process itself should be managed within MessageManager
            // (e.g., updating message status in the store) or via global error handlers if necessary.
            actions.sendMessage(message, { targetSessionId: sessionId })
                .then(() => {
                    console.log('[useChatOperations] createSessionAndSendMessage: Background sendMessage process completed for session:', sessionId);
                })
                .catch(error => {
                    console.error('[useChatOperations] createSessionAndSendMessage: Background sendMessage process failed for session:', sessionId, error);
                    // UI for message send failure should be handled by MessageManager updating the message state in the store.
                });

            console.log('[useChatOperations] createSessionAndSendMessage: Returning sessionId immediately for navigation:', sessionId);
            return sessionId; // Return sessionId to allow immediate navigation
        },
        
        /**
         * Send a message with coding mode enabled
         */
        sendCodingMessage: async (
            message: string,
            codebasePath: string,
            sessionId?: string
        ): Promise<void> => {
            await actions.sendMessage(message, {
                targetSessionId: sessionId,
                codingMode: {
                    enabled: true,
                    codebasePath
                }
            });
        },
        
        /**
         * Ensure a session is fully loaded and ready
         */
        ensureSessionReady: async (sessionId: string): Promise<void> => {
            // Load messages if not already loaded
            await actions.loadMessagesForSession(sessionId);
            
            // Set as current session
            actions.setCurrentSession(sessionId);
        }
    }), [actions]);
};