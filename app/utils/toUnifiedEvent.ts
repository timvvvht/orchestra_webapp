/**
 * Central Transformer Module
 * 
 * Single source of truth for converting all data sources into UnifiedTimelineEvent
 * All other modules must import from this file to ensure consistency.
 */

import { v4 as uuid } from 'uuid';
import { logDebug } from '@/utils/sseDebug';

/**
 * Helper function to normalize tool result data from various SSE payload shapes
 * Handles flattening content arrays and parsing JSON when applicable
 */
function normalizeToolResult(toolResultData: any): { toolCallId: string; result: any; ok: boolean; error?: any } {
  console.log('🔧 [normalizeToolResult] Input data:', toolResultData);
  
  // Extract tool call ID from multiple possible locations
  const toolCallId = toolResultData.result?.tool_use_id ||  // Most common for SSE events
                     toolResultData.result?.tool_call_id || 
                     toolResultData.tool_call_id || 
                     toolResultData.toolCallId || 
                     '';
  
  // Extract result content - prefer output field, then flatten content array
  let resultContent = toolResultData.output;  // Direct string output (preferred)
  
  if (!resultContent) {
    // Fall back to content array flattening
    const contentArray = toolResultData.result?.content;
    if (Array.isArray(contentArray) && contentArray[0]?.text) {
      resultContent = contentArray[0].text;
      console.log('🔧 [normalizeToolResult] Flattened content array to text:', resultContent?.substring(0, 100) + '...');
    } else {
      // Last resort: use result directly
      resultContent = toolResultData.result;
    }
  }
  
  // Attempt to parse as JSON if it looks like a JSON string
  if (typeof resultContent === 'string' && (resultContent.startsWith('{') || resultContent.startsWith('['))) {
    try {
      const parsed = JSON.parse(resultContent);
      console.log('🔧 [normalizeToolResult] Successfully parsed JSON:', typeof parsed);
      resultContent = parsed;
    } catch (error) {
      console.log('🔧 [normalizeToolResult] JSON parse failed, keeping as string:', error.message);
      // Keep as string - parsing failed
    }
  }
  
  // Extract success flag
  const isSuccess = toolResultData.success ?? toolResultData.ok ?? true;
  
  const normalized = {
    toolCallId,
    result: resultContent,
    ok: isSuccess,
    error: toolResultData.error
  };
  
  console.log('🔧 [normalizeToolResult] Normalized result:', {
    toolCallId,
    resultType: typeof resultContent,
    resultPreview: typeof resultContent === 'string' ? resultContent.substring(0, 50) + '...' : resultContent,
    ok: isSuccess
  });
  
  return normalized;
}
import type { 
  UnifiedTimelineEvent, 
  TextTimelineEvent, 
  ToolCallTimelineEvent, 
  ToolResultTimelineEvent, 
  ChunkTimelineEvent
} from '@/types/unifiedTimeline';
import type { ChatMessage } from '@/types/chatTypes';
import type { CanonicalEvent } from '@/types/events';

// ───────── helper: digs through several possible property names ─────────
function pickNested<T = any>(event: any, ...paths: string[]): T | undefined {
  for (const p of paths) {
    const parts = p.split('.');
    let ref: any = event;
    for (const part of parts) {
      ref = ref?.[part];
    }
    if (ref !== undefined) { return ref; }
  }
  return undefined;
}

/**
 * Helper to build text timeline event from promoted chunk events
 * This creates a proper TextTimelineEvent that will be converted to CanonicalEvent downstream
 */
function buildPromotedTextEvent(event: SSEEvent, timestamp: number): TextTimelineEvent {
  return {
    id: `text-${timestamp}-${Math.random()}`,
    type: 'text',
    role: 'assistant',
    text: event.data?.content || '',
    isStreaming: false,
    sessionId: event.sessionId || 'unknown',
    source: 'sse',
    createdAt: timestamp
  };
}

// Define types for different data sources
export interface SupabaseRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: any;
  created_at: string;
  message_id?: string;
  tool_call_id?: string;
  // Add other Supabase fields as needed
}

export interface SSEEvent {
  type: string;
  sessionId?: string;
  messageId?: string;
  delta?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments?: any;
    args?: any;
  };
  toolResult?: {
    ok?: boolean;
    success?: boolean;
    result?: any;
    error?: string;
    toolCallId?: string;
  };
  data?: any;             // <─ new: where real tool info lives
  timestamp?: number;
  event_id?: string;
  // Add other SSE fields as needed
}

/**
 * Convert Supabase row to UnifiedTimelineEvent(s)
 */
export function fromSupabaseRow(row: SupabaseRow): UnifiedTimelineEvent[] {
  const events: UnifiedTimelineEvent[] = [];
  const baseEvent = {
    id: row.id,
    sessionId: row.session_id,
    source: 'supabase' as const,
    createdAt: new Date(row.created_at).getTime(),
    role: row.role
  };

  // Handle different content types
  if (typeof row.content === 'string') {
    // Check if this is a tool result message (role: 'tool')
    if (row.role === 'tool') {
      // Extract tool call ID from the database column
      const toolCallId = row.tool_call_id || '';
      
      const toolResultEvent: ToolResultTimelineEvent = {
        ...baseEvent,
        id: `${row.id}-tool-result-string`,
        type: 'tool_result',
        // We'll cast the final result to include messageId
        role: 'assistant',
        toolResult: {
          ok: true,
          result: row.content,
          error: null,
          toolCallId: toolCallId
        }
      };
      
      // Define an interface that extends ToolResultTimelineEvent
      interface EnhancedToolResultEvent extends ToolResultTimelineEvent {
        messageId: string;
      }
      
      // Add messageId using our enhanced interface
      (toolResultEvent as EnhancedToolResultEvent).messageId = row.message_id || row.id;
      events.push(toolResultEvent);
    } else {
      // Simple text message
      const textEvent: TextTimelineEvent = {
        ...baseEvent,
        type: 'text',
        messageId: row.message_id || row.id,
        text: row.content,
        isStreaming: false
      };
      events.push(textEvent);
    }
  } else if (Array.isArray(row.content)) {
    // Rich content array
    for (const contentPart of row.content) {
      if (contentPart.type === 'text') {
        const textEvent: TextTimelineEvent = {
          ...baseEvent,
          id: `${row.id}-text-${events.length}`,
          type: 'text',
          messageId: row.message_id || row.id,
          text: contentPart.text,
          isStreaming: false
        };
        events.push(textEvent);
      } else if (contentPart.type === 'tool_call' || contentPart.type === 'tool_use') {
        const toolCallEvent: ToolCallTimelineEvent = {
          ...baseEvent,
          id: `${row.id}-tool-call-${events.length}`,
          type: 'tool_call',
          messageId: row.message_id || row.id,
          role: 'assistant',
          toolCall: {
            id: contentPart.id || uuid(),
            name: contentPart.name || contentPart.function?.name,
            args: contentPart.arguments || contentPart.function?.arguments || contentPart.input || contentPart.args || {}
          }
        };
        events.push(toolCallEvent);
      } else if (contentPart.type === 'tool_result') {
        // Extract tool call ID from multiple possible locations
        // For user role messages, the tool_use_id is the key field!
        const toolCallId = contentPart.tool_use_id ||  // <-- This is the main one for user messages!
                          contentPart.toolCallId || 
                          contentPart.tool_call_id || 
                          row.tool_call_id ||
                          null;
        
        // Extract the actual result content from the nested content array
        let resultContent = (contentPart as any).result;
        if ((contentPart as any).content && Array.isArray((contentPart as any).content)) {
          // For user role messages, content is an array with text objects
          const textContent = (contentPart as any).content.find((c: any) => c.type === 'text');
          if (textContent) {
            resultContent = textContent.text;
          }
        }
        
        const toolResultEvent: ToolResultTimelineEvent = {
          ...baseEvent,
          id: `${row.id}-tool-result-${events.length}`,
          type: 'tool_result',
          role: 'assistant',
          toolResult: {
            ok: contentPart.success !== false,
            result: resultContent || (contentPart as any).result || 'No result content',
            error: contentPart.error,
            toolCallId: toolCallId
          },
          messageId: row.message_id || row.id
        };
        
        events.push(toolResultEvent);
      }
    }
  }

  return events;
}

/**
 * Convert ChatMessage to UnifiedTimelineEvent(s)
 */
export function fromChatMessage(message: ChatMessage, index?: number): UnifiedTimelineEvent[] {
  const events: UnifiedTimelineEvent[] = [];
  
  // 🚀 CRITICAL FIX: Generate unique ID when message.id is undefined
  const messageId = message.id || `msg-${index !== undefined ? index : Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseEvent = {
    id: messageId,
    sessionId: message.sessionId,
    source: 'supabase' as const, // ChatMessage typically comes from stored data
    createdAt: message.createdAt,
    role: message.role
  };

  // Handle rich content
  for (const contentPart of message.content) {
    // Define extended interfaces for our types that include messageId
    interface EnhancedToolResultEvent extends ToolResultTimelineEvent {
      messageId: string;
    }
    
    if (contentPart.type === 'text') {
      const textEvent: TextTimelineEvent = {
        ...baseEvent,
        id: `${messageId}-text-${events.length}`,
        type: 'text',
        messageId,
        text: contentPart.text,
        isStreaming: message.isStreaming || false
      };
      events.push(textEvent);
    } else if (['tool_call', 'tool_use'].includes(contentPart.type)) {
      const toolCallEvent: ToolCallTimelineEvent = {
        ...baseEvent,
        id: `${messageId}-tool-call-${events.length}`,
        type: 'tool_call',
        messageId,
        role: 'assistant',
        toolCall: {
          id: contentPart.id || uuid(),
          name: contentPart.name || contentPart.function?.name,
          args: contentPart.arguments || contentPart.function?.arguments || contentPart.input || {}
        }
      };
      events.push(toolCallEvent);
    } else if (contentPart.type === 'tool_result') {
      const toolResultEvent: ToolResultTimelineEvent = {
        ...baseEvent,
        id: `${messageId}-tool-result-${events.length}`,
        type: 'tool_result',
        // We'll cast the final result to include messageId
        role: 'assistant',
        toolResult: {
          ok: contentPart.success !== false,
          result: contentPart.result,
          error: contentPart.error
        }
      };
      
      // Add messageId using our enhanced interface
      (toolResultEvent as EnhancedToolResultEvent).messageId = messageId;
      events.push(toolResultEvent);
    }
    // Other content part types are ignored
  }

  return events;
}

/**
 * Convert SSE event to UnifiedTimelineEvent
 */
export function fromSSEEvent(event: SSEEvent): UnifiedTimelineEvent | null {
  const timestamp = event.timestamp || Date.now();
  const sessionId = event.sessionId || 'unknown';
  
  const baseEvent = {
    sessionId,
    source: 'sse' as const,
    createdAt: timestamp
  };

  // Helper to detect complete messages mis-labelled as chunks
  const isCompleteChunk = (ev: SSEEvent): boolean => {
    return (ev.type === 'chunk' || ev.type === 'message_chunk') && !!ev.data?.content;
  };

  // Declare variables outside of switch statement to avoid ESLint errors
  let chunkEvent: ChunkTimelineEvent;
  let doneEvent: ChunkTimelineEvent;
  let idleEvent: ChunkTimelineEvent;
  let tc, tr, toolCallId, toolCallEvent, toolResultEvent;
  
  switch (event.type) {
    case 'chunk':
    case 'message_chunk': {
      if (isCompleteChunk(event)) {
        // This is actually a complete message, not a streaming chunk
        // Use unique ID and do NOT copy event.event_id to prevent dedup collision
        return buildPromotedTextEvent(event, timestamp);
      }

      // ② Otherwise treat as a real stream chunk
      if (!event.delta) {
        logDebug('skip_shape_mismatch_chunk', { event, reason: 'missing delta' });
        return null;
      }
      
      chunkEvent = {
        ...baseEvent,
        id: event.event_id || `chunk-${timestamp}-${Math.random()}`,
        type: 'chunk',
        role: 'assistant',
        delta: event.delta,
        messageId: event.messageId,
        isStreaming: true
      };
      return chunkEvent;
    }

    case 'message_done':
    case 'done':
      // Handle completion even without messageId
      doneEvent = {
        ...baseEvent,
        id: event.event_id || `done-${timestamp}-${Math.random()}`,
        type: 'completion_signal',
        role: 'assistant',
        delta: '',
        messageId: event.messageId || 'session-completion',
        isStreaming: false,
        completionSignal: true
      };
      return doneEvent;

    case 'agent_status':
      // Handle agent_status completion signals
      if (event.data?.status === 'session_idle') {
        idleEvent = {
          ...baseEvent,
          id: event.event_id || `idle-${timestamp}-${Math.random()}`,
          type: 'completion_signal',
          role: 'assistant',
          delta: '',
          messageId: 'session-idle',
          isStreaming: false,
          completionSignal: true,
          agentStatus: event.data.status
        };
        return idleEvent;
      }
      return null;

    case 'tool_call':
      // Handle the actual SSE event structure for tool calls
      // The tool call data is nested under event.data.tool_call
      const toolCallData = event.data?.tool_call;
      if (!toolCallData) {
        logDebug('skip_shape_mismatch_tool_call', { event, reason: 'missing data.tool_call' });
        return null;
      }

      toolCallId = toolCallData.id || uuid();
      toolCallEvent = {
        ...baseEvent,
        id: event.event_id || `tool-call-${timestamp}-${Math.random()}`,
        type: 'tool_call',
        role: 'assistant',
        toolCall: {
          id: toolCallId,
          name: toolCallData.name,
          args: toolCallData.arguments || toolCallData.args || {}
        },
        messageId: event.messageId
      };
      return toolCallEvent as ToolCallTimelineEvent;

    case 'tool_result':
      // Handle the actual SSE event structure from the user's example
      // The tool result data is nested under event.data
      const toolResultData = event.data;
      if (!toolResultData) {
        logDebug('skip_shape_mismatch_tool_result', { event, reason: 'missing data' });
        return null;
      }

      // Use the new normalizeToolResult helper for robust parsing
      const normalized = normalizeToolResult(toolResultData);

      toolResultEvent = {
        ...baseEvent,
        id: event.event_id || `tool-result-${timestamp}-${Math.random()}`,
        type: 'tool_result',
        role: 'assistant',
        toolResult: {
          ok: normalized.ok,
          result: normalized.result,
          error: normalized.error,
          toolCallId: normalized.toolCallId
        }
      };
      
      // Define interface for enhanced result
      interface EnhancedToolResultEvent extends ToolResultTimelineEvent {
        messageId: string;
      }
      
      // Add messageId using our enhanced interface
      (toolResultEvent as EnhancedToolResultEvent).messageId = event.messageId || '';
      return toolResultEvent as ToolResultTimelineEvent;

    default:
      // Unknown event type, skip
      logDebug('skip_unknown_event_type', { event, reason: `unknown type: ${event.type}` });
      return null;
  }
}

/**
 * Universal transformer function
 * Automatically detects the source type and converts appropriately
 */
export const toUnifiedEvents = (src: SupabaseRow | ChatMessage | SSEEvent | SupabaseRow[] | ChatMessage[]): UnifiedTimelineEvent[] => {
  if (Array.isArray(src)) {
    // Handle arrays
    return src.flatMap((item, index) => {
      if ('content' in item && 'role' in item) {
        // ChatMessage array - pass index for unique ID generation
        return fromChatMessage(item as ChatMessage, index);
      } else {
        // SupabaseRow array
        return fromSupabaseRow(item as SupabaseRow);
      }
    });
  } else {
    // Handle single items
    if ('delta' in src || 'type' in src) {
      // SSE Event
      const result = fromSSEEvent(src as SSEEvent);
      return result ? [result] : [];
    } else if ('content' in src && 'role' in src) {
      // ChatMessage - single item, no index available
      return fromChatMessage(src as ChatMessage);
    } else {
      // SupabaseRow
      return fromSupabaseRow(src as SupabaseRow);
    }
  }
};

/**
 * Helper to merge and deduplicate timeline events
 */
export const mergeTimelineEvents = (events: UnifiedTimelineEvent[]): UnifiedTimelineEvent[] => {
  // STEP 1: Build a map of tool call IDs to their message IDs
  const toolCallToMessageMap = new Map<string, string>();
  for (const event of events) {
    if (event.type === 'tool_call') {
      const toolCall = event as ToolCallTimelineEvent;
      // Using typed interface to avoid 'any'
    interface EventWithMessageId {
      messageId?: string;
      toolCall?: {
        id: string;
      };
    }
    const messageId = (event as EventWithMessageId).messageId;
      if (toolCall.toolCall?.id && messageId) {
        toolCallToMessageMap.set(toolCall.toolCall.id, messageId);
      }
    }
  }
  
  // STEP 2: Fix tool result message IDs to match their parent tool calls
  const fixedEvents = events.map(event => {
    if (event.type === 'tool_result') {
      const toolResult = event as ToolResultTimelineEvent;
      const toolCallId = toolResult.toolResult?.toolCallId;
      
      if (toolCallId && toolCallToMessageMap.has(toolCallId)) {
        const parentMessageId = toolCallToMessageMap.get(toolCallId)!;
        const result = { ...toolResult };
        // Define enhanced interface for the result
      interface EnhancedToolResultEvent extends ToolResultTimelineEvent {
        messageId: string;
      }
      
      // Add messageId using our enhanced interface
      (result as EnhancedToolResultEvent).messageId = parentMessageId;
        return result as ToolResultTimelineEvent;
      }
      // If no matching tool call found, return event as is
    }
    return event;
  });
  
  const seen = new Set<string>();
  const merged: UnifiedTimelineEvent[] = [];
  
  for (const event of fixedEvents) {
    // STEP 3: Strengthen deduplication key with event_id
    // Use event_id if available, otherwise fall back to event.id, then messageId:type
    // Using explicit typing to avoid 'any' type warnings
    interface TimelineEventWithMetadata extends UnifiedTimelineEvent {
      messageId?: string;
      event_id?: string;
    }
    const messageId = (event as TimelineEventWithMetadata).messageId;
    const eventId = (event as TimelineEventWithMetadata).event_id;
    let key = eventId || event.id || (messageId ? `${messageId}:${event.type}` : `${event.id}:${event.type}`);
    
    // #chunk-promotion-dedup safeguard
    // If same event_id but different type, append type to key to prevent collision
    if (eventId && seen.has(eventId)) {
      // Find existing event with this event_id to check type
      const existingEvent = merged.find(e => (e as TimelineEventWithMetadata).event_id === eventId);
      if (existingEvent && existingEvent.type !== event.type) {
        key = `${eventId}:${event.type}`;
      }
    }
    
    // Allow multiple chunks with same ID (they represent streaming progress)
    if (event.type === 'chunk' || !seen.has(key)) {
      seen.add(key);
      merged.push(event);
    }
    // Skip duplicates (only chunks allowed to have same key)
  }
  
  // Sort by creation time
  return merged.sort((a, b) => a.createdAt - b.createdAt);
};