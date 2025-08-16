/**
 * Tests for newChatHandler.ts
 * 
 * These tests verify the integration between worktree creation and chat session management.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { startNewChat, getSessionWorkspacePath, sessionHasWorkspace } from '../newChatHandler';

// Mock the Tauri invoke function
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
    invoke: mockInvoke
}));

// Mock the chat store
const mockCreateSession = jest.fn();
const mockGetSession = jest.fn();
const mockChatStore = {
    createSession: mockCreateSession,
    getSession: mockGetSession
};

jest.mock('@/stores/chat', () => ({
    useChatStore: {
        getState: () => mockChatStore
    }
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: () => 'test-session-id-123'
}));

describe('newChatHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('startNewChat', () => {
        it('should create a worktree and chat session successfully', async () => {
            // Arrange
            const mockWorkspacePath = '/path/to/workspace/test-session-id-123';
            mockInvoke.mockResolvedValue(mockWorkspacePath);
            mockCreateSession.mockResolvedValue('test-session-id-123');

            // Act
            const result = await startNewChat();

            // Assert
            expect(mockInvoke).toHaveBeenCalledWith('create_worktree', {
                sessionId: 'test-session-id-123'
            });
            
            expect(mockCreateSession).toHaveBeenCalledWith(
                'General', // default agent
                'New Chat', // default name
                expect.objectContaining({
                    agent_cwd: mockWorkspacePath,
                    avatar: 'assets/robots/robot1.png',
                    specialty: 'General Assistant',
                    model: 'gpt-4o-mini',
                    tools: [],
                    systemPrompt: 'You are a helpful assistant with access to a dedicated workspace.',
                    temperature: 0.7
                })
            );

            expect(result).toEqual({
                sessionId: 'test-session-id-123',
                workspacePath: mockWorkspacePath
            });
        });

        it('should use provided options when creating session', async () => {
            // Arrange
            const mockWorkspacePath = '/path/to/workspace/test-session-id-123';
            mockInvoke.mockResolvedValue(mockWorkspacePath);
            mockCreateSession.mockResolvedValue('test-session-id-123');

            const options = {
                agentConfigId: 'CustomAgent',
                sessionName: 'Custom Session Name'
            };

            // Act
            const result = await startNewChat(options);

            // Assert
            expect(mockCreateSession).toHaveBeenCalledWith(
                'CustomAgent',
                'Custom Session Name',
                expect.objectContaining({
                    agent_cwd: mockWorkspacePath
                })
            );

            expect(result).toEqual({
                sessionId: 'test-session-id-123',
                workspacePath: mockWorkspacePath
            });
        });

        it('should use provided agent_cwd instead of creating worktree', async () => {
            // Arrange
            const providedWorkspacePath = '/custom/workspace/path';
            mockCreateSession.mockResolvedValue('test-session-id-123');

            const options = {
                agentCwd: providedWorkspacePath
            };

            // Act
            const result = await startNewChat(options);

            // Assert
            expect(mockInvoke).not.toHaveBeenCalled(); // Should not create worktree
            
            expect(mockCreateSession).toHaveBeenCalledWith(
                'General',
                'New Chat',
                expect.objectContaining({
                    agent_cwd: providedWorkspacePath
                })
            );

            expect(result).toEqual({
                sessionId: 'test-session-id-123',
                workspacePath: providedWorkspacePath
            });
        });

        it('should handle worktree creation failure', async () => {
            // Arrange
            const error = new Error('Failed to create worktree');
            mockInvoke.mockRejectedValue(error);

            // Act & Assert
            await expect(startNewChat()).rejects.toThrow('Failed to start new chat: Failed to create worktree');
        });

        it('should handle session creation failure', async () => {
            // Arrange
            const mockWorkspacePath = '/path/to/workspace/test-session-id-123';
            mockInvoke.mockResolvedValue(mockWorkspacePath);
            mockCreateSession.mockRejectedValue(new Error('Failed to create session'));

            // Act & Assert
            await expect(startNewChat()).rejects.toThrow('Failed to start new chat: Failed to create session');
        });
    });

    describe('getSessionWorkspacePath', () => {
        it('should return workspace path for existing session', () => {
            // Arrange
            const sessionId = 'test-session-123';
            const workspacePath = '/path/to/workspace';
            mockGetSession.mockReturnValue({
                id: sessionId,
                agent_cwd: workspacePath
            });

            // Act
            const result = getSessionWorkspacePath(sessionId);

            // Assert
            expect(mockGetSession).toHaveBeenCalledWith(sessionId);
            expect(result).toBe(workspacePath);
        });

        it('should return null for session without workspace path', () => {
            // Arrange
            const sessionId = 'test-session-123';
            mockGetSession.mockReturnValue({
                id: sessionId,
                agent_cwd: null
            });

            // Act
            const result = getSessionWorkspacePath(sessionId);

            // Assert
            expect(result).toBeNull();
        });

        it('should return null for non-existent session', () => {
            // Arrange
            const sessionId = 'non-existent-session';
            mockGetSession.mockReturnValue(null);

            // Act
            const result = getSessionWorkspacePath(sessionId);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('sessionHasWorkspace', () => {
        it('should return true for session with workspace path', () => {
            // Arrange
            const sessionId = 'test-session-123';
            mockGetSession.mockReturnValue({
                id: sessionId,
                agent_cwd: '/path/to/workspace'
            });

            // Act
            const result = sessionHasWorkspace(sessionId);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for session without workspace path', () => {
            // Arrange
            const sessionId = 'test-session-123';
            mockGetSession.mockReturnValue({
                id: sessionId,
                agent_cwd: null
            });

            // Act
            const result = sessionHasWorkspace(sessionId);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for session with empty workspace path', () => {
            // Arrange
            const sessionId = 'test-session-123';
            mockGetSession.mockReturnValue({
                id: sessionId,
                agent_cwd: '   ' // whitespace only
            });

            // Act
            const result = sessionHasWorkspace(sessionId);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for non-existent session', () => {
            // Arrange
            const sessionId = 'non-existent-session';
            mockGetSession.mockReturnValue(null);

            // Act
            const result = sessionHasWorkspace(sessionId);

            // Assert
            expect(result).toBe(false);
        });
    });
});