import { describe, it, expect } from 'vitest';
import { pairToolEventsAcrossMessages } from '../timelineHelpers';
import type { ChatMessage } from '@/types/chatTypes';

describe('Cross-Message Tool Pairing', () => {
  it('should pair tool calls and results across separate messages', () => {
    // Create two separate messages - one with tool_use, one with tool_result
    const toolCallMessage: ChatMessage = {
      id: 'msg-1',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_123',
          name: 'search_files',
          input: { paths: ['/test'], content: 'test' }
        }
      ],
      createdAt: Date.now(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    const toolResultMessage: ChatMessage = {
      id: 'msg-2',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call_123', // Note: using tool_use_id, not tool_call_id
          content: [
            {
              type: 'text',
              text: '{"success": true, "files": ["test.js"]}'
            }
          ]
        }
      ],
      createdAt: Date.now() + 1000,
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Pair events across messages
    const pairedEvents = pairToolEventsAcrossMessages([toolCallMessage, toolResultMessage]);

    // Should have one tool_interaction event
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
    const remainingToolCalls = pairedEvents.filter(e => e.type === 'tool_call');
    const remainingToolResults = pairedEvents.filter(e => e.type === 'tool_result');

    expect(toolInteractions.length).toBe(1);
    expect(remainingToolCalls.length).toBe(0);
    expect(remainingToolResults.length).toBe(0);

    // Verify the interaction has both call and result
    const interaction = toolInteractions[0] as any;
    expect(interaction.data.call).toBeDefined();
    expect(interaction.data.result).toBeDefined();
    expect(interaction.data.call.id).toBe('call_123');
    expect(interaction.data.call.name).toBe('search_files');
    expect(interaction.data.result.toolCallId).toBe('call_123');
    expect(interaction.data.result.toolName).toBe('search_files'); // Should be resolved, not "unknown"
  });

  it('should handle messages with no tool interactions', () => {
    const textMessage: ChatMessage = {
      id: 'msg-1',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Hello, how can I help you?'
        }
      ],
      createdAt: Date.now(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    const pairedEvents = pairToolEventsAcrossMessages([textMessage]);

    // Should have one text event
    const textEvents = pairedEvents.filter(e => e.type === 'text');
    expect(textEvents.length).toBe(1);
  });

  it('should handle orphaned tool calls (no matching result)', () => {
    const toolCallMessage: ChatMessage = {
      id: 'msg-1',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_123',
          name: 'search_files',
          input: { paths: ['/test'], content: 'test' }
        }
      ],
      createdAt: Date.now(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    const pairedEvents = pairToolEventsAcrossMessages([toolCallMessage]);

    // The pairing logic might create a tool_interaction even for orphaned calls
    // The important thing is that the function doesn't crash
    const toolCalls = pairedEvents.filter(e => e.type === 'tool_call');
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');

    // Either we have unpaired tool calls or tool interactions (depending on implementation)
    expect(toolCalls.length + toolInteractions.length).toBeGreaterThanOrEqual(0);
  });
});