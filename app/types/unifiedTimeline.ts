/**
 * Unified Timeline Event System
 *
 * This provides a single source of truth for all chat events,
 * whether they come from Supabase history or real-time SSE streams.
 *
 * Every message, tool call, and tool result flows through this unified type.
 */

export interface BaseTimelineEvent {
    id: string;
    sessionId: string;
    source: 'supabase' | 'sse';
    createdAt: number;
    role: 'user' | 'assistant';
}

export interface TextTimelineEvent extends BaseTimelineEvent {
    type: 'text';
    text: string;
    isStreaming?: boolean;
}

export interface ToolCallTimelineEvent extends BaseTimelineEvent {
    type: 'tool_call';
    role: 'assistant'; // Tool calls are always from assistant
    toolCall: {
        id: string;
        name: string;
        args: Record<string, any>;
    };
}

export interface ToolResultTimelineEvent extends BaseTimelineEvent {
    type: 'tool_result';
    role: 'assistant'; // Tool results are always from assistant
    toolResult: {
        ok: boolean;
        result?: any;
        error?: string;
        toolCallId?: string;
    };
}

export interface ChunkTimelineEvent extends BaseTimelineEvent {
    type: 'chunk';
    role: 'assistant'; // Chunks are always from assistant
    delta: string;
    messageId?: string;
    isStreaming: boolean;
}

export interface ThinkGroupTimelineEvent extends BaseTimelineEvent {
    type: 'think_group';
    role: 'assistant'; // Think groups are always from assistant
    thinkTools: ToolCallTimelineEvent[];
}

export interface ToolInteractionTimelineEvent extends BaseTimelineEvent {
    type: 'tool_interaction';
    role: 'assistant'; // Tool interactions are always from assistant
    data: {
        call: UnifiedToolCall;
        result?: UnifiedToolResult; // undefined until we have it
    };
}

export type UnifiedTimelineEvent = TextTimelineEvent | ToolCallTimelineEvent | ToolResultTimelineEvent | ChunkTimelineEvent | ThinkGroupTimelineEvent | ToolInteractionTimelineEvent;

/**
 * Type guards for narrowing UnifiedTimelineEvent types
 */
export const isTextEvent = (event: UnifiedTimelineEvent): event is TextTimelineEvent => event.type === 'text';

export const isToolCallEvent = (event: UnifiedTimelineEvent): event is ToolCallTimelineEvent => event.type === 'tool_call';

export const isToolResultEvent = (event: UnifiedTimelineEvent): event is ToolResultTimelineEvent => event.type === 'tool_result';

export const isChunkEvent = (event: UnifiedTimelineEvent): event is ChunkTimelineEvent => event.type === 'chunk';

export const isThinkGroupEvent = (event: UnifiedTimelineEvent): event is ThinkGroupTimelineEvent => event.type === 'think_group';

export const isToolInteractionEvent = (event: UnifiedTimelineEvent): event is ToolInteractionTimelineEvent => event.type === 'tool_interaction';

/**
 * Helper to check if any events are currently streaming
 */
export const hasStreamingEvents = (events: UnifiedTimelineEvent[]): boolean =>
    events.some(event => (isChunkEvent(event) || isTextEvent(event)) && event.isStreaming === true);

/**
 * Helper to get the latest streaming message ID
 */
export const getStreamingMessageId = (events: UnifiedTimelineEvent[]): string | null => {
    const streamingChunk = events.filter(isChunkEvent).find(event => event.isStreaming);

    return streamingChunk?.messageId || null;
};

/**
 * Helper to consolidate chunks into text events
 */
export const consolidateChunks = (events: UnifiedTimelineEvent[]): UnifiedTimelineEvent[] => {
    const consolidated: UnifiedTimelineEvent[] = [];
    const chunkGroups = new Map<string, ChunkTimelineEvent[]>();

    // Group chunks by messageId
    for (const event of events) {
        if (isChunkEvent(event) && event.messageId) {
            if (!chunkGroups.has(event.messageId)) {
                chunkGroups.set(event.messageId, []);
            }
            chunkGroups.get(event.messageId)!.push(event);
        } else {
            consolidated.push(event);
        }
    }

    // Convert chunk groups to text events
    for (const [messageId, chunks] of chunkGroups) {
        if (chunks.length === 0) continue;

        const firstChunk = chunks[0];
        const isStillStreaming = chunks.some(chunk => chunk.isStreaming);
        const text = chunks.map(chunk => chunk.delta).join('');

        const textEvent: TextTimelineEvent = {
            id: messageId,
            type: 'text',
            sessionId: firstChunk.sessionId,
            source: firstChunk.source,
            createdAt: firstChunk.createdAt,
            role: 'assistant',
            text,
            isStreaming: isStillStreaming
        };

        consolidated.push(textEvent);
    }

    // Sort by creation time
    return consolidated.sort((a, b) => a.createdAt - b.createdAt);
};

// Unified data structures for timeline events
export interface UnifiedMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    source: 'supabase' | 'sse';
    messageId?: string;
    isStreaming?: boolean;
    rawData?: any;
}

export interface UnifiedToolCall {
    id: string;
    name: string;
    parameters: Record<string, any>;
    timestamp: number;
    source: 'supabase' | 'sse';
    originalRole?: string;
    messageId?: string;
    rawData?: any;
}

export interface UnifiedToolResult {
    id: string;
    toolCallId: string;
    toolName?: string;
    result?: any;
    success: boolean;
    error?: string;
    timestamp: number;
    source: 'supabase' | 'sse';
    messageId?: string;
    rawData?: any;
}

// File operation tracking interface
export interface FileOperation {
    type: 'created' | 'modified' | 'deleted';
    path: string;
    timestamp: number;
    success?: boolean;
}

// Tool status tracking
export interface ActiveTool {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'failed';
    startTime: number;
    endTime?: number;
}

// Verification interfaces
export interface VerificationDiscrepancy {
    type: string;
    sseEvent?: UnifiedTimelineEvent;
    supabaseEvent?: UnifiedTimelineEvent;
    description: string;
    details?: any;
}

export interface VerificationResult {
    isEquivalent: boolean;
    discrepancies: VerificationDiscrepancy[];
    statistics: {
        sseEventCount: number;
        supabaseEventCount: number;
        matchedPairs: number;
        unmatchedSSE: string[];
        unmatchedSupabase: string[];
    };
}
