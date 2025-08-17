import type {
    ChatMessage,
    SessionMeta,
    ChatSession,
} from '@/types/chatTypes';
import type { MessageLoadingState } from '../managers/MessageManager';

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface ChatStoreState {
    sessions: Record<string, SessionMeta>;
    chats: Record<string, ChatSession>;
    currentSessionId?: string;
    isInitialized: boolean;
    processedEventKeys: Map<string, number>;
    messagesLoadingState: Record<string, LoadingState>;
    messageLoadingMeta: Record<string, MessageLoadingState>;
    
    // Debug state
    isDebugMode: boolean;
}

export const createChatState = (): ChatStoreState => ({
    sessions: {},
    chats: {},
    isInitialized: false,
    processedEventKeys: new Map<string, number>(),
    messagesLoadingState: {},
    messageLoadingMeta: {},
    
    // Debug state
    isDebugMode: false
});

export type StateUpdater = (state: ChatStoreState) => Partial<ChatStoreState>;
export type StateSetter = (updater: StateUpdater | Partial<ChatStoreState>) => void;