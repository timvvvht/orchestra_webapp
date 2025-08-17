/**
 * SseParser Unit Tests
 * 
 * Tests the SSE event to CanonicalEvent/EventPatch mapping functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SseParser } from '../SseParser';
import { CanonicalEvent, EventPatch } from '@/types/events';

describe('SseParser', () => {
  let parser: SseParser;

  beforeEach(() => {
    parser = SseParser.create();
  });

  describe('parse', () => {
    it('should parse chunk events', () => {
      const eventData = {
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_456',
        delta: 'Hello',
        seq: 1
      };

      const result = parser.parse(eventData);
      
      expect(result).toMatchObject({
        id: 'msg_456',
        kind: 'message',
        role: 'assistant',
        source: 'sse',
        partial: true,
        content: [
          {
            type: 'text',
            text: 'Hello'
          }
        ]
      });
    });

    it('should handle subsequent chunks as patches', () => {
      // First chunk
      const firstChunk = {
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_456',
        delta: 'Hello',
        seq: 1
      };

      const firstResult = parser.parse(firstChunk);
      expect(firstResult).toHaveProperty('kind', 'message');

      // Second chunk
      const secondChunk = {
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_456',
        delta: ' world',
        seq: 2
      };

      const secondResult = parser.parse(secondChunk);
      expect(secondResult).toMatchObject({
        eventId: 'msg_456',
        operation: 'append',
        data: { delta: ' world', seq: 2 }
      });
    });

    it('should parse tool call events', () => {
      const eventData = {
        type: 'tool_call',
        sessionId: 'session_123',
        messageId: 'msg_789',
        toolCall: {
          id: 'tool_456',
          name: 'search_files',
          input: { pattern: '*.ts' }
        }
      };

      const result = parser.parse(eventData);
      
      expect(result).toMatchObject({
        id: 'msg_789',
        kind: 'tool_call',
        role: 'assistant',
        source: 'sse',
        partial: false,
        toolUseId: 'tool_456',
        name: 'search_files',
        args: { pattern: '*.ts' }
      });
    });

    it('should parse tool result events', () => {
      const eventData = {
        type: 'tool_result',
        sessionId: 'session_123',
        messageId: 'msg_result',
        toolCallId: 'tool_456',
        result: {
          status: 'success',
          files: ['file1.ts', 'file2.ts']
        }
      };

      const result = parser.parse(eventData);
      
      expect(result).toMatchObject({
        id: 'msg_result',
        kind: 'tool_result',
        role: 'assistant',
        source: 'sse',
        partial: false,
        toolUseId: 'tool_456',
        result: {
          status: 'success',
          files: ['file1.ts', 'file2.ts']
        }
      });
    });

    it('should parse done events', () => {
      // First, create a partial message
      parser.parse({
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_streaming',
        delta: 'Complete message',
        seq: 1
      });

      const doneEvent = {
        type: 'done',
        sessionId: 'session_123',
        messageId: 'msg_streaming'
      };

      const result = parser.parse(doneEvent);
      
      expect(result).toMatchObject({
        eventId: 'msg_streaming',
        operation: 'complete',
        data: { isStreaming: false }
      });
    });

    it('should parse error events', () => {
      const eventData = {
        type: 'error',
        sessionId: 'session_123',
        messageId: 'msg_error',
        error: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR'
        }
      };

      const result = parser.parse(eventData);
      
      expect(result).toMatchObject({
        id: 'msg_error',
        kind: 'message',
        role: 'system',
        source: 'sse',
        partial: false,
        content: [
          {
            type: 'text',
            text: 'Error: Something went wrong',
            is_error: true
          }
        ]
      });
    });

    it('should throw on unknown event types', () => {
      const eventData = {
        type: 'unknown_type',
        sessionId: 'session_123'
      };

      expect(() => parser.parse(eventData)).toThrow('Unknown SSE event type: unknown_type');
    });

    it('should throw on missing type field', () => {
      const eventData = {
        sessionId: 'session_123',
        messageId: 'msg_123'
      };

      expect(() => parser.parse(eventData)).toThrow('Event missing required "type" field');
    });

    it('should throw on invalid event data', () => {
      expect(() => parser.parse(null)).toThrow('Invalid event data: must be an object');
      expect(() => parser.parse('string')).toThrow('Invalid event data: must be an object');
    });
  });

  describe('canParse', () => {
    it('should return true for valid event data', () => {
      const validEvent = {
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_456'
      };

      expect(SseParser.canParse(validEvent)).toBe(true);
    });

    it('should return false for invalid event data', () => {
      expect(SseParser.canParse(null)).toBe(false);
      expect(SseParser.canParse({ sessionId: 'test' })).toBe(false); // Missing type
      expect(SseParser.canParse({ type: 'invalid_type' })).toBe(false); // Invalid type
    });
  });

  describe('partial message management', () => {
    it('should track partial messages', () => {
      parser.parse({
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_partial',
        delta: 'Partial content',
        seq: 1
      });

      const partials = parser.getPartialMessages();
      expect(partials.size).toBe(1);
      expect(partials.get('msg_partial')).toMatchObject({
        id: 'msg_partial',
        content: 'Partial content',
        isStreaming: true
      });
    });

    it('should clear completed messages', () => {
      // Create partial message
      parser.parse({
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_partial',
        delta: 'Content',
        seq: 1
      });

      // Mark as done
      parser.parse({
        type: 'done',
        sessionId: 'session_123',
        messageId: 'msg_partial'
      });

      // Clear completed
      parser.clearCompleted();

      const partials = parser.getPartialMessages();
      expect(partials.size).toBe(0);
    });

    it('should clear all messages', () => {
      parser.parse({
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_1',
        delta: 'Content 1',
        seq: 1
      });

      parser.parse({
        type: 'chunk',
        sessionId: 'session_123',
        messageId: 'msg_2',
        delta: 'Content 2',
        seq: 1
      });

      expect(parser.getPartialMessages().size).toBe(2);

      parser.clearAll();
      expect(parser.getPartialMessages().size).toBe(0);
    });
  });
});