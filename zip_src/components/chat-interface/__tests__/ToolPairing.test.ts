/**
 * Test for tool call/result pairing logic
 */

import { describe, it, expect } from 'vitest';
import { convertChatMessageToTimeline } from '@/utils/timelineParser';
import { pairToolEvents } from '@/utils/timelineHelpers';
import type { ChatMessage } from '@/types/chatTypes';

describe('Tool Call/Result Pairing', () => {
  it('should combine tool call and result into single unified representation', () => {
    // Create a message with both tool call and result
    const testMessage: ChatMessage = {
      id: 'test-msg',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_123',
          name: 'search_files',
          input: { paths: ['/test'], content: 'test' }
        },
        {
          type: 'tool_result',
          tool_call_id: 'call_123',
          content: [
            {
              type: 'text',
              text: '{"success": true, "files": ["test.js"]}'
            }
          ]
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Convert to timeline events
    const timelineEvents = convertChatMessageToTimeline(testMessage);
    
    // Should have separate tool_call and tool_result events
    const toolCalls = timelineEvents.filter(e => e.type === 'tool_call');
    const toolResults = timelineEvents.filter(e => e.type === 'tool_result');
    
    expect(toolCalls.length).toBe(1);
    expect(toolResults.length).toBe(1);
    
    // Pair the events
    const pairedEvents = pairToolEvents(timelineEvents);
    
    // Should now have a single tool_interaction event
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
    const remainingToolCalls = pairedEvents.filter(e => e.type === 'tool_call');
    const remainingToolResults = pairedEvents.filter(e => e.type === 'tool_result');
    
    // The key test: tool calls and results should be paired into interactions
    expect(toolInteractions.length).toBe(1);
    expect(remainingToolCalls.length).toBe(0); // Should be consumed into interaction
    expect(remainingToolResults.length).toBe(0); // Should be consumed into interaction
    
    // Verify the unified representation has both call and result
    const interaction = toolInteractions[0] as any;
    expect(interaction.data.call).toBeDefined();
    expect(interaction.data.result).toBeDefined();
    expect(interaction.data.call.id).toBe('call_123');
    expect(interaction.data.call.name).toBe('search_files');
    expect(interaction.data.result.toolCallId).toBe('call_123');
  });

  it('should handle orphaned tool calls (no matching result)', () => {
    const testMessage: ChatMessage = {
      id: 'test-msg',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_orphan',
          name: 'search_files',
          input: { paths: ['/test'] }
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    const timelineEvents = convertChatMessageToTimeline(testMessage);
    const pairedEvents = pairToolEvents(timelineEvents);
    
    // Should still create a tool_interaction but without result
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
    expect(toolInteractions.length).toBe(1);
    
    const interaction = toolInteractions[0] as any;
    expect(interaction.data.call).toBeDefined();
    expect(interaction.data.result).toBeUndefined();
  });

  it('should handle orphaned tool results (no matching call)', () => {
    const testMessage: ChatMessage = {
      id: 'test-msg',
      sessionId: 'test-session',
      role: 'user', // Tool results can come from user role
      content: [
        {
          type: 'tool_result',
          tool_call_id: 'call_orphan',
          content: [
            {
              type: 'text',
              text: '{"success": true}'
            }
          ]
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    const timelineEvents = convertChatMessageToTimeline(testMessage);
    const pairedEvents = pairToolEvents(timelineEvents);
    
    // Should create a tool_interaction with stub call
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
    expect(toolInteractions.length).toBe(1);
    
    const interaction = toolInteractions[0] as any;
    expect(interaction.data.call).toBeDefined();
    expect(interaction.data.result).toBeDefined();
    expect(interaction.data.call.name).toBe('unknown'); // Stub call
    expect(interaction.data.result.toolCallId).toBe('call_orphan');
  });

  it('should handle multiple tool calls with their results', () => {
    const testMessage: ChatMessage = {
      id: 'test-msg',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_1',
          name: 'search_files',
          input: { paths: ['/test1'] }
        },
        {
          type: 'tool_use',
          id: 'call_2',
          name: 'read_files',
          input: { files: ['test.js'] }
        },
        {
          type: 'tool_result',
          tool_call_id: 'call_1',
          content: [{ type: 'text', text: '{"files": ["test1.js"]}' }]
        },
        {
          type: 'tool_result',
          tool_call_id: 'call_2',
          content: [{ type: 'text', text: '{"content": "file content"}' }]
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    const timelineEvents = convertChatMessageToTimeline(testMessage);
    const pairedEvents = pairToolEvents(timelineEvents);
    
    // Should have 2 tool_interaction events, no separate calls/results
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
    const remainingToolCalls = pairedEvents.filter(e => e.type === 'tool_call');
    const remainingToolResults = pairedEvents.filter(e => e.type === 'tool_result');
    
    expect(toolInteractions.length).toBe(2);
    expect(remainingToolCalls.length).toBe(0);
    expect(remainingToolResults.length).toBe(0);
    
    // Verify both interactions are properly paired
    const interaction1 = toolInteractions.find(i => (i as any).data.call.id === 'call_1') as any;
    const interaction2 = toolInteractions.find(i => (i as any).data.call.id === 'call_2') as any;
    
    expect(interaction1).toBeDefined();
    expect(interaction2).toBeDefined();
    expect(interaction1.data.result.toolCallId).toBe('call_1');
    expect(interaction2.data.result.toolCallId).toBe('call_2');
  });

  it('should process real message history data correctly', () => {
    // Test with a structure similar to what we found in the actual message history
    const testMessage: ChatMessage = {
      id: 'real-msg',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_DPbeNsVwEzbYTpm0b9cCIb9E',
          name: 'search_files',
          input: {
            paths: ['/Users/tim/Code/orchestra/src/components/chat-interface'],
            content: 'ToolInteractionDisplay',
            max_depth: 3,
            max_results: 20
          }
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Simulate the corresponding tool result message (from user role)
    const resultMessage: ChatMessage = {
      id: 'result-msg',
      sessionId: 'test-session',
      role: 'tool',
      content: [
        {
          type: 'tool_result',
          tool_call_id: 'call_DPbeNsVwEzbYTpm0b9cCIb9E',
          content: [
            {
              type: 'text',
              text: '{"files": [{"file": "/path/to/file.tsx", "content_matches": [...]}]}'
            }
          ]
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Process both messages
    const callEvents = convertChatMessageToTimeline(testMessage);
    const resultEvents = convertChatMessageToTimeline(resultMessage);
    const allEvents = [...callEvents, ...resultEvents];
    
    const pairedEvents = pairToolEvents(allEvents);
    
    // Should combine into single interaction
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
    expect(toolInteractions.length).toBe(1);
    
    const interaction = toolInteractions[0] as any;
    expect(interaction.data.call.id).toBe('call_DPbeNsVwEzbYTpm0b9cCIb9E');
    expect(interaction.data.call.name).toBe('search_files');
    expect(interaction.data.result).toBeDefined();
    expect(interaction.data.result.toolCallId).toBe('call_DPbeNsVwEzbYTpm0b9cCIb9E');
  });
});