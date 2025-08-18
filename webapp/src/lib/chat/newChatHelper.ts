/**
 * New Chat Helper - Combines worktree creation with draft message sending
 * 
 * This module provides the `startNewChatForDraft` function that:
 * 1. Creates a new ACS session directly
 * 2. Creates a worktree using invokeCreateWorktree
 * 3. Updates session with worktree path as agent_cwd
 * 4. Sends the first message with autoMode & modelAutoMode both TRUE
 * 5. Returns sessionId and workspacePath for further use
 */

import { isTauriEnvironment, createWorktreeWithDirtyCheck } from '@/utils/worktreeApi';
import { sendChatMessage, type SendChatMessageParams } from '@/utils/sendChatMessage';

export interface StartNewChatForDraftOptions {
    draftText: string;
    userId: string;
    agentConfigName: string;
    acsClient: any;
    agentConfigId?: string;
    sessionName?: string;
    agentCwd: string; // Required: project root path for worktree creation
    onShowDirtyModal?: (projectRoot: string, onCommitAndContinue: () => Promise<void>) => void; // Optional modal handler
}

export interface StartNewChatForDraftResult {
    sessionId: string;
    workspacePath: string;
    userMessageId?: string;
}

/**
 * Starts a new chat session with worktree and sends the first draft message
 * with autoMode and modelAutoMode both set to TRUE
 * 
 * @param options Configuration options including draft text and user info
 * @returns Promise resolving to sessionId, workspacePath, and userMessageId
 */
export async function startNewChatForDraft(options: StartNewChatForDraftOptions): Promise<StartNewChatForDraftResult> {
    const { draftText, userId, agentConfigName, acsClient, agentConfigId, sessionName, agentCwd, onShowDirtyModal } = options;
    
    console.log('[NewChatHelper] Starting new chat for draft with options:', {
        draftTextLength: draftText.length,
        userId,
        agentConfigName,
        agentConfigId,
        sessionName,
        agentCwd
    });
    
    try {
        // Step 1: Create ACS session directly
        const createReq = {
            name: sessionName || 'Draft Task',
            agent_config_id: agentConfigId || 'general'
        };
        
        console.log('[NewChatHelper] Creating ACS session:', createReq);
        const createRes = await acsClient.sessions.createSession(createReq);
        const sessionId = createRes.data.data.id;
        console.log('[NewChatHelper] ACS session created:', sessionId);

        // Step 2: Create worktree (if in Tauri environment)
        let workspacePath = agentCwd; // Default fallback
        
        if (isTauriEnvironment()) {
            try {
                console.log('[NewChatHelper] Creating worktree for session:', sessionId);
                // Use the new function that handles dirty repo modal
                const worktreeResult = await createWorktreeWithDirtyCheck(sessionId, agentCwd, onShowDirtyModal);
                workspacePath = worktreeResult.workspace_path;
                console.log('[NewChatHelper] Worktree created at:', workspacePath);
            } catch (error) {
                console.warn('[NewChatHelper] Failed to create worktree, using fallback path:', error);
                // Continue with agentCwd as fallback
            }
        } else {
            console.log('[NewChatHelper] Not in Tauri environment, using provided agentCwd as workspace path');
        }

        // Step 3: Update session with worktree path as agent_cwd
        try {
            console.log('[NewChatHelper] Updating session agent_cwd to:', workspacePath);
            await acsClient.sessions.updateSession(sessionId, { agent_cwd: workspacePath });
            console.log('[NewChatHelper] Session agent_cwd updated successfully');
        } catch (error) {
            console.warn('[NewChatHelper] Failed to update session agent_cwd:', error);
            // Continue - this is not critical for functionality
        }
        
        // Step 4: Send the draft message with autoMode & modelAutoMode both TRUE
        const sendParams: SendChatMessageParams = {
            sessionId,
            message: draftText,
            userId,
            agentConfigName,
            acsClient,
            autoMode: true,          // Enable automatic agent config selection
            modelAutoMode: true,     // Enable automatic model switching
            acsOverrides: {
                agent_cwd_override: workspacePath // Use the worktree path
            }
        };
        
        console.log('[NewChatHelper] Sending draft message with auto modes enabled');
        const sendResult = await sendChatMessage(sendParams);
        
        if (!sendResult.success) {
            throw new Error(`Failed to send draft message: ${sendResult.error}`);
        }
        
        console.log('[NewChatHelper] ✅ Draft message sent successfully');
        
        return {
            sessionId,
            workspacePath,
            userMessageId: sendResult.userMessageId
        };
        
    } catch (error) {
        console.error('[NewChatHelper] Failed to start new chat for draft:', error);
        throw new Error(`Failed to start new chat for draft: ${error instanceof Error ? error.message : String(error)}`);
    }
}