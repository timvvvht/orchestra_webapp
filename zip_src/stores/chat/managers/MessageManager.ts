// src/stores/chat/managers/MessageManager.ts

import * as ChatService from '@/services/supabase/chatService';
import * as ChatApi from '@/api/chatApi';
import { ChatRole } from '@/types/chatTypes';
import type { ChatMessage, DbNewChatMessage, TextPart } from '@/types/chatTypes'; // Added DbNewChatMessage
import type { ChatStoreState, StateSetter } from '../state/chatState';
import { useAgentConfigStore } from '@/stores/agentConfigStore'; // For fetching full AgentConfigBE
import { SessionManager } from './SessionManager';
import { hydrateSession } from '@/stores/eventBridges/historyBridge'; // Canonical Event Store integration
// import { OrchestraSCM } from '@/services/scm/trimmed/OrchestraSCM';

// Ensure MessageLoadingState is properly defined and used consistently
// This was duplicated, ensure only one definition is used, preferably in a shared types file or here if scoped.
// For now, I'll keep one here.
export interface MessageLoadingState {
    hasMore: boolean;
    isLoadingMore: boolean;
    totalLoaded: number;
    lastLoadedTimestamp?: number; // Unix timestamp (milliseconds)
}

export interface SendMessageOptions {
    targetSessionId?: string;
    codingMode?: {
        enabled: boolean;
        codebasePath?: string;
    };
}

export class MessageManager {
    constructor(
        private getState: () => ChatStoreState,
        private setState: StateSetter,
        private sessionManager: SessionManager // Added SessionManager dependency
    ) {}

    async sendMessage(content: string, options: SendMessageOptions = {}): Promise<void> {
        const useStatelessApproach = true; // Set to true to use the new path

        console.log('[MessageManager] sendMessage: Starting', {
            contentPreview: content.substring(0, 50),
            options,
            currentSessionId: this.getState().currentSessionId,
            usingStateless: useStatelessApproach
        });

        const sessionIdToUse = options.targetSessionId || this.getState().currentSessionId;
        if (!sessionIdToUse) {
            console.error('[MessageManager] sendMessage: No session ID available.');
            this.setState(state => {
                // Consider adding a general error message to a global error state or UI
                return state;
            });
            return;
        }

        const currentChatSession = this.getState().chats[sessionIdToUse];
        if (!currentChatSession) {
            console.error(`[MessageManager] sendMessage: Chat session ${sessionIdToUse} not found in store.`);
            return;
        }

        // Create the user message object
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sessionId: sessionIdToUse,
            role: ChatRole.User,
            content: [{ type: 'text', text: content } as TextPart],
            createdAt: Date.now(),
            status: 'sending',
        };

        // Optimistically update UI
        this.setState(state => {
            const chat = state.chats[sessionIdToUse];
            if (!chat) return state; // Should not happen if currentChatSession was found
            const newMessages = [...chat.messages, userMessage];
            const updatedChat = { ...chat, messages: newMessages, lastUpdated: userMessage.createdAt };
            const updatedSessionMeta = state.sessions[sessionIdToUse]
                ? { ...state.sessions[sessionIdToUse], lastUpdated: userMessage.createdAt, unreadCount: 0 }
                : undefined;
            return {
                chats: { ...state.chats, [sessionIdToUse]: updatedChat },
                ...(updatedSessionMeta && { sessions: { ...state.sessions, [sessionIdToUse]: updatedSessionMeta } })
            };
        });

        // Persist user message to Supabase
            let savedUserMessage: ChatMessage;
            try {
                // Ensure prepareMessageForChatService is appropriate for what saveChatMessage expects
                savedUserMessage = await ChatService.saveChatMessage(this.prepareMessageForChatService(userMessage));
                this.updateMessageInStore(sessionIdToUse, userMessage.id, { // Update original optimistic message
                    status: 'persisted_db', 
                    id: savedUserMessage.id, // Use DB ID
                    createdAt: savedUserMessage.createdAt // Use DB timestamp
                });
            } catch (dbError) {
                console.error(`[MessageManager] Error saving message ${userMessage.id}:`, dbError);
                this.updateMessageInStore(sessionIdToUse, userMessage.id, { status: 'error', error: (dbError as Error).message });
                return;
            }

        // Create SCM checkpoint if non-default CWD is provided
        if (currentChatSession.agent_cwd && currentChatSession.agent_cwd.trim() !== '') {
            try {
                console.log(`[MessageManager] Creating SCM checkpoint for message in session ${sessionIdToUse} with CWD: ${currentChatSession.agent_cwd}`);
                // const scm = await OrchestraSCM.create();
                // const checkpointHash = await scm.checkpoint(currentChatSession.agent_cwd, `Message sent: ${content.substring(0, 50)}...`);
                const checkpointHash = 'mock-checkpoint-hash';
                
                if (checkpointHash !== 'no-changes') {
                    console.log(`[MessageManager] ✅ Created SCM checkpoint ${checkpointHash.substring(0, 8)} for message in session ${sessionIdToUse}`);
                } else {
                    console.log(`[MessageManager] No changes to checkpoint for message in session ${sessionIdToUse}`);
                }
            } catch (scmError) {
                console.error(`[MessageManager] Failed to create SCM checkpoint for message in session ${sessionIdToUse}:`, scmError);
                // Don't throw here - message was saved successfully, SCM checkpoint is optional
            }
        } else {
            console.log(`[MessageManager] Skipping SCM checkpoint for message in session ${sessionIdToUse} - no CWD provided or default CWD`);
        }

        if (useStatelessApproach) {
            console.log(`[MessageManager] Using STATELESS approach for session ${sessionIdToUse}`);
            if (!currentChatSession.agent_config_id) {
                const errorText = 'Agent configuration ID is missing.';
                console.error(`[MessageManager] STATELESS: ${errorText} (Message ID: ${userMessage.id}, Session: ${sessionIdToUse})`);
                this.updateMessageInStore(sessionIdToUse, userMessage.id, { status: 'error', error: errorText });
                return;
            }

            const fullAgentConfig = useAgentConfigStore.getState().agentConfigs[currentChatSession.agent_config_id];
            if (!fullAgentConfig) {
                const errorText = `Agent configuration data not found for ID ${currentChatSession.agent_config_id}.`;
                console.error(`[MessageManager] STATELESS: ${errorText} (Message ID: ${userMessage.id}, Session: ${sessionIdToUse})`);
                this.updateMessageInStore(sessionIdToUse, userMessage.id, { status: 'error', error: errorText });
                return;
            }



        let historyToSend: ChatMessage[];
        let chatSessionForHistory = this.getState().chats[sessionIdToUse]!; // Re-fetch state for safety
        let currentFullHistory = chatSessionForHistory.fullHistory;
        let historyStatus = chatSessionForHistory.fullHistoryStatus;

        if (historyStatus !== 'loaded' && historyStatus !== 'loading') {
            this.setState(s => {
                const chat = s.chats[sessionIdToUse];
                return chat ? { ...s, chats: { ...s.chats, [sessionIdToUse]: { ...chat, fullHistoryStatus: 'loading' }}} : s;
            });
            try {
                const allMessagesFromDb = await ChatService.getAllChatMessages(sessionIdToUse); // Returns ChatMessage[]
                
                // Ensure the just-saved userMessage is present in the full history fetched from DB
                const finalHistory = allMessagesFromDb.some(m => m.id === savedUserMessage.id) 
                                   ? allMessagesFromDb 
                                   : [...allMessagesFromDb, savedUserMessage];

                this.setState(s => {
                    const chat = s.chats[sessionIdToUse];
                    // Ensure chat exists before trying to spread it for state update
                    return chat ? { ...s, chats: { ...s.chats, [sessionIdToUse]: { ...chat, fullHistory: finalHistory, fullHistoryStatus: 'loaded' }}} : s;
                });
                // Re-fetch from state to ensure `currentFullHistory` has the latest after async operations and setState
                currentFullHistory = this.getState().chats[sessionIdToUse]?.fullHistory;
            } catch (fetchHistoryError) {
                 const errorText = 'Failed to fetch full chat history for AI.';
                 console.error(`[MessageManager] STATELESS: ${errorText}`, fetchHistoryError);
                 this.updateMessageInStore(sessionIdToUse, savedUserMessage.id, { status: 'error', error: errorText });
                 return; // Critical: return here after error
            }
        } else if (historyStatus === 'loading') {
            console.warn('[MessageManager] Full history is currently loading. Aborting send for now to prevent race. Try again shortly.');
            this.updateMessageInStore(sessionIdToUse, savedUserMessage.id, { status: 'error', error: 'History loading, try again shortly.' });
            return; // Critical: return here
        } else if (historyStatus === 'loaded' && currentFullHistory) { 
            // Status is 'loaded', ensure savedUserMessage is in it 
            // (it should be if getAllChatMessages was called after save, or if EventManager correctly added it previously)
            const messageExists = currentFullHistory.some(m => m.id === savedUserMessage.id);
            if (!messageExists) {
                const updatedFullHistoryWithUserMsg = [...currentFullHistory, savedUserMessage];
                this.setState(s => {
                    const chat = s.chats[sessionIdToUse];
                    return chat ? { ...s, chats: { ...s.chats, [sessionIdToUse]: { ...chat, fullHistory: updatedFullHistoryWithUserMsg }}} : s;
                });
                currentFullHistory = updatedFullHistoryWithUserMsg; 
            }
        }

        if (!currentFullHistory) { 
            const errorText = 'Failed to obtain full history for AI context after attempting load.';
            console.error(`[MessageManager] STATELESS: ${errorText}`);
            this.updateMessageInStore(sessionIdToUse, savedUserMessage.id, { status: 'error', error: errorText });
            return; // Critical: return here
        }

        historyToSend = currentFullHistory.filter(m => m.id !== savedUserMessage.id);

            try {
                await ChatApi.invokeSendMessageStateless(sessionIdToUse, fullAgentConfig, historyToSend, savedUserMessage);
                this.updateMessageInStore(sessionIdToUse, savedUserMessage.id, { status: 'sent' });
                // MVP: Assistant msgs not added to fullHistory here. This is a known post-MVP task for EventManager.
            } catch (error) {
                const errorText = `Error sending message to agent.`;
                console.error(`[MessageManager] STATELESS: ${errorText}`, error);
                this.updateMessageInStore(sessionIdToUse, savedUserMessage.id, { status: 'error', error: errorText });
            }
        } else {
            // Existing stateful approach (currently leads to hang, and sendToBackendWithRecovery was removed in this cleanup)
            console.warn(
                `[MessageManager] Attempted to use old stateful send_message path for session ${sessionIdToUse}, which is currently problematic and not fully implemented in this version.`
            );
            const errorText = 'Old stateful send_message path is disabled.';
            this.addErrorMessageToChat(sessionIdToUse, errorText);
            // throw new Error(errorText); // Or just show error in UI
        }
    }

    // Helper to add an error message to the chat UI
    private addErrorMessageToChat(sessionId: string, errorContent: string): void {
        this.setState(state => {
            const chat = state.chats[sessionId];
            if (!chat) return state;
            const errorMsg: ChatMessage = {
                id: crypto.randomUUID(),
                sessionId: sessionId,
                role: ChatRole.Error,
                content: [{ type: 'text', text: errorContent }],
                createdAt: Date.now()
            };
            return { chats: { ...state.chats, [sessionId]: { ...chat, messages: [...chat.messages, errorMsg] } } };
        });
    }

    private updateMessageInStore(sessionId: string, messageId: string, updates: Partial<ChatMessage>): void {
        this.setState(state => {
            const chat = state.chats[sessionId];
            if (!chat) return state;

            const updatedMessages = chat.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            );

            return {
                chats: {
                    ...state.chats,
                    [sessionId]: {
                        ...chat,
                        messages: updatedMessages,
                    },
                },
            };
        });
    }

    // This maps the ChatMessage from the store to the DbNewChatMessage for Supabase.
    // Ensure DbNewChatMessage type is correctly defined and imported.
    private prepareMessageForChatService(storeMsg: ChatMessage): Omit<ChatMessage, 'id' | 'createdAt'> {
        // This function now prepares a ChatMessage suitable for ChatService,
        // which should then handle mapping to the DB schema (e.g., sessionId -> session_id)
        return {
            sessionId: storeMsg.sessionId, // Use camelCase 'sessionId'
            role: storeMsg.role,           // Already ChatRole enum, should be fine
            content: storeMsg.content,     // Pass RichContentPart[] as is
            model: storeMsg.model,         // Pass model as is
            // Any other fields from ChatMessage that are NOT id or timestamp and ARE expected by Omit<ChatMessage...>
            // For example, if ChatMessage has 'status', 'delivered', 'read', etc., and they are part of the Omit type.
            // Based on typical Omit usage, only core data fields are usually included.
        };
    }

    getMessagesForSession(sessionId: string): ChatMessage[] {
        // Ensure sessionManager is available and getSession exists and works.
        // This was previously `this.sessionManager.getSession(sessionId)`
        // If sessionManager is passed in constructor, this should be fine.
        // If getSession is not on SessionManager, this needs to point to the correct store access.
        // Assuming getSession is a method on the passed sessionManager instance.
        const currentChat = this.getState().chats[sessionId];
        return currentChat?.messages || [];
    }

    getMessageLoadingState(sessionId: string): string {
        // Changed return type to string as per ChatStore interface
        const loadingState = this.getState().messagesLoadingState[sessionId];
        if (typeof loadingState === 'string') return loadingState; // if it's already 'loading', 'loaded', 'error'
        return 'idle'; // Default if no specific state found
    }

    async loadInitialMessagesForSession(sessionId: string, limit: number = 30): Promise<void> {
        console.log(`[MessageManager] loadInitialMessagesForSession for ${sessionId}, limit ${limit}`);
        this.setState(prevState => ({
            messagesLoadingState: { ...prevState.messagesLoadingState, [sessionId]: 'loading' },
            messageLoadingMeta: {
                ...(prevState.messageLoadingMeta[sessionId] || { hasMore: true, totalLoaded: 0 }),
                isLoadingMore: true,
            }
        }));

        try {
            const messagesNewestFirst = await ChatService.getChatMessages(sessionId, {
                limit,
                orderBy: { column: 'timestamp', ascending: false } 
            });
            const chronologicalMessages = messagesNewestFirst.reverse();

            // 🔥 CANONICAL EVENT STORE INTEGRATION
            // Hydrate the event store with Supabase history for this session
            try {
                await hydrateSession(sessionId);
                console.log(`[MessageManager] ✅ Hydrated canonical store for session ${sessionId}`);
            } catch (bridgeError) {
                console.warn('[MessageManager] Failed to hydrate canonical store (non-critical):', bridgeError);
                // Continue with normal flow - canonical store is optional
            }

            this.setState(prevState => {
                const chat = prevState.chats[sessionId];
                if (!chat) { console.warn('[MM] Session disappeared during initial load'); return prevState; }
                return {
                    chats: { 
                        ...prevState.chats, 
                        [sessionId]: { 
                            ...chat, 
                            messages: chronologicalMessages,
                            fullHistory: undefined, // Reset fullHistory (Warning #3 Fix)
                            fullHistoryStatus: 'idle', // Reset its status
                        }
                    },
                    messagesLoadingState: { ...prevState.messagesLoadingState, [sessionId]: 'loaded' },
                    messageLoadingMeta: {
                        ...(prevState.messageLoadingMeta[sessionId] || {}),
                        hasMore: messagesNewestFirst.length === limit, 
                        isLoadingMore: false,
                        totalLoaded: chronologicalMessages.length,
                        lastLoadedTimestamp: chronologicalMessages.length > 0 ? chronologicalMessages[0]?.createdAt : undefined
                    }
                };
            });
        } catch (error) {
            console.error(`[MessageManager] Error loading initial messages for ${sessionId}:`, error);
            this.setState(prevState => ({
                messagesLoadingState: { ...prevState.messagesLoadingState, [sessionId]: 'error' },
                messageLoadingMeta: { 
                    ...(prevState.messageLoadingMeta[sessionId] || { hasMore: false, totalLoaded: 0 }), 
                    isLoadingMore: false 
                }
            }));
        }
    }

    async loadMoreMessagesForSession(sessionId: string, limit: number = 20): Promise<void> {
        const state = this.getState();
        const loadingMeta = state.messageLoadingMeta[sessionId];

        if (!loadingMeta?.hasMore || loadingMeta.isLoadingMore) return;

        this.setState(prevState => ({ ...prevState, messageLoadingMeta: { ...prevState.messageLoadingMeta, [sessionId]: { ...loadingMeta, isLoadingMore: true }}}));

        try {
            const lastLoadedTsNumber = loadingMeta.lastLoadedTimestamp;
            if (typeof lastLoadedTsNumber !== 'number') {
                console.warn("[MessageManager] loadMore: lastLoadedTimestamp is missing or not a number.");
                this.setState(prevState => ({ ...prevState, messageLoadingMeta: { ...prevState.messageLoadingMeta, [sessionId]: { ...loadingMeta, isLoadingMore: false, hasMore: false }}}));
                return;
            }

            const olderMessagesNewestFirst = await ChatService.getChatMessages(sessionId, {
                limit,
                orderBy: { column: 'timestamp', ascending: false },
                cursor: { timestamp: new Date(lastLoadedTsNumber).toISOString(), direction: 'olderThan' }
            });
            const chronologicalOlderMessages = olderMessagesNewestFirst.reverse();

            this.setState(prevState => {
                const chat = prevState.chats[sessionId];
                if (!chat) { console.warn('[MM] Session disappeared during load more'); return prevState; }
                const updatedMessages = [...chronologicalOlderMessages, ...chat.messages];
                return {
                    chats: { ...prevState.chats, [sessionId]: { ...chat, messages: updatedMessages }},
                    messageLoadingMeta: {
                        ...(prevState.messageLoadingMeta[sessionId] || {}),
                        hasMore: chronologicalOlderMessages.length === limit,
                        isLoadingMore: false,
                        totalLoaded: updatedMessages.length,
                        lastLoadedTimestamp: chronologicalOlderMessages.length > 0 ? chronologicalOlderMessages[0]?.createdAt : lastLoadedTsNumber
                    }
                };
            });
        } catch (error) {
            console.error(`[MessageManager] Error loading more messages for ${sessionId}:`, error);
            this.setState(prevState => ({ ...prevState, messageLoadingMeta: { ...prevState.messageLoadingMeta, [sessionId]: { ...loadingMeta, isLoadingMore: false }}}));
        }
    }
}
