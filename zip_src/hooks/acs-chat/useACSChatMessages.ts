import { useState, useCallback, useEffect } from 'react';
import type { OrchestACSClient, SSEEvent } from '@/services/acs';
import type { ChatMessage } from '@/types/chatTypes';
import { ChatRole } from '@/types/chatTypes';
import { mergeSSEEventIntoMessages, clearEventMergerSeenIds } from '@/utils/eventMerger';
import { useBYOKStore } from '@/stores/byokStore';
import { useMessagesStore } from '@/store/messagesStore';
import { createACSTemplateVariables } from '@/utils/templateVariables';

export interface UseACSChatMessagesOptions {
    debug?: boolean;
}

export interface UseACSChatMessagesReturn {
    // State
    messages: ChatMessage[];
    isLoading: boolean;
    hasStreamingMessage: boolean;
    sseEvents: SSEEvent[];
    error: string | null;

    // Actions
    sendMessage: (
        message: string,
        options?: {
            agentConfigName?: string;
            agentConfigId?: string;
            modelApiKeys?: Record<string, string>;
            agentCwd?: string; // 👈 ADD AGENT CWD TO INTERFACE
        }
    ) => Promise<void>;
    startConversation: (
        message: string,
        options?: {
            sessionName?: string;
            agentConfigName?: string;
            agentConfigId?: string;
            modelApiKeys?: Record<string, string>;
            fast?: boolean;
            optimistic?: boolean;
            sessionId?: string;
            tempSessionId?: string;
            modelId?: string;
            projectPath?: string; // 👈 ADD THIS FIELD
        }
    ) => Promise<string>;
    clearMessages: () => void;
    clearError: () => void;
    processSSEEvent: (event: SSEEvent) => void;
    cancelCurrentConversation: () => Promise<void>;
}

/**
 * Hook for managing ACS chat messages and SSE events
 * Handles message sending, receiving, and real-time updates
 */
export const useACSChatMessages = (
    acsClient: OrchestACSClient,
    sessionId: string | undefined,
    userId: string | undefined,
    options: UseACSChatMessagesOptions = {}
): UseACSChatMessagesReturn => {
    const { debug = false } = options;

    // Zustand store state
    const messages = useMessagesStore(state => state.messages);
    const isLoading = useMessagesStore(state => state.isLoading);
    const hasStreamingMessage = useMessagesStore(state => state.hasStreamingMessage);
    const sseEvents = useMessagesStore(state => state.sseEvents);

    // Zustand store actions
    const setMessages = useMessagesStore(state => state.setMessages);
    const setLoading = useMessagesStore(state => state.setLoading);
    const setStreamingMessage = useMessagesStore(state => state.setStreamingMessage);
    const pushSseEvent = useMessagesStore(state => state.pushSseEvent);
    const clearMessages = useMessagesStore(state => state.clearMessages);
    const clearSseEvents = useMessagesStore(state => state.clearSseEvents);

    // Local error state (not moved to store yet)
    const [error, setError] = useState<string | null>(null);

    // // Debug logging for SSE events
    // useEffect(() => {
    //     // if (debug) {
    //     //     console.log('🔍 [useACSChatMessages] SSE events state changed:', {
    //     //         count: sseEvents.length,
    //     //         events: sseEvents,
    //     //         timestamp: new Date().toISOString()
    //     //     });
    //     // }
    // }, [sseEvents, debug]);

    // // Debug logging for messages
    // useEffect(() => {
    //     // if (debug) {
    //     //     console.log('🚨 [MSG-FLOW] 🎯 REACT: Messages state changed in useACSChatMessages!', {
    //     //         messagesCount: messages.length,
    //     //         messageIds: messages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length, isStreaming: m.isStreaming })),
    //     //         timestamp: new Date().toISOString()
    //     //     });
    //     // }
    // }, [messages, debug]);

    // Process SSE event
    const processSSEEvent = useCallback(
        (event: SSEEvent) => {
            if (debug) {
                console.log('📡 [useACSChatMessages] Processing SSE event:', {
                    type: event.type,
                    sessionId: event.sessionId,
                    messageId: event.messageId,
                    timestamp: new Date().toISOString()
                });
            }

            // Store event for debug panel (Zustand handles the MAX limit internally)
            pushSseEvent(event);

            // Handle streaming flags
            if (event.type === 'chunk' || event.type === 'token') {
                setStreamingMessage(true);
            }
            if (event.type === 'done') {
                setStreamingMessage(false);
            }

            // Process message-related events
            if (['chunk', 'token', 'tool_call', 'tool_result', 'done'].includes(event.type)) {
                setMessages(draft => {
                    const currentMessages = useMessagesStore.getState().messages;
                    const newMessages = mergeSSEEventIntoMessages(event, currentMessages);

                    if (debug && currentMessages !== newMessages) {
                        console.log('🚨 [MSG-FLOW] ✅ Messages state WILL CHANGE - React will re-render!');
                    }

                    // Replace the entire array with the new messages
                    draft.length = 0;
                    draft.push(...newMessages);
                });
            }
        },
        [debug]
    );

    // Send message
    const sendMessage = useCallback(
        async (
            message: string,
            options: {
                agentConfigName?: string;
                agentConfigId?: string;
                modelApiKeys?: Record<string, string>;
                agentCwd?: string; // 👈 ADD AGENT CWD OPTION
            } = {}
        ) => {
            if (!sessionId || !userId) {
                throw new Error('No active session or user ID');
            }

            try {
                setLoading(true);
                setError(null);

                // Add user message optimistically
                const userMessage: ChatMessage = {
                    id: `user-${Date.now()}`,
                    sessionId: sessionId,
                    role: ChatRole.User,
                    content: [{ type: 'text', text: message }],
                    createdAt: Date.now(),
                    isStreaming: false,
                    thinking: false,
                    delivered: true,
                    read: true
                };

                setMessages(draft => {
                    draft.push(userMessage);
                });

                // Fetch template variables
                const templateVariables = await createACSTemplateVariables();

                // Send message via ACS
                const useStoredKeys = useBYOKStore.getState().useStoredKeysPreference;
                await acsClient.core.sendMessage(sessionId, message, userId, options.agentConfigId || 'general', {
                    modelApiKeys: options.modelApiKeys,
                    useStoredKeys,
                    templateVariables,
                    ...(options.agentCwd && { agentCwd: options.agentCwd }) // 👈 INCLUDE AGENT CWD
                });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
                setError(errorMessage);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [sessionId, userId, acsClient]
    );

    // Start conversation
    const startConversation = useCallback(
        async (
            message: string,
            options: {
                sessionName?: string;
                agentConfigName?: string;
                agentConfigId?: string;
                modelApiKeys?: Record<string, string>;
                fast?: boolean;
                optimistic?: boolean;
                sessionId?: string;
                tempSessionId?: string;
                modelId?: string;
                projectPath?: string; // 👈 ADD THIS FIELD
            } = {}
        ) => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const optimistic = options.optimistic ?? false;
            const requestedId = options.sessionId || (optimistic ? options.tempSessionId : undefined);
            const tempId = optimistic ? requestedId || `temp-${Date.now()}-${Math.random()}` : undefined;

            try {
                setLoading(true);
                setError(null);

                // Optimistic UI updates
                if (optimistic && tempId) {
                    const userMsg: ChatMessage = {
                        id: `user-${Date.now()}`,
                        sessionId: tempId,
                        role: ChatRole.User,
                        content: [{ type: 'text', text: message }],
                        createdAt: Date.now(),
                        isStreaming: false,
                        delivered: false,
                        read: true,
                        thinking: false
                    };

                    setMessages(draft => {
                        draft.push(userMsg);
                    });

                    // 🔌 ALSO feed the canonical event store so ChatMain sees it
                    import('@/stores/eventStore').then(({ useEventStore }) => {
                        useEventStore.getState().addEvent({
                            id: userMsg.id,
                            kind: 'message',
                            role: 'user',
                            content: userMsg.content,
                            createdAt: new Date(userMsg.createdAt).toISOString(),
                            sessionId: tempId,
                            partial: false,
                            source: 'sse' // Using 'sse' instead of 'optimistic' for compatibility
                        });
                    });
                }

                // Fetch template variables
                const templateVariables = await createACSTemplateVariables();

                // Send to ACS
                const useStoredKeys = useBYOKStore.getState().useStoredKeysPreference;
                const res = await acsClient.core.startConversation(message, userId, options.agentConfigId || 'general', {
                    ...(options.modelApiKeys && { modelApiKeys: options.modelApiKeys }),
                    useStoredKeys,
                    agentCwd: options.projectPath || '/tmp', // 👈 USE PROJECT PATH
                    ...(requestedId && { sessionId: requestedId }),
                    templateVariables,
                    ...(options.modelId && {
                        overrides: {
                            model_id: options.modelId
                        }
                    })
                });

                const realId = res.data.session_id!;

                // Reconcile optimistic updates
                if (optimistic && tempId && tempId !== realId) {
                    setMessages(draft => {
                        draft.forEach(m => {
                            if (m.sessionId === tempId) {
                                m.sessionId = realId;
                                m.delivered = true;
                            }
                        });
                    });
                }

                return realId;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation';
                setError(errorMessage);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [userId, acsClient]
    );

    // Clear messages when session changes
    useEffect(() => {
        if (sessionId) {
            // Clear seen event IDs when switching sessions
            clearEventMergerSeenIds();
        }
    }, [sessionId]);

    // Clear messages (now using store actions)
    const clearMessagesLocal = useCallback(() => {
        clearMessages();
        clearSseEvents();
        setStreamingMessage(false);
    }, [clearMessages, clearSseEvents, setStreamingMessage]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Cancel current conversation
    const cancelCurrentConversation = useCallback(async () => {
        const startTime = Date.now();
        console.log('🚫 [CANCEL-CONVERSATION] Function called at:', new Date().toISOString());
        console.log('🚫 [CANCEL-CONVERSATION] Parameters check:', {
            hasAcsClient: !!acsClient,
            acsClientType: typeof acsClient,
            sessionId: sessionId,
            sessionIdType: typeof sessionId,
            userId: userId,
            userIdType: typeof userId
        });

        if (!acsClient) {
            console.warn('🚫 [CANCEL-CONVERSATION] ❌ ABORT: No acsClient available');
            return;
        }

        if (!sessionId) {
            console.warn('🚫 [CANCEL-CONVERSATION] ❌ ABORT: No sessionId available');
            return;
        }

        console.log('🚫 [CANCEL-CONVERSATION] ✅ Prerequisites met, proceeding with cancellation...');
        console.log('🚫 [CANCEL-CONVERSATION] 📡 About to call acsClient.core.cancelConversation with sessionId:', sessionId);

        try {
            console.log('🚫 [CANCEL-CONVERSATION] 🔄 Making API call to cancel conversation...');
            const result = await acsClient.core.cancelConversation(sessionId);
            const duration = Date.now() - startTime;

            console.log('🚫 [CANCEL-CONVERSATION] ✅ SUCCESS: Conversation cancelled successfully!', {
                sessionId: sessionId,
                duration: `${duration}ms`,
                result: result,
                timestamp: new Date().toISOString()
            });

            console.log('🚫 [CANCEL-CONVERSATION] 📊 API Response details:', {
                resultType: typeof result,
                resultValue: result,
                hasData: result && typeof result === 'object' && 'data' in result,
                resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A'
            });
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('🚫 [CANCEL-CONVERSATION] ❌ FAILED: Cancel conversation failed!', {
                sessionId: sessionId,
                duration: `${duration}ms`,
                error: error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : 'No stack trace',
                errorType: typeof error,
                timestamp: new Date().toISOString()
            });

            // Log additional error details if available
            if (error && typeof error === 'object') {
                console.error('🚫 [CANCEL-CONVERSATION] 🔍 Error object details:', {
                    errorKeys: Object.keys(error),
                    errorName: (error as any).name,
                    errorCode: (error as any).code,
                    errorStatus: (error as any).status,
                    errorResponse: (error as any).response,
                    errorData: (error as any).data
                });
            }

            // TODO: Consider setting error state for UI feedback
            // setError(`Failed to cancel conversation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [acsClient, sessionId, userId]);

    return {
        // State
        messages,
        isLoading,
        hasStreamingMessage,
        sseEvents,
        error,

        // Actions
        sendMessage,
        startConversation,
        clearMessages: clearMessagesLocal,
        clearError,
        processSSEEvent,
        cancelCurrentConversation
    };
};
