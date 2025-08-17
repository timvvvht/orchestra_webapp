/**
 * Integration tests for TimelineRenderer with tool pairing
 */

import { describe, it, expect } from 'vitest';
import { pairToolEvents } from '@/utils/timelineHelpers';
import type { UnifiedTimelineEvent, ToolCallTimelineEvent, ToolResultTimelineEvent } from '@/types/unifiedTimeline';

describe('TimelineRenderer Integration', () => {
  it('should correctly pair tool events for timeline rendering', () => {
    // Simulate a typical SSE flow: call arrives first, then result
    const toolCallEvent: ToolCallTimelineEvent = {
      id: 'call-1',
      type: 'tool_call',
      sessionId: 'session-1',
      source: 'sse',
      createdAt: 1000,
      role: 'assistant',
      toolCall: {
        id: 'tool-call-1',
        name: 'str_replace_editor',
        args: { 
          command: 'str_replace',
          path: '/test/file.txt',
          old_str: 'old content',
          new_str: 'new content'
        }
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
        result: 'File updated successfully',
        toolCallId: 'tool-call-1'
      }
    };

    const events: UnifiedTimelineEvent[] = [toolCallEvent, toolResultEvent];
    const pairedEvents = pairToolEvents(events);

    // Should have exactly one tool_interaction event
    expect(pairedEvents).toHaveLength(1);
    expect(pairedEvents[0].type).toBe('tool_interaction');
    
    const interaction = pairedEvents[0] as any;
    expect(interaction.data.call.name).toBe('str_replace_editor');
    expect(interaction.data.call.parameters.command).toBe('str_replace');
    expect(interaction.data.result.success).toBe(true);
    expect(interaction.data.result.result).toBe('File updated successfully');
  });

  it('should handle mixed event types correctly', () => {
    const textEvent = {
      id: 'text-1',
      type: 'text' as const,
      sessionId: 'session-1',
      source: 'sse' as const,
      createdAt: 500,
      role: 'assistant' as const,
      text: 'Let me help you with that.',
      isStreaming: false
    };

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
        result: 'File content here',
        toolCallId: 'tool-call-1'
      }
    };

    const events: UnifiedTimelineEvent[] = [textEvent, toolCallEvent, toolResultEvent];
    const pairedEvents = pairToolEvents(events);

    // Should have text event + tool_interaction event
    expect(pairedEvents).toHaveLength(2);
    
    // Events should be sorted by timestamp
    expect(pairedEvents[0].type).toBe('text');
    expect(pairedEvents[1].type).toBe('tool_interaction');
    
    expect(pairedEvents[0].createdAt).toBe(500);
    expect(pairedEvents[1].createdAt).toBe(1000);
  });

  it('should handle think tools specially', () => {
    const thinkCallEvent: ToolCallTimelineEvent = {
      id: 'think-call-1',
      type: 'tool_call',
      sessionId: 'session-1',
      source: 'sse',
      createdAt: 1000,
      role: 'assistant',
      toolCall: {
        id: 'think-tool-1',
        name: 'think',
        args: { thought: 'I need to analyze this problem carefully...' }
      }
    };

    const thinkResultEvent: ToolResultTimelineEvent = {
      id: 'think-result-1',
      type: 'tool_result',
      sessionId: 'session-1',
      source: 'sse',
      createdAt: 2000,
      role: 'assistant',
      toolResult: {
        ok: true,
        result: 'Analysis complete',
        toolCallId: 'think-tool-1'
      }
    };

    const events: UnifiedTimelineEvent[] = [thinkCallEvent, thinkResultEvent];
    const pairedEvents = pairToolEvents(events);

    // Think tools should NOT be paired - they remain as separate events
    expect(pairedEvents).toHaveLength(2);
    expect(pairedEvents[0].type).toBe('tool_call');
    expect(pairedEvents[1].type).toBe('tool_result');
    
    // Verify the think tool call remains unchanged
    const thinkCall = pairedEvents[0] as any;
    expect(thinkCall.toolCall.name).toBe('think');
    expect(thinkCall.toolCall.args.thought).toBe('I need to analyze this problem carefully...');
  });
});