/**
 * Tests for timeline helper utilities
 */

import { describe, it, expect } from 'vitest';
import { pairToolEvents, getToolDisplayName, isUserFacingTool } from '../timelineHelpers';
import type { UnifiedTimelineEvent, ToolCallTimelineEvent, ToolResultTimelineEvent } from '@/types/unifiedTimeline';

describe('timelineHelpers', () => {
  describe('pairToolEvents', () => {
    it('should pair tool calls with their results', () => {
      const toolCallEvent: ToolCallTimelineEvent = {
        id: 'call-1',
        type: 'tool_call',
        sessionId: 'session-1',
        source: 'sse',
        createdAt: 1000,
        role: 'assistant',
        toolCall: {
          id: 'tool-call-1',
          name: 'read_files',
          args: { files: ['test.txt'] }
        }
      };

      const toolResultEvent: ToolResultTimelineEvent = {
        id: 'result-1',
        type: 'tool_result',
        sessionId: 'session-1',
        source: 'sse',
        createdAt: 2000,
        role: 'assistant',
        toolResult: {
          ok: true,
          result: 'file content',
          toolCallId: 'tool-call-1'
        }
      };

      const events: UnifiedTimelineEvent[] = [toolCallEvent, toolResultEvent];
      const paired = pairToolEvents(events);

      expect(paired).toHaveLength(1);
      expect(paired[0].type).toBe('tool_interaction');
      expect((paired[0] as any).data.call.name).toBe('read_files');
      expect((paired[0] as any).data.result.success).toBe(true);
    });

    it('should handle tool calls without results', () => {
      const toolCallEvent: ToolCallTimelineEvent = {
        id: 'call-1',
        type: 'tool_call',
        sessionId: 'session-1',
        source: 'sse',
        createdAt: 1000,
        role: 'assistant',
        toolCall: {
          id: 'tool-call-1',
          name: 'read_files',
          args: { files: ['test.txt'] }
        }
      };

      const events: UnifiedTimelineEvent[] = [toolCallEvent];
      const paired = pairToolEvents(events);

      expect(paired).toHaveLength(1);
      expect(paired[0].type).toBe('tool_interaction');
      expect((paired[0] as any).data.call.name).toBe('read_files');
      expect((paired[0] as any).data.result).toBeUndefined();
    });

    it('should preserve non-tool events', () => {
      const textEvent = {
        id: 'text-1',
        type: 'text' as const,
        sessionId: 'session-1',
        source: 'sse' as const,
        createdAt: 1000,
        role: 'assistant' as const,
        text: 'Hello world',
        isStreaming: false
      };

      const events: UnifiedTimelineEvent[] = [textEvent];
      const paired = pairToolEvents(events);

      expect(paired).toHaveLength(1);
      expect(paired[0]).toEqual(textEvent);
    });

    it('should handle malformed tool result events gracefully', () => {
      const toolCallEvent: ToolCallTimelineEvent = {
        id: 'call-1',
        type: 'tool_call',
        sessionId: 'session-1',
        source: 'sse',
        createdAt: 1000,
        role: 'assistant',
        toolCall: {
          id: 'tool-call-1',
          name: 'read_files',
          args: { files: ['test.txt'] }
        }
      };

      // Malformed result event without toolResult property
      const malformedResultEvent = {
        id: 'result-1',
        type: 'tool_result' as const,
        sessionId: 'session-1',
        source: 'sse' as const,
        createdAt: 2000,
        role: 'assistant' as const,
        // Missing toolResult property
      };

      const events: UnifiedTimelineEvent[] = [toolCallEvent, malformedResultEvent as any];
      const paired = pairToolEvents(events);

      // Should only have the tool call (result should be skipped)
      expect(paired).toHaveLength(1);
      expect(paired[0].type).toBe('tool_interaction');
      expect((paired[0] as any).data.call.name).toBe('read_files');
      expect((paired[0] as any).data.result).toBeUndefined();
    });

    it('should handle tool result events without toolCallId', () => {
      const toolResultEvent: ToolResultTimelineEvent = {
        id: 'result-1',
        type: 'tool_result',
        sessionId: 'session-1',
        source: 'sse',
        createdAt: 2000,
        role: 'assistant',
        toolResult: {
          ok: true,
          result: 'some result',
          // Missing toolCallId
        }
      };

      const events: UnifiedTimelineEvent[] = [toolResultEvent];
      const paired = pairToolEvents(events);

      // Should be empty since result without toolCallId is skipped
      expect(paired).toHaveLength(0);
    });

    it('should handle malformed tool call events gracefully', () => {
      // Malformed call event without toolCall property
      const malformedCallEvent = {
        id: 'call-1',
        type: 'tool_call' as const,
        sessionId: 'session-1',
        source: 'sse' as const,
        createdAt: 1000,
        role: 'assistant' as const,
        // Missing toolCall property
      };

      const events: UnifiedTimelineEvent[] = [malformedCallEvent as any];
      const paired = pairToolEvents(events);

      // Should be empty since malformed call is skipped
      expect(paired).toHaveLength(0);
    });

    it('should handle tool call events without id', () => {
      const malformedCallEvent: ToolCallTimelineEvent = {
        id: 'call-1',
        type: 'tool_call',
        sessionId: 'session-1',
        source: 'sse',
        createdAt: 1000,
        role: 'assistant',
        toolCall: {
          id: '', // Empty id
          name: 'read_files',
          args: { files: ['test.txt'] }
        }
      };

      const events: UnifiedTimelineEvent[] = [malformedCallEvent];
      const paired = pairToolEvents(events);

      // Should be empty since call without id is skipped
      expect(paired).toHaveLength(0);
    });
  });

  describe('getToolDisplayName', () => {
    it('should return human-readable names for known tools', () => {
      expect(getToolDisplayName('read_files')).toBe('Reading files');
      expect(getToolDisplayName('str_replace_editor')).toBe('Editing files');
      expect(getToolDisplayName('think')).toBe('Thought Process');
    });

    it('should format unknown tool names', () => {
      expect(getToolDisplayName('unknown_tool_name')).toBe('unknown tool name');
    });
  });

  describe('isUserFacingTool', () => {
    it('should identify user-facing tools', () => {
      expect(isUserFacingTool('think')).toBe(true);
      expect(isUserFacingTool('read_files')).toBe(true);
      expect(isUserFacingTool('str_replace_editor')).toBe(true);
    });

    it('should identify non-user-facing tools', () => {
      expect(isUserFacingTool('internal_debug_tool')).toBe(false);
      expect(isUserFacingTool('system_monitor')).toBe(false);
    });
  });
});