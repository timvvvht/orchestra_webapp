/**
 * SseParser - SSE Event to CanonicalEvent Adapter
 * 
 * Converts raw SSE agent_event payloads into CanonicalEvent objects or EventPatch objects.
 * Maintains internal state for streaming chunks and handles partial events.
 */

import { CanonicalEvent, EventPatch, MessageEvent, ToolCallEvent, ToolResultEvent } from '@/types/events';
import { tap } from '@/debug/eventTap';

interface PartialMessage {
  id: string;
  sessionId: string;
  content: string;
  createdAt: string;
  isStreaming: boolean;
}

export class SseParser {
  private partialBuffer = new Map<string, PartialMessage>();

  /**
   * Parses a raw SSE event payload into CanonicalEvent or EventPatch
   * Handles both legacy format and new nested payload format
   * Throws on unknown event types to ensure proper error handling
   */
  parse(eventData: any): CanonicalEvent | EventPatch {
    try {
      if (!eventData || typeof eventData !== 'object') {
        throw new Error('Invalid event data: must be an object');
      }

      // Handle new nested format: { type: "agent_event", payload: { event_type: "...", data: {...} } }
      if (eventData.type === 'agent_event' && eventData.payload) {
        const { payload } = eventData;
        const normalizedEvent = {
          type: payload.event_type,
          sessionId: payload.session_id,
          messageId: payload.message_id,
          eventId: payload.event_id,
          timestamp: payload.timestamp,
          ...payload.data, // Spread the data fields
        };
        
        console.log('[SseParser] Normalized agent_event:', { 
          originalType: eventData.type,
          normalizedType: normalizedEvent.type,
          sessionId: normalizedEvent.sessionId,
          messageId: normalizedEvent.messageId
        });
        
        return this.parse(normalizedEvent); // Recursive call with normalized data
      }

      const { type, sessionId, messageId } = eventData;

      if (!type) {
        throw new Error('Event missing required "type" field');
      }

      let result: CanonicalEvent | EventPatch;

      switch (type) {
        case 'chunk':
          result = this.parseChunk(eventData);
          break;
        
        case 'token':
          result = this.parseToken(eventData);
          break;
        
        case 'tool_call':
          result = this.parseToolCall(eventData);
          break;
        
        case 'tool_result':
          result = this.parseToolResult(eventData);
          break;
        
        case 'done':
          result = this.parseDone(eventData);
          break;
        
        case 'error':
          result = this.parseError(eventData);
          break;
        
        default:
          throw new Error(`Unknown SSE event type: ${type}`);
      }

      // 🔍 TAP: Capture parsed SSE events for debugging
      tap('sse-parsed', result, {
        source: 'SseParser',
        originalEventType: type,
        sessionId,
        messageId,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('SseParser: Failed to parse event', { eventData, error });
      throw error;
    }
  }

  /**
   * Parses chunk events (streaming text content)
   */
  private parseChunk(eventData: any): CanonicalEvent | EventPatch {
    const { messageId, sessionId, delta, seq } = eventData;
    
    if (!messageId) {
      throw new Error('Chunk event missing messageId');
    }

    const eventId = messageId;
    const now = new Date().toISOString();

    // Check if we have a partial message in buffer
    const existing = this.partialBuffer.get(eventId);
    
    if (existing) {
      // Update existing partial message
      existing.content += delta || '';
      existing.isStreaming = true;

      // Return patch for existing message
      return {
        eventId,
        operation: 'append',
        data: { delta: delta || '', seq },
      };
    } else {
      // Create new partial message
      const partial: PartialMessage = {
        id: eventId,
        sessionId: sessionId || 'unknown',
        content: delta || '',
        createdAt: now,
        isStreaming: true,
      };
      
      this.partialBuffer.set(eventId, partial);

      // Return new message event
      return {
        id: eventId,
        createdAt: now,
        role: 'assistant',
        partial: true,
        source: 'sse',
        kind: 'message',
        content: [{
          type: 'text',
          text: delta || '',
        }],
      };
    }
  }

  /**
   * Parses token events (similar to chunks but different format)
   */
  private parseToken(eventData: any): CanonicalEvent | EventPatch {
    const { messageId, delta, seq } = eventData;
    
    // Convert token event to chunk format for consistency
    return this.parseChunk({
      type: 'chunk',
      messageId,
      delta,
      seq,
      sessionId: eventData.sessionId,
    });
  }

  /**
   * Parses tool call events
   */
  private parseToolCall(eventData: any): CanonicalEvent {
    const { messageId, sessionId, toolCall, tool_call } = eventData;
    
    // Handle both "toolCall" (legacy) and "tool_call" (new format)
    const toolData = toolCall || tool_call;
    
    if (!toolData) {
      throw new Error('Tool call event missing toolCall/tool_call data');
    }

    const { id: toolUseId, name, input, arguments: args } = toolData;
    
    if (!toolUseId) {
      throw new Error('Tool call missing id');
    }

    console.log('[SseParser] Processing tool_call:', {
      toolUseId,
      name,
      hasInput: !!input,
      hasArguments: !!args,
      messageId
    });

    return {
      id: messageId || this.generateEventId(),
      createdAt: eventData.timestamp ? new Date(eventData.timestamp * 1000).toISOString() : new Date().toISOString(),
      role: 'assistant',
      partial: false,
      source: 'sse',
      kind: 'tool_call',
      toolUseId,
      name: name || 'unknown',
      args: input || args || {}, // Try "input" first, then "arguments"
    };
  }

  /**
   * Parses tool result events
   */
  private parseToolResult(eventData: any): CanonicalEvent {
    const { messageId, sessionId, result, toolCallId } = eventData;
    
    if (!result) {
      throw new Error('Tool result event missing result data');
    }

    return {
      id: messageId || this.generateEventId(),
      createdAt: new Date().toISOString(),
      role: 'assistant',
      partial: false,
      source: 'sse',
      kind: 'tool_result',
      toolUseId: toolCallId || result.tool_use_id || this.generateToolUseId(),
      result: result,
    };
  }

  /**
   * Parses done events (marks streaming as complete)
   */
  private parseDone(eventData: any): EventPatch {
    const { messageId, sessionId } = eventData;
    
    if (!messageId) {
      throw new Error('Done event missing messageId');
    }

    // Mark partial message as complete
    const partial = this.partialBuffer.get(messageId);
    if (partial) {
      partial.isStreaming = false;
      // Keep in buffer for potential future reference
    }

    return {
      eventId: messageId,
      operation: 'complete',
      data: { isStreaming: false },
    };
  }

  /**
   * Parses error events
   */
  private parseError(eventData: any): CanonicalEvent {
    const { messageId, sessionId, error } = eventData;
    
    return {
      id: messageId || this.generateEventId(),
      createdAt: new Date().toISOString(),
      role: 'system',
      partial: false,
      source: 'sse',
      kind: 'message',
      content: [{
        type: 'text',
        text: `Error: ${error?.message || error || 'Unknown error'}`,
        is_error: true,
      }],
    };
  }

  /**
   * Generates a unique event ID
   */
  private generateEventId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates a unique tool use ID
   */
  private generateToolUseId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets the current state of partial messages
   */
  getPartialMessages(): Map<string, PartialMessage> {
    return new Map(this.partialBuffer);
  }

  /**
   * Clears completed messages from buffer
   */
  clearCompleted(): void {
    for (const [id, partial] of this.partialBuffer.entries()) {
      if (!partial.isStreaming) {
        this.partialBuffer.delete(id);
      }
    }
  }

  /**
   * Clears all partial messages from buffer
   */
  clearAll(): void {
    this.partialBuffer.clear();
  }

  /**
   * Validates if event data can be parsed
   */
  static canParse(eventData: any): boolean {
    if (!eventData || typeof eventData !== 'object') {
      return false;
    }

    // Handle new nested format
    if (eventData.type === 'agent_event' && eventData.payload && eventData.payload.event_type) {
      const eventType = eventData.payload.event_type;
      return ['chunk', 'token', 'tool_call', 'tool_result', 'done', 'error'].includes(eventType);
    }

    // Handle legacy format
    return (
      typeof eventData.type === 'string' &&
      ['chunk', 'token', 'tool_call', 'tool_result', 'done', 'error'].includes(eventData.type)
    );
  }

  /**
   * Parses SSE input that can be either a JSON array, raw log format, or SSE stream format
   */
  static parseSseInput(raw: string): CanonicalEvent[] {
    const trimmed = raw.trim();
    
    // If the input is a JSON array, parse it directly
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return arr.flatMap(eventData => this.convertJsonEvent(eventData));
        }
      } catch (error) {
        console.error('Failed to parse SSE JSON array:', error);
        return [];
      }
    }
    
    // If it's a single JSON object, parse it
    if (trimmed.startsWith('{')) {
      try {
        const eventData = JSON.parse(trimmed);
        return this.convertJsonEvent(eventData);
      } catch (error) {
        console.error('Failed to parse SSE JSON object:', error);
        return [];
      }
    }
    
    // Handle raw SSE format: "data: {...}\n\ndata: {...}\n\n"
    if (trimmed.includes('data: ')) {
      try {
        const events: CanonicalEvent[] = [];
        const lines = trimmed.split('\n');
        
        for (const line of lines) {
          const dataLine = line.trim();
          if (dataLine.startsWith('data: ')) {
            const jsonStr = dataLine.substring(6); // Remove "data: " prefix
            try {
              const eventData = JSON.parse(jsonStr);
              const converted = this.convertJsonEvent(eventData);
              events.push(...converted);
            } catch (parseError) {
              console.warn('Failed to parse SSE data line:', { line: dataLine, error: parseError });
              // Continue processing other lines
            }
          }
        }
        
        console.log(`[SseParser] Parsed ${events.length} events from SSE format`);
        return events;
      } catch (error) {
        console.error('Failed to parse SSE raw format:', error);
        return [];
      }
    }
    
    // Fallback: unknown format
    console.warn('[SseParser] Unknown input format, returning empty array');
    return [];
  }

  /**
   * Converts a single JSON event to CanonicalEvent(s)
   */
  private static convertJsonEvent(eventData: any): CanonicalEvent[] {
    try {
      const parser = this.create();
      const result = parser.parse(eventData);
      
      // If it's a CanonicalEvent, return it in an array
      if ('kind' in result) {
        return [result as CanonicalEvent];
      }
      
      // If it's an EventPatch, we can't convert it to CanonicalEvent without context
      // For the playground, we'll skip patches or convert them to a placeholder
      return [];
    } catch (error) {
      console.error('Failed to convert JSON event:', error);
      return [];
    }
  }

  /**
   * Creates a new parser instance
   */
  static create(): SseParser {
    return new SseParser();
  }
}