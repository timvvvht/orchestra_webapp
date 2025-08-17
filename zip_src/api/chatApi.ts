// src/api/chatApi.ts

import type { AgentConfigBE } from '@/types/agent';
import type { ChatMessage } from '@/types/chatTypes';
import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage, ForkRequest, ChatSession } from '@/types/chatTypes'; // Adjust path if necessary
import * as ChatService from '@/services/supabase/chatService';

// ... (other imports and functions)

// REMOVED: const MESSAGE_SEND_TIMEOUT_MS = 30000; // 30 seconds

export async function sendChatMessage(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const messageCount = messages.length;
    const lastMessageRole = messageCount > 0 ? messages[messageCount - 1].role : 'N/A';
    console.log(`[ChatApi] Invoking Rust 'send_message' for session ${sessionId} with ${messageCount} messages. Last message role: ${lastMessageRole}`);
    
    try {
        await invoke('send_message', { 
            sid: sessionId, 
            messagesPayload: messages  // Tauri expects camelCase in JS/TS even though Rust uses snake_case
        });
        console.log(`[ChatApi] send_message for session ${sessionId} completed successfully.`);
    } catch (error) {
        console.error(`[ChatApi] Error in send_message for session ${sessionId}:`, error);
        throw error; // Re-throw the error from invoke
    }
}

export async function sendChatMessageWithMetadata(
    sessionId: string, 
    messages: ChatMessage[], 
    metadata?: any 
): Promise<void> {
    const messageCount = messages.length;
    const lastMessageRole = messageCount > 0 ? messages[messageCount - 1].role : 'N/A';
    console.log(`[ChatApi] Invoking Rust 'send_message_with_metadata' for session ${sessionId} with ${messageCount} messages. Last message role: ${lastMessageRole}. Metadata:`, metadata);
    
    return invoke('send_message_with_metadata', { 
        sid: sessionId, 
        messagesPayload: messages,  // Tauri expects camelCase in JS/TS even though Rust uses snake_case
        metadata: metadata || null 
    });
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
    console.log(`[ChatApi] Updating session title for ${sessionId}: ${title}`);
    
    return invoke('update_session_title', { 
        sessionId, 
        title 
    });
}

/**
 * Fork a conversation from a specific message
 * @param forkData The fork request data
 * @returns The newly created forked session
 */
export async function forkChatSession(forkData: {
    originalSessionId: string;
    messageId: string;
    name?: string;
    displayTitle?: string;
}): Promise<ChatSession> {
    console.log(`[ChatApi] Forking conversation from session ${forkData.originalSessionId} at message ${forkData.messageId}`);
    
    try {
        const forkRequest: ForkRequest = {
            messageId: forkData.messageId,
            name: forkData.name,
            displayTitle: forkData.displayTitle
        };
        
        const forkedSession = await ChatService.forkConversation(forkData.originalSessionId, forkRequest);
        console.log(`[ChatApi] Successfully forked conversation:`, forkedSession);
        
        return forkedSession;
    } catch (error) {
        console.error(`[ChatApi] Error forking conversation:`, error);
        throw error;
    }
}

/**
 * Get all forks of a conversation
 * @param sessionId The session ID to get forks for
 * @returns Array of fork information
 */
export async function getConversationForks(sessionId: string) {
    console.log(`[ChatApi] Getting forks for session ${sessionId}`);
    
    try {
        const forks = await ChatService.getConversationForks(sessionId);
        console.log(`[ChatApi] Found ${forks.length} forks for session ${sessionId}`);
        
        return forks;
    } catch (error) {
        console.error(`[ChatApi] Error getting conversation forks:`, error);
        throw error;
    }
}

/**
 * Get the ancestry chain of a forked conversation
 * @param sessionId The session ID to get ancestry for
 * @returns Array of ancestor information
 */
export async function getForkAncestry(sessionId: string) {
    console.log(`[ChatApi] Getting ancestry for session ${sessionId}`);
    
    try {
        const ancestry = await ChatService.getForkAncestry(sessionId);
        console.log(`[ChatApi] Found ${ancestry.length} ancestors for session ${sessionId}`);
        
        return ancestry;
    } catch (error) {
        console.error(`[ChatApi] Error getting fork ancestry:`, error);
        throw error;
    }
}

/**
 * Restore a chat session from storage
 * @param sessionId The session ID to restore
 * @returns The restored session data
 */
export async function restoreSession(sessionId: string): Promise<ChatSession> {
    console.log(`[ChatApi] Restoring session ${sessionId}`);
    
    try {
        const session = await ChatService.getChatSession(sessionId);
        console.log(`[ChatApi] Successfully restored session:`, session);
        
        return session;
    } catch (error) {
        console.error(`[ChatApi] Error restoring session:`, error);
        throw error;
    }
}

/**
 * Start a new chat session
 * @param sessionData Initial session data
 * @returns The created session
 */
export async function startChatSession(sessionData: {
    name?: string;
    agentId?: string;
    avatar?: string;
}): Promise<ChatSession> {
    console.log(`[ChatApi] Starting new chat session:`, sessionData);
    
    try {
        const session = await ChatService.createChatSession({
            name: sessionData.name || 'New Chat',
            agent_config_id: sessionData.agentId,
            avatar_url: sessionData.avatar
        });
        console.log(`[ChatApi] Successfully started session:`, session);
        
        return session;
    } catch (error) {
        console.error(`[ChatApi] Error starting session:`, error);
        throw error;
    }
}

/**
 * Delete a chat session
 * @param sessionId The session ID to delete
 */
export async function deleteSession(sessionId: string): Promise<void> {
    console.log(`[ChatApi] Deleting session ${sessionId}`);
    
    try {
        await ChatService.deleteChatSession(sessionId);
        console.log(`[ChatApi] Successfully deleted session ${sessionId}`);
    } catch (error) {
        console.error(`[ChatApi] Error deleting session:`, error);
        throw error;
    }
}

/**
 * Clone an agent template
 * @param templateId The template ID to clone
 * @param newName The name for the cloned agent
 * @returns The cloned agent data
 */
export async function cloneAgentTemplate(templateId: string, newName: string): Promise<any> {
    console.log(`[ChatApi] Cloning agent template ${templateId} as ${newName}`);
    
    try {
        // This would typically call a service method to clone the agent
        // For now, we'll return a placeholder implementation
        const clonedAgent = {
            id: `cloned_${templateId}_${Date.now()}`,
            name: newName,
            templateId,
            createdAt: new Date().toISOString()
        };
        
        console.log(`[ChatApi] Successfully cloned agent template:`, clonedAgent);
        return clonedAgent;
    } catch (error) {
        console.error(`[ChatApi] Error cloning agent template:`, error);
        throw error;
    }
}

// ... (rest of the file)
export interface SendMessageStatelessPayload {
    sid: string;
    agentConfigPayload: AgentConfigBE;
    historyPayload: ChatMessage[];
    userMessagePayload: ChatMessage;
}

/**
 * @deprecated This function uses a legacy Tauri-based invocation and is no longer part of the main application flow.
 * The modern, direct-to-ACS approach is handled by the ACSClient and initiated in `ChatMainCanonicalLegacy.tsx`.
 * This function is preserved for historical reference or specific legacy use cases only.
 * @see ChatMainCanonicalLegacy.tsx
 */
export async function invokeSendMessageStateless(
    sessionId: string,
    fullAgentConfig: AgentConfigBE,
    messageHistory: ChatMessage[],
    currentUserMessage: ChatMessage
): Promise<void> {
    console.log(`[ChatApi] Invoking Rust 'send_message_stateless' for session ${sessionId}`);
    
    // ADD THIS LOGGING BLOCK
    console.log('[ChatApi] Received fullAgentConfig.tool_groups:', JSON.stringify(fullAgentConfig.tool_groups, null, 2));
    if (fullAgentConfig.tool_groups && Array.isArray(fullAgentConfig.tool_groups)) {
        fullAgentConfig.tool_groups.forEach((group, index) => {
            console.log(`[ChatApi] Tool group ${index} - name: ${group.name}, source group_type: ${group.group_type}, typeof source group_type: ${typeof group.group_type}`);
        });
    }
    // END LOGGING BLOCK

    const payload: SendMessageStatelessPayload = {
        sid: sessionId,
        agentConfigPayload: {
            id: fullAgentConfig.id,
            version: fullAgentConfig.version,
            aiConfig: {
                modelId: fullAgentConfig.ai_config.model_id,
                providerName: fullAgentConfig.ai_config.provider_name,
                temperature: fullAgentConfig.ai_config.temperature,
                maxTokens: fullAgentConfig.ai_config.max_tokens,
            },
            agent: {
                name: fullAgentConfig.agent.name,
                description: fullAgentConfig.agent.description,
                systemPrompt: fullAgentConfig.agent.system_prompt,
                avatar: fullAgentConfig.agent.avatar,
            },
            toolGroups: fullAgentConfig.tool_groups.map(group => ({
                name: group.name,
                groupType: group.group_type,
                initArgs: group.init_args,
                tools: group.tools.map(tool => ({
                    name: tool.name,
                    description: tool.description === undefined ? null : tool.description,
                    inputSchema: tool.input_schema === undefined ? null : tool.input_schema,
                    requiresHumanApprovalToExecute: tool.requires_human_approval_to_execute,
                })),
            })),
            userId: fullAgentConfig.user_id,
            createdAt: fullAgentConfig.created_at,
            updatedAt: fullAgentConfig.updated_at,
            isPublic: fullAgentConfig.is_public,
            publisher: fullAgentConfig.publisher,
            publisherId: fullAgentConfig.publisher_id,
        },
        historyPayload: messageHistory,
        userMessagePayload: currentUserMessage
    };

    try {
        console.log('[ChatApi] Payload for send_message_stateless:', JSON.stringify(payload, null, 2));
        await invoke('send_message_stateless', payload);
        console.log(`[ChatApi] 'send_message_stateless' for session ${sessionId} invoked successfully.`);
    } catch (error) {
        console.error(`[ChatApi] Error invoking 'send_message_stateless' for session ${sessionId}:`, error);
        throw error;
    }
}
