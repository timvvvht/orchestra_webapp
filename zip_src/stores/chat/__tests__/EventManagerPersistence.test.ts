import { EventManager } from '../managers/EventManager';
import { SessionManager } from '../managers/SessionManager';
import * as ChatService from '@/services/supabase/chatService';
import { ChatRole } from '@/types/chatTypes';
import type { ChatMessage } from '@/types/chatTypes';
import type { ChatStoreState, StateSetter, StateUpdater } from '../state/chatState';

// Mock ChatService
jest.mock('@/services/supabase/chatService', () => ({
    saveChatMessage: jest.fn(),
    saveChatMessageBatch: jest.fn(),
}));

describe('EventManager Persistence', () => {
    let eventManager: EventManager;
    let mockGetState: jest.MockedFunction<() => ChatStoreState>;
    let mockSetState: jest.MockedFunction<StateSetter>;
    let mockSessionManager: SessionManager;
    let saveChatMessageSpy: jest.SpyInstance;
    let saveChatMessageBatchSpy: jest.SpyInstance;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup spies
        saveChatMessageSpy = jest.spyOn(ChatService, 'saveChatMessage').mockResolvedValue({} as any);
        saveChatMessageBatchSpy = jest.spyOn(ChatService, 'saveChatMessageBatch').mockResolvedValue([]);

        // Mock state
        const mockState: ChatStoreState = {
            chats: {
                'session-1': {
                    id: 'session-1',
                    messages: [
                        {
                            id: 'msg-1',
                            sessionId: 'session-1',
                            role: ChatRole.Assistant,
                            content: [{ type: 'tool_use', id: 'tool-1', name: 'test_tool', input: {} }],
                            timestamp: Date.now(),
                            thinking: true,
                            isStreaming: false,
                            model: 'claude-3'
                        }
                    ],
                    displayTitle: 'Test Session',
                    name: 'Test Session',
                    avatar: '',
                    specialty: '',
                    model: 'claude-3',
                    tools: [],
                    createdAt: Date.now(),
                    lastUpdated: Date.now(),
                    systemPrompt: '',
                    temperature: 0.7,
                    user_id: 'user-1',
                    agent_config_id: null,
                    initialAgentSnapshot: null
                }
            },
            sessions: {},
            processedEventKeys: new Map(),
            isInitialized: true,
            messagesLoadingState: {}
        };

        mockGetState = jest.fn().mockReturnValue(mockState);
        mockSetState = jest.fn().mockImplementation((updater: StateUpdater | Partial<ChatStoreState>) => {
            const newState = typeof updater === 'function' ? updater(mockState) : updater;
            Object.assign(mockState, newState);
        });

        mockSessionManager = {} as SessionManager;
        eventManager = new EventManager(mockGetState, mockSetState, mockSessionManager);
    });

    describe('handleDoneEvent refined heuristic', () => {
        it('should persist assistant messages with tool_use that are still thinking', async () => {
            // Arrange
            const payload = {
                type: 'done',
                sessionId: 'session-1',
                messageId: 'unrelated-msg-id' // This won't match any existing message
            };

            // Act
            await (eventManager as any).handleDoneEvent(payload);

            // Assert
            expect(saveChatMessageSpy).toHaveBeenCalledWith({
                sessionId: 'session-1',
                role: ChatRole.Assistant,
                content: [{ type: 'tool_use', id: 'tool-1', name: 'test_tool', input: {} }],
                model: 'claude-3'
            });

            // Verify flags were cleared
            const state = mockGetState();
            const message = state.chats['session-1'].messages[0];
            expect(message.thinking).toBe(false);
            expect(message.isStreaming).toBe(false);
            expect(message.timestamp).toBeGreaterThan(0);
        });

        it('should not persist assistant messages without tool_use', async () => {
            // Arrange - modify state to have a message without tool_use
            const state = mockGetState();
            state.chats['session-1'].messages[0].content = [{ type: 'text', text: 'Hello' }];

            const payload = {
                type: 'done',
                sessionId: 'session-1',
                messageId: 'unrelated-msg-id'
            };

            // Act
            await (eventManager as any).handleDoneEvent(payload);

            // Assert
            expect(saveChatMessageSpy).not.toHaveBeenCalled();
        });
    });

    describe('handleFinalMessageHistoryEvent batch persist', () => {
        it('should batch save only new messages from history', async () => {
            // Arrange
            const payload = {
                type: 'final_message_history',
                sessionId: 'session-1',
                history: [
                    {
                        id: 'msg-1', // existing message
                        role: 'assistant',
                        content: [{ type: 'text', text: 'Existing message' }],
                        timestamp: Date.now(),
                        model: 'claude-3'
                    },
                    {
                        id: 'msg-2', // new message
                        role: 'user',
                        content: [{ type: 'text', text: 'New user message' }],
                        timestamp: Date.now(),
                        model: null
                    },
                    {
                        id: 'msg-3', // new message
                        role: 'assistant',
                        content: [{ type: 'text', text: 'New assistant message' }],
                        timestamp: Date.now(),
                        model: 'claude-3'
                    }
                ]
            };

            // Act
            await (eventManager as any).handleFinalMessageHistoryEvent(payload);

            // Assert
            expect(saveChatMessageBatchSpy).toHaveBeenCalledWith([
                {
                    sessionId: 'session-1',
                    role: ChatRole.User,
                    content: [{ type: 'text', text: 'New user message' }],
                    model: null
                },
                {
                    sessionId: 'session-1',
                    role: ChatRole.Assistant,
                    content: [{ type: 'text', text: 'New assistant message' }],
                    model: 'claude-3'
                }
            ]);

            // Verify state was updated with all 3 messages
            const state = mockGetState();
            expect(state.chats['session-1'].messages).toHaveLength(3);
        });

        it('should not call batch save when no new messages', async () => {
            // Arrange
            const payload = {
                type: 'final_message_history',
                sessionId: 'session-1',
                history: [
                    {
                        id: 'msg-1', // existing message only
                        role: 'assistant',
                        content: [{ type: 'text', text: 'Existing message' }],
                        timestamp: Date.now(),
                        model: 'claude-3'
                    }
                ]
            };

            // Act
            await (eventManager as any).handleFinalMessageHistoryEvent(payload);

            // Assert
            expect(saveChatMessageBatchSpy).not.toHaveBeenCalled();
        });
    });
});