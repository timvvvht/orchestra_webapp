/**
 * Conversation Boundaries Utility
 *
 * Implements implicit conversation boundaries logic where:
 * - A "response" spans from user message → last assistant message before next user message
 * - Final assistant messages are determined by conversation structure (no explicit "done" events needed)
 * - File operations can be scoped to complete responses
 */

import type { ChatMessage } from '@/types/chatTypes';
import { ChatRole } from '@/types/chatTypes';
import type { FileOperation, UnifiedTimelineEvent, UnifiedToolCall, UnifiedToolResult } from '@/types/unifiedTimeline';
import { convertChatMessageToTimeline, extractFileOperation } from '@/utils/timelineParser';

/**
 * Determines if an assistant message is the final message in its response
 * A message is "final" if:
 * 1. It's an assistant message AND
 * 2. The next message is from user OR it's the last message in conversation
 */
export function isFinalAssistantMessage(message: ChatMessage, allMessages: ChatMessage[]): boolean {
    if (message.role !== 'assistant' && message.role !== ChatRole.Assistant) return false;

    const messageIndex = allMessages.findIndex(m => m.id === message.id);
    if (messageIndex === -1) return false;

    // Look for the next REAL user message (not just tool results)
    let nextRealUserMessageIndex = messageIndex + 1;
    while (nextRealUserMessageIndex < allMessages.length) {
        const nextMessage = allMessages[nextRealUserMessageIndex];

        // If it's an assistant message, this current message is not final
        if (nextMessage.role === 'assistant' || nextMessage.role === ChatRole.Assistant) {
            // console.log(`[Refined Mode] Hiding intermediate message: ${message.id} (next: assistant)`);
            return false;
        }

        // If it's a user message, check if it's a real user message or just tool results
        if (nextMessage.role === 'user' || nextMessage.role === ChatRole.User) {
            const isToolResultOnly = Array.isArray(nextMessage.content) && nextMessage.content.every(part => part.type === 'tool_result');

            if (isToolResultOnly) {
                // Skip tool-result-only messages and continue looking
                nextRealUserMessageIndex++;
                continue;
            } else {
                // Found a real user message, so this assistant message is final
                return true;
            }
        }

        nextRealUserMessageIndex++;
    }

    // No more messages or no real user message found, so this is final
    return true;
}

/**
 * Groups messages into conversation responses
 * Each response spans from user message → final assistant message
 */
export function groupMessagesIntoResponses(messages: ChatMessage[]): ChatMessage[][] {
    const responses: ChatMessage[][] = [];
    let currentResponse: ChatMessage[] = [];

    for (const message of messages) {
        currentResponse.push(message);

        // End response when we hit a final assistant message
        if (isFinalAssistantMessage(message, messages)) {
            responses.push(currentResponse);
            currentResponse = [];
        }
    }

    // Add any remaining messages as incomplete response
    if (currentResponse.length > 0) {
        responses.push(currentResponse);
    }

    return responses;
}

/**
 * Filters messages to show only final assistant messages (for debug views)
 * Keeps all user messages, only shows final assistant messages
 */
export function getVisibleMessages(messages: ChatMessage[]): ChatMessage[] {
    // console.log(`[Refined Mode] Filtering ${messages.length} messages → showing final messages only`);

    const filtered = messages.filter(message => {
        if (message.role === 'user' || message.role === ChatRole.User) {
            return true;
        }

        // For assistant messages, only show final ones
        return isFinalAssistantMessage(message, messages);
    });

    // console.log(`[Refined Mode] Result: ${filtered.length}/${messages.length} messages visible`);
    return filtered;
}

/**
 * Gets file operations for a specific response (from user message to final assistant message)
 */
export function getFileOperationsForResponse(messages: ChatMessage[], finalMessageId: string): ExtendedFileOperation[] {
    const responses = groupMessagesIntoResponses(messages);
    const targetResponse = responses.find(response => response.some(msg => msg.id === finalMessageId));

    if (!targetResponse) {
        return [];
    }

    return extractFileOperationsFromMessages(targetResponse);
}

/**
 * Gets all tool calls for a specific conversation round (for refined mode)
 * This includes tool calls from intermediate messages that are hidden in refined mode
 */
export function getToolCallsForResponse(messages: ChatMessage[], finalMessageId: string): UnifiedToolCall[] {
    const responses = groupMessagesIntoResponses(messages);
    const targetResponse = responses.find(response => response.some(msg => msg.id === finalMessageId));

    if (!targetResponse) {
        return [];
    }

    // Convert all messages in the response to unified timeline events
    const allEvents: UnifiedTimelineEvent[] = [];

    for (const message of targetResponse) {
        const events = convertChatMessageToTimeline(message);
        allEvents.push(...events);
    }

    // Extract all tool calls
    const toolCalls: UnifiedToolCall[] = [];
    for (const event of allEvents) {
        if (event.type === 'tool_call') {
            toolCalls.push(event.data as UnifiedToolCall);
        }
    }

    return toolCalls;
}

/**
 * Extracts file operations from a set of messages using the unified timeline system
 * This properly handles tool results that may appear in user messages
 */
function extractFileOperationsFromMessages(messages: ChatMessage[]): ExtendedFileOperation[] {
    // Convert all messages to unified timeline events
    const allEvents: UnifiedTimelineEvent[] = [];

    for (const message of messages) {
        const events = convertChatMessageToTimeline(message);
        allEvents.push(...events);
    }

    // Group tool calls with their results
    const toolCallMap = new Map<string, UnifiedToolCall>();
    const toolResultMap = new Map<string, UnifiedToolResult>();

    // First pass: collect all tool calls and results
    for (const event of allEvents) {
        if (event.type === 'tool_call') {
            const toolCall = event.data as UnifiedToolCall;
            toolCallMap.set(toolCall.id, toolCall);
        } else if (event.type === 'tool_result') {
            const toolResult = event.data as UnifiedToolResult;
            toolResultMap.set(toolResult.toolCallId, toolResult);
        }
    }

    // Second pass: extract file operations from tool calls
    const fileOperations: ExtendedFileOperation[] = [];

    for (const [toolCallId, toolCall] of toolCallMap) {
        const toolResult = toolResultMap.get(toolCallId);
        const fileOp = extractFileOperation(toolCall, toolResult);

        if (fileOp) {
            // Extend the base FileOperation with tool information
            const extendedFileOp: ExtendedFileOperation = {
                ...fileOp,
                tool: toolCall.name
            };
            fileOperations.push(extendedFileOp);
        }
    }

    return fileOperations;
}

// Extended file operation interface for our use case
export interface ExtendedFileOperation extends FileOperation {
    tool: string;
}

/**
 * Checks if a message is currently streaming
 */
export function isMessageStreaming(message: ChatMessage): boolean {
    return message.isStreaming || false;
}

/**
 * Gets the final message status for UI display
 */
export function getFinalMessageStatus(message: ChatMessage, allMessages: ChatMessage[]): 'streaming' | 'final' | 'intermediate' {
    if (isMessageStreaming(message)) return 'streaming';
    if (isFinalAssistantMessage(message, allMessages)) return 'final';
    return 'intermediate';
}
