/**
 * Utility functions for canonical event store selectors
 * 
 * Handles conversion between CanonicalEvent and UnifiedTimelineEvent types
 */

import type { CanonicalEvent } from '@/types/events';
import type { 
  UnifiedTimelineEvent, 
  TextTimelineEvent, 
  ToolCallTimelineEvent, 
  ToolResultTimelineEvent,
  ChunkTimelineEvent,
  ThinkGroupTimelineEvent
} from '@/types/unifiedTimeline';

/**
 * Convert a CanonicalEvent to UnifiedTimelineEvent(s)
 * 
 * @param event - CanonicalEvent from the canonical store
 * @returns Array of UnifiedTimelineEvent objects
 */
export function canonicalToUnified(event: CanonicalEvent): UnifiedTimelineEvent[] {
  // Debug logging
  console.log('[canonicalToUnified] Converting event:', {
    id: event.id,
    kind: event.kind,
    role: event.role,
    content: event.content,
    contentType: typeof event.content,
    isArray: Array.isArray(event.content)
  });
  
  const baseEvent = {
    id: event.id,
    sessionId: event.sessionId || 'unknown',
    source: event.source as 'supabase' | 'sse',
    createdAt: new Date(event.createdAt).getTime(),
    role: event.role as 'user' | 'assistant'
  };

  switch (event.kind) {
    case 'message': {
      // Handle text messages
      if (event.content && Array.isArray(event.content)) {
        return event.content
          .filter(part => part.type === 'text')
          .map((part, index) => ({
            ...baseEvent,
            type: 'text',
            text: part.text || '',
            isStreaming: event.partial || false,
            // Use unique ID for each text part
            id: event.content!.length > 1 ? `${event.id}-text-${index}` : event.id
          } as TextTimelineEvent));
      }
      
      // Fallback for non-array content
      return [{
        ...baseEvent,
        type: 'text',
        text: typeof event.content === 'string' ? event.content : '',
        isStreaming: event.partial || false
      } as TextTimelineEvent];
    }

    case 'tool_call': {
      // Extract tool call information
      let toolCall = {
        id: event.toolUseId || event.id,
        name: event.name || 'unknown',
        args: {}
      };

      // Try to extract tool call details from content
      if (event.content && Array.isArray(event.content)) {
        const toolUseContent = event.content.find(part => part.type === 'tool_use');
        if (toolUseContent) {
          toolCall = {
            id: toolUseContent.id || event.toolUseId || event.id,
            name: toolUseContent.name || event.name || 'unknown',
            args: toolUseContent.input || {}
          };
        }
      }

      return [{
        ...baseEvent,
        type: 'tool_call',
        role: 'assistant', // Tool calls are always from assistant
        toolCall,
        // Add messageId for association with text messages
        messageId: event.messageId || event.id
      } as ToolCallTimelineEvent];
    }

    case 'tool_result': {
      // Extract tool result information
      let toolResult = {
        ok: true,
        result: event.content,
        toolCallId: event.toolUseId
      };

      // Try to extract tool result details from content
      if (event.content && Array.isArray(event.content)) {
        const toolResultContent = event.content.find(part => part.type === 'tool_result');
        if (toolResultContent) {
          toolResult = {
            ok: !toolResultContent.is_error,
            result: toolResultContent.content,
            error: toolResultContent.is_error ? toolResultContent.content : undefined,
            toolCallId: toolResultContent.tool_use_id || event.toolUseId
          };
        }
      }

      return [{
        ...baseEvent,
        type: 'tool_result',
        role: 'assistant', // Tool results are always from assistant
        toolResult,
        // Add messageId for association with text messages
        messageId: event.messageId || event.id
      } as ToolResultTimelineEvent];
    }

    case 'chunk': {
      // Handle streaming chunks
      return [{
        ...baseEvent,
        type: 'chunk',
        role: 'assistant', // Chunks are always from assistant
        delta: typeof event.content === 'string' ? event.content : '',
        messageId: event.messageId || event.id,
        isStreaming: !event.done
      } as ChunkTimelineEvent];
    }

    default: {
      // Fallback for unknown event types - treat as text
      console.warn(`[canonicalToUnified] Unknown event kind: ${event.kind}`, event);
      return [{
        ...baseEvent,
        type: 'text',
        text: `[Unknown event: ${event.kind}]`,
        isStreaming: false
      } as TextTimelineEvent];
    }
  }
}

/**
 * Check if an event is a final assistant message in a turn
 */
export function isFinalAssistantMessage(
  event: UnifiedTimelineEvent, 
  allEvents: UnifiedTimelineEvent[]
): boolean {
  if (event.type !== 'text' || event.role !== 'assistant') {
    return false;
  }

  const eventIndex = allEvents.indexOf(event);
  if (eventIndex === -1) return false;

  // Look for the next user message or end of array
  for (let i = eventIndex + 1; i < allEvents.length; i++) {
    const nextEvent = allEvents[i];
    
    // If we hit a user message, this assistant message is final for this turn
    if (nextEvent.role === 'user') {
      return true;
    }
    
    // If we hit another assistant text message, this one is not final
    if (nextEvent.type === 'text' && nextEvent.role === 'assistant') {
      return false;
    }
  }

  // If we reach the end without finding another assistant message, this is final
  return true;
}

/**
 * Group consecutive think tool calls together
 */
export function groupThinkBlocks(events: UnifiedTimelineEvent[]): UnifiedTimelineEvent[] {
  const grouped: UnifiedTimelineEvent[] = [];
  let currentThinkGroup: ToolCallTimelineEvent[] = [];

  for (const event of events) {
    if (event.type === 'tool_call' && 
        'toolCall' in event && 
        event.toolCall.name === 'think') {
      currentThinkGroup.push(event as ToolCallTimelineEvent);
    } else {
      // Flush current think group if it exists
      if (currentThinkGroup.length > 0) {
        grouped.push(...currentThinkGroup);
        currentThinkGroup = [];
      }
      grouped.push(event);
    }
  }

  // Flush final think group
  if (currentThinkGroup.length > 0) {
    grouped.push(...currentThinkGroup);
  }

  return grouped;
}

/**
 * Group consecutive think() events into ThinkGroupTimelineEvent for refined mode
 */
export function groupConsecutiveThinks(
  events: UnifiedTimelineEvent[]
): UnifiedTimelineEvent[] {
  const output: UnifiedTimelineEvent[] = [];
  let buffer: ToolCallTimelineEvent[] = [];

  const flush = () => {
    if (buffer.length === 1) {
      // Single think call - keep as individual event
      output.push(buffer[0]);
    } else if (buffer.length > 1) {
      // Multiple consecutive think calls - group them
      const thinkGroup: ThinkGroupTimelineEvent = {
        id: `think-group-${buffer[0].id}`,
        type: 'think_group',
        thinkTools: buffer,
        createdAt: buffer[0].createdAt,
        sessionId: buffer[0].sessionId,
        role: 'assistant',
        source: buffer[0].source,
      };
      output.push(thinkGroup);
    }
    buffer = [];
  };

  events.forEach(ev => {
    if (
      ev.type === 'tool_call' &&
      'toolCall' in ev &&
      ev.toolCall.name === 'think'
    ) {
      buffer.push(ev as ToolCallTimelineEvent);
    } else {
      flush();
      output.push(ev);
    }
  });
  
  flush();
  return output;
}