import { create } from 'zustand';
import { createChatState } from './state/chatState';
import { SessionManager } from './managers/SessionManager';
import { MessageManager } from './managers/MessageManager';
import { EventManager } from './managers/EventManager';
import { InitializationService } from './services/InitializationService';
import type { ChatStoreState } from './state/chatState';
import type { SendMessageOptions } from './managers/MessageManager';
import type { 
    ChatSession, 
    SessionMeta, 
    ChatMessage,
    ForkRequest,
    ForkInfo,
    ConversationAncestry
} from '@/types/chatTypes';

// Define the complete store interface
export interface ChatStore extends ChatStoreState {
    // Initialization
    initialize: () => Promise<void>;
    
    // Session management
    createSession: (agentConfigId: string, name?: string, template?: Partial<ChatSession>) => Promise<string>;
    deleteSession: (sessionId: string) => Promise<void>;
    setCurrentSession: (sessionId: string) => void;
    getCurrentSession: () => ChatSession | undefined;
    getSession: (sessionId: string) => ChatSession | undefined;
    getAllSessions: () => Record<string, ChatSession>;
    getSessionMetas: () => Record<string, SessionMeta>;
    
    // Message management
    sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
    loadMessagesForSession: (sessionId: string) => Promise<void>;
    loadInitialMessagesForSession: (sessionId: string, limit?: number) => Promise<void>;
    loadMoreMessagesForSession: (sessionId: string, limit?: number) => Promise<void>;
    getMessagesForSession: (sessionId: string) => ChatMessage[];
    getMessageLoadingState: (sessionId: string) => string;
    
    // Event management
    cleanupProcessedEventKeys: () => void;
    
    // Debug functionality
    toggleDebugMode: () => void;
    
    // Session restoration
    restoreBackendSession: (sessionId: string, agentConfigId: string) => Promise<void>;
    loadSessionFromSupabase: (sessionId: string) => Promise<ChatSession | null>;
    
    // Legacy methods for backward compatibility (TODO: Remove after migration)
    cloneSession?: (sessionId: string, newName: string) => Promise<string>;
    updateChatSessionConfig?: (sessionId: string, newConfig: any) => void;
    forkConversation?: (parentSessionId: string, messageId: string, name?: string, displayTitle?: string) => Promise<ChatSession>;
    loadForkedMessages?: (sessionId: string) => Promise<void>;
    getConversationForks?: (sessionId: string) => Promise<ForkInfo[]>;
    getForkAncestry?: (sessionId: string) => Promise<ConversationAncestry[]>;
}

export const useChatStore = create<ChatStore>()((set, get) => {
    const state = createChatState();
    
    // Create managers
    const sessionManager = new SessionManager(get, set);
    const messageManager = new MessageManager(get, set, sessionManager);
    const eventManager = new EventManager(get, set, sessionManager);
    const initializationService = new InitializationService(get, set, sessionManager, eventManager);
    
    return {
        ...state,
        
        // Initialization
        initialize: initializationService.initialize.bind(initializationService),
        
        // Session management - delegate to SessionManager
        createSession: sessionManager.createSession.bind(sessionManager),
        deleteSession: sessionManager.deleteSession.bind(sessionManager),
        setCurrentSession: sessionManager.setCurrentSession.bind(sessionManager),
        getCurrentSession: sessionManager.getCurrentSession.bind(sessionManager),
        getSession: sessionManager.getSession.bind(sessionManager),
        getAllSessions: sessionManager.getAllSessions.bind(sessionManager),
        getSessionMetas: sessionManager.getSessionMetas.bind(sessionManager),
        restoreBackendSession: sessionManager.restoreBackendSession.bind(sessionManager),
        loadSessionFromSupabase: sessionManager.loadSessionFromSupabase.bind(sessionManager),
        
        // Message management - delegate to MessageManager
        sendMessage: messageManager.sendMessage.bind(messageManager),
        loadMessagesForSession: messageManager.loadInitialMessagesForSession.bind(messageManager), // Changed to loadInitialMessagesForSession
        loadInitialMessagesForSession: messageManager.loadInitialMessagesForSession.bind(messageManager),
        loadMoreMessagesForSession: messageManager.loadMoreMessagesForSession.bind(messageManager),
        getMessagesForSession: messageManager.getMessagesForSession.bind(messageManager),
        getMessageLoadingState: messageManager.getMessageLoadingState.bind(messageManager),
        
        // Event management - delegate to EventManager
        cleanupProcessedEventKeys: eventManager.cleanupProcessedEventKeys.bind(eventManager),
        
        // Debug functionality
        toggleDebugMode: () => {
            set((state) => ({
                ...state,
                isDebugMode: !state.isDebugMode
            }));
        },
        
        // Legacy methods for backward compatibility
        // These will be implemented later or removed after full migration
        cloneSession: async (sessionId: string, newName: string) => {
            console.warn('[ChatStore] cloneSession not yet implemented in refactored store');
            throw new Error('cloneSession not yet implemented');
        },
        
        updateChatSessionConfig: (sessionId: string, newConfig: any) => {
            console.warn('[ChatStore] updateChatSessionConfig not yet implemented in refactored store');
        },
        
        forkConversation: async (parentSessionId: string, messageId: string, name?: string, displayTitle?: string) => {
            console.warn('[ChatStore] forkConversation not yet implemented in refactored store');
            throw new Error('forkConversation not yet implemented');
        },
        
        loadForkedMessages: async (sessionId: string) => {
            console.warn('[ChatStore] loadForkedMessages not yet implemented in refactored store');
        },
        
        getConversationForks: async (sessionId: string) => {
            console.warn('[ChatStore] getConversationForks not yet implemented in refactored store');
            return [];
        },
        
        getForkAncestry: async (sessionId: string) => {
            console.warn('[ChatStore] getForkAncestry not yet implemented in refactored store');
            return [];
        }
    };
});

// Export managers for direct access if needed
export { SessionManager, MessageManager, EventManager, InitializationService };

// Export types
export type { ChatStore, SendMessageOptions };
export type { ChatStoreState, LoadingState } from './state/chatState';