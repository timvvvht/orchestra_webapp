/**
 * Optimistic Chat Helper - Fast session creation with background operations
 * 
 * This module provides optimistic UI updates for Mission Control by:
 * 1. Creating skeleton session immediately with temp ID
 * 2. Getting real session ID quickly (fast operation)
 * 3. Replacing skeleton with real session ID
 * 4. Running heavy operations (worktree, message sending) in background
 * 5. Updating session status as operations complete
 */

// Removed genTempId import - no longer generating temp IDs
import { invokeCreateWorktree, isTauriEnvironment } from '@/utils/worktreeApi';
import { sendChatMessage, type SendChatMessageParams } from '@/utils/sendChatMessage';
import { MissionControlAgent } from '@/stores/missionControlStore';

export interface OptimisticChatOptions {
    draftText: string;
    userId: string;
    agentConfigName: string;
    acsClient: any;
    agentConfigId?: string;
    sessionName?: string;
    agentCwd: string;
}

export interface OptimisticChatCallbacks {
    onSessionCreated: (sessionId: string, sessionData: MissionControlAgent) => void;
    onStatusUpdate: (sessionId: string, status: string, updates?: Partial<MissionControlAgent>) => void;
    onError: (sessionId: string, error: string) => void;
}

export interface OptimisticChatResult {
    sessionId: string;
    workspacePath: string;
}

/**
 * Starts a new chat session with real backend session ID
 * Waits for session creation and worktree setup before returning
 */
export async function startOptimisticChatForDraft(
    options: OptimisticChatOptions,
    callbacks: OptimisticChatCallbacks
): Promise<OptimisticChatResult> {
    const { draftText, userId, agentConfigName, acsClient, agentConfigId, sessionName, agentCwd } = options;
    
    console.log('[OptimisticChatHelper] Starting chat for draft with real session ID');
    
    try {
        // Step 1: Create ACS session (fast operation)
        const createReq = {
            name: sessionName || 'Draft Task',
            agent_config_id: agentConfigId || 'general',
            origin: 'web', // Explicit origin for webapp
        };
        
        const createRes = await acsClient.sessions.createSession(createReq);
        const sessionId = createRes.data.data.id;
        
        console.log('[OptimisticChatHelper] ✅ Real session ID received:', sessionId);
        
        // Step 2: Create worktree (if in Tauri environment)
        let workspacePath = agentCwd; // Default fallback
        
        if (isTauriEnvironment()) {
            try {
                console.log('[OptimisticChatHelper] Creating worktree...');
                const worktreeResult = await invokeCreateWorktree(sessionId, agentCwd);
                workspacePath = worktreeResult.workspace_path;
                console.log('[OptimisticChatHelper] ✅ Worktree created at:', workspacePath);
            } catch (error) {
                console.warn('[OptimisticChatHelper] Failed to create worktree, using fallback path:', error);
                // Continue with agentCwd as fallback
            }
        }
        
        // Step 3: Update session with worktree path
        try {
            console.log('[OptimisticChatHelper] Updating session agent_cwd...');
            await acsClient.sessions.updateSession(sessionId, { agent_cwd: workspacePath });
            console.log('[OptimisticChatHelper] ✅ Session agent_cwd updated');
        } catch (error) {
            console.warn('[OptimisticChatHelper] Failed to update session agent_cwd:', error);
            // Continue - this is not critical
        }
        
        // Step 4: Create session data and notify callback
        const sessionData: MissionControlAgent = {
            id: sessionId,
            mission_title: sessionName || 'Draft Task',
            status: 'active',
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            agent_config_name: agentConfigName,
            model_id: null,
            latest_message_id: null,
            latest_message_role: 'user',
            latest_message_content: draftText,
            latest_message_timestamp: new Date().toISOString(),
            agent_cwd: workspacePath,
            base_dir: null,
            archived_at: null
        };
        
        callbacks.onSessionCreated(sessionId, sessionData);
        
        // Step 5: Send the draft message in background
        continueHeavyOperations(sessionId, options, callbacks).catch(error => {
            console.error('[OptimisticChatHelper] Background operations failed:', error);
            callbacks.onError(sessionId, `Background operations failed: ${error instanceof Error ? error.message : String(error)}`);
        });
        
        return {
            sessionId,
            workspacePath
        };
        
    } catch (error) {
        console.error('[OptimisticChatHelper] Session creation failed:', error);
        const errorMessage = `Session creation failed: ${error instanceof Error ? error.message : String(error)}`;
        callbacks.onError('unknown', errorMessage);
        throw new Error(errorMessage);
    }
}

// Removed createSessionQuickly - now handled inline in main function

/**
 * Heavy operations that run in background after we have real session ID
 * Only handles message sending now - worktree creation moved to main function
 */
async function continueHeavyOperations(
    sessionId: string,
    options: OptimisticChatOptions,
    callbacks: OptimisticChatCallbacks
): Promise<void> {
    const { draftText, userId, agentConfigName, acsClient } = options;
    
    console.log('[OptimisticChatHelper] Starting background message sending for session:', sessionId);
    
    try {
        // Send the draft message
        console.log('[OptimisticChatHelper] Sending draft message...');
        callbacks.onStatusUpdate(sessionId, 'processing', { 
            latest_message_content: 'Sending message to agent...' 
        });
        
        // Get the current session to get the workspace path
        const sessionResponse = await acsClient.sessions.getSession(sessionId);
        const workspacePath = sessionResponse.data.data.agent_cwd;
        
        const sendParams: SendChatMessageParams = {
            sessionId,
            message: draftText,
            userId,
            agentConfigName,
            acsClient,
            autoMode: true,
            modelAutoMode: true,
            acsOverrides: {
                agent_cwd_override: workspacePath
            }
        };
        
        const sendResult = await sendChatMessage(sendParams);
        
        if (!sendResult.success) {
            throw new Error(`Failed to send draft message: ${sendResult.error}`);
        }
        
        console.log('[OptimisticChatHelper] ✅ Draft message sent successfully');
        
        // Final status update
        callbacks.onStatusUpdate(sessionId, 'active', {
            latest_message_id: sendResult.userMessageId,
            latest_message_role: 'user',
            latest_message_content: draftText,
            latest_message_timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[OptimisticChatHelper] Background operations failed:', error);
        throw error;
    }
}