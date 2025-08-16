// 🔧 UNIFIED PARSING FUNCTIONS
// Convert both Supabase and SSE data to unified format
// Copied from ChatDebugRefined for integration with ChatMain

import type { ChatMessage as ChatMessageType } from '@/types/chatTypes';
import type { UnifiedTimelineEvent, UnifiedMessage, UnifiedToolCall, UnifiedToolResult, FileOperation } from '@/types/unifiedTimeline';

/**
 * Pure converter: ChatMessage[] -> UnifiedTimelineEvent[]
 *
 * This is the core function for Option C implementation.
 * Converts an array of chat messages to a chronologically sorted timeline.
 *
 * @param messages Array of ChatMessage objects
 * @returns Sorted array of UnifiedTimelineEvent objects
 */
export function buildTimelineFromMessages(messages: ChatMessageType[]): UnifiedTimelineEvent[] {
    // 1️⃣ Flatten and convert each message to timeline events
    const events: UnifiedTimelineEvent[] = [];

    messages.forEach((message, index) => {
        try {
            // Reuse existing conversion logic with index for unique ID generation
            const messageEvents = convertChatMessageToTimeline(message, index);
            events.push(...messageEvents);
        } catch {
            // Silent error handling - logs removed
        }
    });

    // 2️⃣ Sort by timestamp to ensure chronological order
    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => {
        // Extract timestamps based on event type
        let aTimestamp = 0;
        let bTimestamp = 0;

        if ('data' in a && a.data && 'timestamp' in a.data) {
            aTimestamp = a.data.timestamp;
        }

        if ('data' in b && b.data && 'timestamp' in b.data) {
            bTimestamp = b.data.timestamp;
        }

        return aTimestamp - bTimestamp;
    });

    return sortedEvents;
}

// Convert existing ChatMessage to timeline events (bridge function for ChatMain)
export function convertChatMessageToTimeline(message: ChatMessageType, index?: number): UnifiedTimelineEvent[] {
    const events: UnifiedTimelineEvent[] = [];

    // Defensive check for undefined message
    if (!message) {
        return events;
    }

    // 🚀 FIXED VERSION: Generate unique IDs using index
    const actualMessage = message as any;
    // CRITICAL: Generate unique ID using index to ensure no duplicates
    const messageId =
        message.id ||
        actualMessage.ID ||
        actualMessage.messageId ||
        `msg-${index !== undefined ? index : Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageRole = message.role || actualMessage.Role || 'unknown';
    const messageContent = message.content || actualMessage.Content || '';
    const messageTimestamp = message.createdAt || actualMessage.Timestamp || actualMessage.timestamp || Date.now();

    // 🔧 REAL FIX: Handle string content (which is what the API actually returns)
    if (typeof messageContent === 'string' && messageContent.trim()) {
        events.push({
            id: `${messageId}-text-0`,
            type: 'text' as const,
            sessionId: message.sessionId || messageId,
            source: 'supabase',
            createdAt: messageTimestamp,
            role: messageRole as 'user' | 'assistant',
            data: {
                id: `${messageId}-text-0`,
                role: messageRole,
                content: messageContent.trim(),
                timestamp: messageTimestamp,
                source: 'supabase',
                messageId: messageId,
                isStreaming: message.isStreaming || false
            } as UnifiedMessage,
            metadata: {
                supabase: {
                    messageId: messageId,
                    originalMessage: message
                }
            }
        });
        return events;
    }

    // 🔧 FALLBACK: Handle array content (for rich content messages)
    if (Array.isArray(messageContent)) {
        messageContent.forEach((part, index) => {
            const baseTimestamp = messageTimestamp;

            switch (part.type) {
                case 'text':
                    if (part.text?.trim()) {
                        events.push({
                            id: `${messageId}-text-${index}`,
                            type: 'text' as const,
                            sessionId: message.sessionId || messageId,
                            source: 'supabase',
                            createdAt: baseTimestamp + index,
                            role: messageRole as 'user' | 'assistant',
                            data: {
                                id: `${messageId}-text-${index}`,
                                role: messageRole,
                                content: part.text,
                                timestamp: baseTimestamp + index,
                                source: 'supabase',
                                messageId: messageId,
                                isStreaming: message.isStreaming || false
                            } as UnifiedMessage,
                            metadata: {
                                supabase: {
                                    messageId: messageId,
                                    contentIndex: index,
                                    originalMessage: message
                                }
                            }
                        });
                    }
                    break;

                case 'tool_use':
                    events.push({
                        id: part.id || `${messageId}-tool-use-${index}`,
                        type: 'tool_call' as const,
                        sessionId: message.sessionId || messageId,
                        source: 'supabase',
                        createdAt: baseTimestamp + index,
                        role: 'assistant',
                        data: {
                            id: part.id || `${messageId}-tool-use-${index}`,
                            name: part.name || 'unknown_tool',
                            parameters: part.input || {},
                            timestamp: baseTimestamp + index,
                            source: 'supabase',
                            originalRole: messageRole,
                            messageId: messageId,
                            rawData: { supabase: message }
                        } as UnifiedToolCall,
                        metadata: {
                            supabase: {
                                messageId: messageId,
                                contentIndex: index,
                                originalMessage: message
                            }
                        }
                    });
                    break;

                case 'tool_result':
                    // Extract tool name and parse result data
                    let toolName = (() => {
                        // Try to derive tool name from previous tool_call within the same message
                        const toolCallId = (part as any).tool_call_id || (part as any).tool_use_id;
                        const matchingCall = events.find(ev => ev.type === 'tool_call' && (ev.data as any).id === toolCallId);
                        if (matchingCall && (matchingCall.data as any).name) {
                            return (matchingCall.data as any).name;
                        }
                        return 'unknown';
                    })();
                    let result = part.content;
                    let success = !part.is_error;
                    let error: string | undefined;

                    // Handle different tool result formats - UPDATED for rich objects
                    if (Array.isArray(part.content) && part.content.length > 0) {
                        // Legacy format: array with text objects (from old stringified data)
                        const firstContent = part.content[0];
                        if (firstContent && typeof firstContent === 'object' && firstContent.text) {
                            try {
                                const parsed = JSON.parse(firstContent.text);
                                if (parsed.success !== undefined) {
                                    success = parsed.success;
                                }
                                if (parsed.error) {
                                    error = parsed.error;
                                }
                                if (parsed.message) {
                                    result = parsed.message;
                                } else {
                                    result = parsed;
                                }
                            } catch {
                                result = firstContent.text;
                                // Check for error patterns in text
                                if (firstContent.text.toLowerCase().includes('error') || firstContent.text.toLowerCase().includes('failed')) {
                                    success = false;
                                    error = firstContent.text;
                                }
                            }
                        }
                    } else if (part.content && typeof part.content === 'object' && !Array.isArray(part.content)) {
                        // NEW: Rich object format (from our fixes)

                        result = part.content;

                        // Extract success/error info from rich object if available
                        if (typeof part.content === 'object') {
                            if ('success' in part.content && typeof part.content.success === 'boolean') {
                                success = part.content.success;
                            }
                            if ('error' in part.content && part.content.error) {
                                error = String(part.content.error);
                                success = false;
                            }
                            if ('message' in part.content && part.content.message) {
                                result = part.content.message;
                            }
                        }
                    } else if (typeof part.content === 'string') {
                        // String format
                        result = part.content;
                        if (part.content.toLowerCase().includes('error') || part.content.toLowerCase().includes('failed')) {
                            success = false;
                            error = part.content;
                        }
                    }

                    // Handle is_error flag from Supabase
                    if (part.is_error) {
                        success = false;
                        if (!error) {
                            if (Array.isArray(result) && result[0]?.text) {
                                error = result[0].text;
                            } else if (typeof result === 'string') {
                                error = result;
                            } else if (typeof result === 'object' && result) {
                                error = JSON.stringify(result);
                            }
                        }
                    }

                    const toolCallId = (part as any).tool_call_id || (part as any).tool_use_id || 'unknown';
                    events.push({
                        id: `${toolCallId}-result-${index}`,
                        type: 'tool_result' as const,
                        sessionId: message.sessionId || messageId,
                        source: 'supabase',
                        createdAt: baseTimestamp + index,
                        role: 'assistant',
                        data: {
                            id: `${toolCallId}-result-${index}`,
                            toolCallId: toolCallId,
                            toolName: toolName,
                            ok: success,
                            result: result,
                            error: error,
                            timestamp: baseTimestamp + index,
                            source: 'supabase',
                            messageId: messageId
                        } as UnifiedToolResult,
                        metadata: {
                            supabase: {
                                messageId: messageId,
                                contentIndex: index,
                                originalMessage: message
                            }
                        }
                    });
                    break;
            }
        });
    } else if (typeof messageContent === 'string') {
        // Final fallback for string content (should be handled above)
        events.push({
            id: `${messageId}-text`,
            type: 'text' as const,
            source: 'supabase',
            data: {
                id: `${messageId}-text`,
                role: messageRole,
                content: messageContent,
                timestamp: messageTimestamp,
                source: 'supabase',
                messageId: messageId,
                isStreaming: message.isStreaming || false
            } as UnifiedMessage,
            metadata: {
                supabase: {
                    messageId: messageId,
                    originalMessage: message
                }
            }
        });
    }

    return events;
}

// Parse Supabase message to unified timeline events (from ChatDebugRefined)
export function parseSupabaseMessage(msg: any, index: number): UnifiedTimelineEvent[] {
    const events: UnifiedTimelineEvent[] = [];
    const baseTimestamp = msg.timestamp
        ? isNaN(new Date(msg.timestamp).getTime())
            ? Date.now() + index * 1000
            : new Date(msg.timestamp).getTime()
        : Date.now() + index * 1000;

    if (!msg.content || !Array.isArray(msg.content)) {
        return events;
    }

    // Process each content item in the message
    msg.content.forEach((contentItem: any, contentIndex: number) => {
        const itemTimestamp = baseTimestamp + contentIndex * 100; // Slight offset for ordering

        switch (contentItem.type) {
            case 'text':
                if (contentItem.text && contentItem.text.trim()) {
                    events.push({
                        id: `${msg.id || index}-text-${contentIndex}`,
                        type: 'text' as const,
                        source: 'supabase',
                        data: {
                            id: `${msg.id || index}-text-${contentIndex}`,
                            role: msg.role,
                            content: contentItem.text,
                            timestamp: itemTimestamp,
                            source: 'supabase',
                            messageId: msg.id,
                            writeId: msg.extra?.write_id,
                            rawData: { supabase: msg }
                        } as UnifiedMessage,
                        metadata: {
                            supabase: {
                                messageId: msg.id,
                                writeId: msg.extra?.write_id,
                                contentIndex,
                                originalMessage: msg
                            }
                        }
                    });
                }
                break;

            case 'tool_use':
                events.push({
                    id: contentItem.id || `${msg.id || index}-tool-use-${contentIndex}`,
                    type: 'tool_call' as const,
                    source: 'supabase',
                    data: {
                        id: contentItem.id || `${msg.id || index}-tool-use-${contentIndex}`,
                        name: contentItem.name,
                        parameters: contentItem.input, // Map 'input' to 'parameters'
                        timestamp: itemTimestamp,
                        source: 'supabase',
                        originalRole: msg.role,
                        messageId: msg.id,
                        rawData: { supabase: msg }
                    } as UnifiedToolCall,
                    metadata: {
                        supabase: {
                            messageId: msg.id,
                            writeId: msg.extra?.write_id,
                            contentIndex,
                            originalMessage: msg
                        }
                    }
                });
                break;

            case 'tool_result':
                // Extract tool name and parse result data
                let toolName = 'unknown';
                let result = contentItem.content;
                let success = !contentItem.is_error; // Use is_error flag if present
                let error: string | undefined;

                // Handle different tool result formats - UPDATED for rich objects
                if (Array.isArray(contentItem.content) && contentItem.content.length > 0) {
                    // Legacy format: array with text objects (from old stringified data)
                    const firstContent = contentItem.content[0];
                    if (firstContent && typeof firstContent === 'object' && firstContent.text) {
                        try {
                            const parsed = JSON.parse(firstContent.text);
                            if (parsed.success !== undefined) {
                                success = parsed.success;
                            }
                            if (parsed.error) {
                                error = parsed.error;
                            }
                            if (parsed.message) {
                                result = parsed.message;
                            } else {
                                result = parsed;
                            }
                        } catch {
                            result = firstContent.text;
                            // Check for error patterns in text
                            if (firstContent.text.toLowerCase().includes('error') || firstContent.text.toLowerCase().includes('failed')) {
                                success = false;
                                error = firstContent.text;
                            }
                        }
                    }
                } else if (contentItem.content && typeof contentItem.content === 'object' && !Array.isArray(contentItem.content)) {
                    // NEW: Rich object format (from our fixes)

                    result = contentItem.content;

                    // Extract success/error info from rich object if available
                    if (typeof contentItem.content === 'object') {
                        if ('success' in contentItem.content && typeof contentItem.content.success === 'boolean') {
                            success = contentItem.content.success;
                        }
                        if ('error' in contentItem.content && contentItem.content.error) {
                            error = String(contentItem.content.error);
                            success = false;
                        }
                        if ('message' in contentItem.content && contentItem.content.message) {
                            result = contentItem.content.message;
                        }
                    }
                } else if (typeof contentItem.content === 'string') {
                    // String format
                    result = contentItem.content;
                    if (contentItem.content.toLowerCase().includes('error') || contentItem.content.toLowerCase().includes('failed')) {
                        success = false;
                        error = contentItem.content;
                    }
                }

                // Handle is_error flag from Supabase
                if (contentItem.is_error) {
                    success = false;
                    if (!error) {
                        if (Array.isArray(result) && result[0]?.text) {
                            error = result[0].text;
                        } else if (typeof result === 'string') {
                            error = result;
                        } else if (typeof result === 'object' && result) {
                            error = JSON.stringify(result);
                        }
                    }
                }

                events.push({
                    id: `${contentItem.tool_use_id || msg.id || index}-result-${contentIndex}`,
                    type: 'tool_result' as const,
                    source: 'supabase',
                    sessionId: msg.session_id || msg.id, // Add sessionId for consistency
                    role: 'assistant',
                    toolResult: {
                        ok: success,
                        result: result,
                        error: error,
                        toolCallId: contentItem.tool_use_id || 'unknown',
                        toolName: toolName
                    },
                    metadata: {
                        supabase: {
                            messageId: msg.id,
                            writeId: msg.extra?.write_id,
                            contentIndex,
                            originalMessage: msg
                        }
                    }
                });
                break;
        }
    });

    return events;
}

// Parse SSE event to unified timeline event (from ChatDebugRefined)
export function parseSSEEvent(eventData: any): UnifiedTimelineEvent | null {
    try {
        const timestamp = Date.now();

        // Handle real SSE event structure from the provided examples
        if (eventData.type === 'agent_event' && eventData.payload) {
            const { event_type, data, message_id } = eventData.payload;

            switch (event_type) {
                case 'chunk':
                    if (data.delta || data.content) {
                        return {
                            id: `sse-chunk-${message_id}-${timestamp}`,
                            type: 'text' as const,
                            source: 'sse',
                            data: {
                                id: `sse-chunk-${message_id}-${timestamp}`,
                                role: 'assistant',
                                content: data.content || data.delta || '',
                                timestamp,
                                source: 'sse',
                                isStreaming: true,
                                messageId: message_id,
                                rawData: { sse: eventData }
                            } as UnifiedMessage,
                            metadata: {
                                sse: {
                                    messageId: message_id,
                                    eventType: event_type,
                                    delta: data.delta
                                }
                            }
                        };
                    }
                    break;

                case 'tool_call':
                    if (data.tool_call) {
                        return {
                            id: data.tool_call.id || `sse-tool-call-${timestamp}`,
                            type: 'tool_call' as const,
                            source: 'sse',
                            data: {
                                id: data.tool_call.id || `sse-tool-call-${timestamp}`,
                                name: data.tool_call.name,
                                parameters: data.tool_call.arguments, // Map 'arguments' to 'parameters'
                                timestamp,
                                source: 'sse',
                                messageId: message_id,
                                rawData: { sse: eventData }
                            } as UnifiedToolCall,
                            metadata: {
                                sse: {
                                    messageId: message_id,
                                    eventType: event_type,
                                    toolName: data.tool_name,
                                    toolArgs: data.tool_args
                                }
                            }
                        };
                    }
                    break;

                case 'tool_result':
                    if (data.result) {
                        let success = data.success !== false;
                        let result = data.result;
                        let error: string | undefined;

                        // Extract result content from nested structure
                        if (data.result.content && Array.isArray(data.result.content)) {
                            const firstContent = data.result.content[0];
                            if (firstContent?.text) {
                                try {
                                    const parsed = JSON.parse(firstContent.text);
                                    if (parsed.success !== undefined) {
                                        success = parsed.success;
                                    }
                                    if (parsed.error) {
                                        error = parsed.error;
                                    }
                                    result = parsed;
                                } catch {
                                    result = firstContent.text;
                                }
                            }
                        }

                        // Use direct success flag and output from SSE
                        if (data.success !== undefined) {
                            success = data.success;
                        }
                        if (data.output) {
                            try {
                                const parsed = JSON.parse(data.output);
                                result = parsed;
                            } catch {
                                result = data.output;
                            }
                        }

                        return {
                            id: `${data.result.tool_use_id}-result`,
                            type: 'tool_result' as const,
                            source: 'sse',
                            data: {
                                id: `${data.result.tool_use_id}-result`,
                                toolCallId: data.result.tool_use_id,
                                toolName: 'unknown', // SSE doesn't always include tool name in result
                                result,
                                success,
                                timestamp,
                                source: 'sse',
                                messageId: message_id,
                                error,
                                rawData: { sse: eventData }
                            } as UnifiedToolResult,
                            metadata: {
                                sse: {
                                    messageId: message_id,
                                    eventType: event_type,
                                    output: data.output
                                }
                            }
                        };
                    }
                    break;
            }
        }

        // Handle legacy/mock SSE event structure for backward compatibility
        switch (eventData.type) {
            case 'chunk':
                if (eventData.content && eventData.content.trim()) {
                    return {
                        id: `sse-chunk-${timestamp}`,
                        type: 'text' as const,
                        source: 'sse',
                        data: {
                            id: `sse-chunk-${timestamp}`,
                            role: 'assistant',
                            content: eventData.content,
                            timestamp,
                            source: 'sse',
                            isStreaming: true,
                            rawData: { sse: eventData }
                        } as UnifiedMessage
                    };
                }
                break;

            case 'tool_call':
                if (eventData.toolCall) {
                    return {
                        id: eventData.toolCall.id || `sse-tool-call-${timestamp}`,
                        type: 'tool_call' as const,
                        source: 'sse',
                        data: {
                            id: eventData.toolCall.id || `sse-tool-call-${timestamp}`,
                            name: eventData.toolCall.name,
                            parameters: eventData.toolCall.input || eventData.toolCall.arguments,
                            timestamp,
                            source: 'sse',
                            rawData: { sse: eventData }
                        } as UnifiedToolCall
                    };
                }
                break;

            case 'tool_result':
                if (eventData.toolResult) {
                    return {
                        id: eventData.toolResult.id || `sse-tool-result-${timestamp}`,
                        type: 'tool_result' as const,
                        source: 'sse',
                        data: {
                            id: eventData.toolResult.id || `sse-tool-result-${timestamp}`,
                            toolCallId: eventData.toolResult.toolCallId || 'unknown',
                            toolName: eventData.toolResult.toolName || 'unknown',
                            result: eventData.toolResult.result,
                            ok: eventData.toolResult.success !== false,
                            timestamp,
                            source: 'sse',
                            error: eventData.toolResult.error,
                            rawData: { sse: eventData }
                        } as UnifiedToolResult
                    };
                }
                break;
        }

        return null;
    } catch {
        // Silent error handling - logs removed
        return null;
    }
}

// Extract file operations from tool calls/results
export function extractFileOperation(toolCall: UnifiedToolCall, toolResult?: UnifiedToolResult): FileOperation | null {
    // console.log('Extracting file operation from tool call:', JSON.stringify(toolCall, null, 2));
    const fileTools = ['str_replace_editor', 'create_file', 'write_file', 'read_files', 'search_files', 'cat', 'grep', 'mv', 'cp', 'tree'];

    if (!fileTools.includes(toolCall.name.toLowerCase())) return null;

    const params = toolCall.parameters;
    const paths = extractFilePathsFromToolCall(toolCall.name, params);

    if (paths.length === 0) return null;

    // For tools that operate on multiple files, we'll return the first one
    // In the future, this could be enhanced to return multiple operations
    const primaryPath = paths[0];

    const opType = getOperationTypeFromToolName(toolCall.name, params);
    if (!opType) return null; // e.g. str_replace_editor view

    const operation: FileOperation = {
        type: opType,
        path: primaryPath,
        timestamp: Date.now()
    };

    if (toolResult) {
        operation.success = toolResult.ok;
    }

    return operation;
}

/**
 * Extracts file paths from tool call parameters
 */
function extractFilePathsFromToolCall(toolName: string, params: Record<string, unknown>): string[] {
    if (!params) return [];

    const paths: string[] = [];

    switch (toolName.toLowerCase()) {
        case 'str_replace_editor':
        case 'create_file':
        case 'write_file':
            if (params.path) paths.push(params.path);
            if (params.file_path) paths.push(params.file_path);
            break;

        case 'read_files':
            if (params.files && Array.isArray(params.files)) {
                paths.push(...params.files);
            } else if (params.file) {
                paths.push(params.file);
            }
            break;

        case 'search_files':
            if (params.paths && Array.isArray(params.paths)) {
                paths.push(...params.paths);
            } else if (params.path) {
                paths.push(params.path);
            }
            break;

        case 'cat':
        case 'grep':
            if (params.file) paths.push(params.file);
            break;

        case 'mv':
        case 'cp':
            if (params.source) paths.push(params.source);
            if (params.destination) paths.push(params.destination);
            break;

        case 'tree':
            if (params.path) paths.push(params.path);
            break;
    }

    return paths.filter(path => path && typeof path === 'string');
}

/**
 * Determines the operation type based on tool name and parameters
 */
function getOperationTypeFromToolName(toolName: string, params: Record<string, unknown>): 'created' | 'modified' | 'deleted' | null {
    switch (toolName.toLowerCase()) {
        case 'create_file':
            return 'created';

        case 'str_replace_editor': {
            const cmd = String(params?.command || '').toLowerCase();
            console.log(`Command: ${cmd} - toolName: ${toolName} - params: ${JSON.stringify(params, null, 2)}`);

            if (cmd === 'create') return 'created';
            if (cmd === 'str_replace' || cmd === 'insert' || cmd === 'append' || cmd === 'undo_edit') return 'modified';

            // view / view_range / unknown → NO op badge
            return null;
        }

        case 'write_file':
            return 'modified';

        case 'cp':
            return 'created';

        case 'rm':
            return 'deleted';

        default:
            // read_files, search_files, cat, grep, tree, mv are modifications/reads
            return 'modified';
    }
}

// Prepare events for chronological replay with realistic timing
export function prepareEventsForReplay(events: UnifiedTimelineEvent[]): Array<{
    event: UnifiedTimelineEvent;
    originalIndex: number;
    relativeTimestamp: number;
}> {
    if (events.length === 0) return [];

    // Sort events chronologically
    // Sort events chronologically
    const replayEvents = [...events].sort((a, b) => {
        // Extract timestamps based on event type
        let aTimestamp = 0;
        let bTimestamp = 0;

        if ('data' in a && a.data && 'timestamp' in a.data) {
            aTimestamp = a.data.timestamp;
        }

        if ('data' in b && b.data && 'timestamp' in b.data) {
            bTimestamp = b.data.timestamp;
        }

        return aTimestamp - bTimestamp;
    });

    // Calculate relative timestamps from the first event
    let startTimestamp = 0;
    if (replayEvents.length > 0 && 'data' in replayEvents[0] && replayEvents[0].data && 'timestamp' in replayEvents[0].data) {
        startTimestamp = replayEvents[0].data.timestamp;
    }

    return replayEvents.map((event, index) => {
        let eventTimestamp = 0;
        if ('data' in event && event.data && 'timestamp' in event.data) {
            eventTimestamp = event.data.timestamp;
        }

        return {
            event,
            originalIndex: index,
            relativeTimestamp: eventTimestamp - startTimestamp
        };
    });
}

export function calculateReplayDuration(replayEvents: Array<{ relativeTimestamp: number }>): number {
    if (replayEvents.length === 0) return 0;
    const lastEvent = replayEvents[replayEvents.length - 1];
    return lastEvent.relativeTimestamp;
}
