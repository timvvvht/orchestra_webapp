/**
 * New Chat Handler - Integrates worktree creation with chat session management
 *
 * This module provides the `startNewChat` function that:
 * 1. Creates a new worktree using the Tauri `create_worktree` command
 * 2. Creates a new chat session with the workspace path set as agent_cwd
 * 3. Returns both sessionId and workspacePath for further use
 */

import { invoke } from '@tauri-apps/api/core';
import { useChatStore } from '@/stores/chat';
import { v4 as uuidv4 } from 'uuid';

export interface StartNewChatResult {
    sessionId: string;
    workspacePath: string;
}

export interface StartNewChatOptions {
    agentConfigId?: string;
    sessionName?: string;
    agentCwd?: string; // Optional override for workspace path
}

/**
 * Starts a new chat session with an associated worktree workspace
 *
 * @param options Configuration options for the new chat session
 * @returns Promise resolving to sessionId and workspacePath
 */
export async function startNewChat(options: StartNewChatOptions = {}): Promise<StartNewChatResult> {
    console.log('[NewChatHandler] Starting new chat with options:', options);

    try {
        // Generate a unique session ID
        const sessionId = uuidv4();
        console.log('[NewChatHandler] Generated session ID:', sessionId);

        // Step 1: Create worktree using Tauri command
        let workspacePath: string;

        if (options.agentCwd) {
            // Use provided workspace path
            workspacePath = options.agentCwd;
            console.log('[NewChatHandler] Using provided workspace path:', workspacePath);
        } else {
            // Create new worktree
            console.log('[NewChatHandler] Creating worktree for session:', sessionId);
            workspacePath = await invoke<string>('create_worktree', {
                sessionId: sessionId
            });
            console.log('[NewChatHandler] Worktree created at:', workspacePath);
        }

        // Step 2: Create chat session with workspace path as agent_cwd
        const chatStore = useChatStore.getState();

        const sessionName = options.sessionName || 'New Chat';
        const agentConfigId = options.agentConfigId || 'General'; // Default agent

        console.log('[NewChatHandler] Creating chat session with workspace path as agent_cwd');

        // Create session with workspace path set as agent_cwd
        const createdSessionId = await chatStore.createSession(sessionId, sessionName, {
            agent_cwd: workspacePath, // Set the workspace path as agent working directory
            avatar: 'assets/robots/robot1.png',
            specialty: 'General Assistant',
            model: 'gpt-4o-mini',
            tools: [],
            systemPrompt: 'You are a helpful assistant with access to a dedicated workspace.',
            temperature: 0.7
        });

        console.log('[NewChatHandler] Chat session created with ID:', createdSessionId);
        console.log('[NewChatHandler] Session workspace path set to:', workspacePath);

        // Verify the session was created with the correct agent_cwd
        const session = chatStore.getSession(createdSessionId);
        if (session && session.agent_cwd === workspacePath) {
            console.log('[NewChatHandler] ✅ Session created successfully with workspace path');
        } else {
            console.warn('[NewChatHandler] ⚠️ Session created but workspace path may not be set correctly');
        }

        return {
            sessionId: createdSessionId,
            workspacePath: workspacePath
        };
    } catch (error) {
        console.error('[NewChatHandler] Failed to start new chat:', error);
        throw new Error(`Failed to start new chat: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Utility function to get the workspace path for an existing session
 *
 * @param sessionId The session ID to get workspace path for
 * @returns The workspace path if available, null otherwise
 */
export function getSessionWorkspacePath(sessionId: string): string | null {
    const chatStore = useChatStore.getState();
    const session = chatStore.getSession(sessionId);
    return session?.agent_cwd || null;
}

/**
 * Utility function to update the workspace path for an existing session
 *
 * @param sessionId The session ID to update
 * @param workspacePath The new workspace path
 */
export function updateSessionWorkspacePath(sessionId: string, workspacePath: string): void {
    const chatStore = useChatStore.getState();
    const session = chatStore.getSession(sessionId);

    if (!session) {
        throw new Error(`Session ${sessionId} not found`);
    }

    // Update the session with new workspace path
    // Note: This would require extending the SessionManager with an update method
    console.log('[NewChatHandler] Updating session workspace path:', { sessionId, workspacePath });
    console.warn('[NewChatHandler] Session workspace path update not yet implemented in SessionManager');
}

/**
 * Utility function to check if a session has a workspace path set
 *
 * @param sessionId The session ID to check
 * @returns True if session has a workspace path, false otherwise
 */
export function sessionHasWorkspace(sessionId: string): boolean {
    const workspacePath = getSessionWorkspacePath(sessionId);
    return workspacePath !== null && workspacePath.trim() !== '';
}
