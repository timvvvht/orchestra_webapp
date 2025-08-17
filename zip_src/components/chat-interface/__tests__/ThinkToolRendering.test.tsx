/**
 * Test to verify think tools are being rendered correctly
 */

import { describe, it, expect } from 'vitest';
import { convertChatMessageToTimeline } from '@/utils/timelineParser';
import { pairToolEvents } from '@/utils/timelineHelpers';
import type { ChatMessage } from '@/types/chatTypes';

describe('Think Tool Rendering', () => {
  it('should keep think tools as separate tool_call events', () => {
    const testMessage: ChatMessage = {
      id: 'test-msg-1',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'think-tool-1',
          name: 'think',
          input: { thought: 'I need to analyze this problem carefully...' }
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Convert to timeline events
    const timelineEvents = convertChatMessageToTimeline(testMessage, 0);
    console.log('Timeline events:', timelineEvents.map(e => ({ type: e.type, name: e.data?.name })));

    // Pair events
    const pairedEvents = pairToolEvents(timelineEvents);
    console.log('Paired events:', pairedEvents.map(e => ({ type: e.type, name: e.data?.name })));

    // Think tools should remain as tool_call events
    const thinkEvents = pairedEvents.filter(e => 
      e.type === 'tool_call' && (e.data as any)?.name === 'think'
    );

    expect(thinkEvents).toHaveLength(1);
    expect(thinkEvents[0].type).toBe('tool_call');
    expect((thinkEvents[0].data as any).name).toBe('think');
    expect((thinkEvents[0].data as any).parameters.thought).toBe('I need to analyze this problem carefully...');

    // Should not be any tool_interaction events for think tools
    const thinkInteractions = pairedEvents.filter(e => 
      e.type === 'tool_interaction' && (e.data as any)?.call?.name === 'think'
    );
    expect(thinkInteractions).toHaveLength(0);
  });

  it('should handle think tools with results correctly', () => {
    const testMessage: ChatMessage = {
      id: 'test-msg-2',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'think-tool-2',
          name: 'think',
          input: { thought: 'Let me think about this...' }
        },
        {
          type: 'tool_result',
          tool_use_id: 'think-tool-2',
          content: [{ type: 'text', text: 'Analysis complete' }]
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Convert to timeline events
    const timelineEvents = convertChatMessageToTimeline(testMessage, 0);
    console.log('Timeline events with result:', timelineEvents.map(e => ({ type: e.type, name: e.data?.name })));

    // Pair events
    const pairedEvents = pairToolEvents(timelineEvents);
    console.log('Paired events with result:', pairedEvents.map(e => ({ type: e.type, name: e.data?.name })));

    // Think tools should remain as separate events
    const thinkCallEvents = pairedEvents.filter(e => 
      e.type === 'tool_call' && (e.data as any)?.name === 'think'
    );
    const thinkResultEvents = pairedEvents.filter(e => 
      e.type === 'tool_result'
    );

    expect(thinkCallEvents).toHaveLength(1);
    expect(thinkResultEvents).toHaveLength(1);

    // Should not be any tool_interaction events for think tools
    const thinkInteractions = pairedEvents.filter(e => 
      e.type === 'tool_interaction' && (e.data as any)?.call?.name === 'think'
    );
    expect(thinkInteractions).toHaveLength(0);
  });

  it('should process real message history think tools correctly', () => {
    // Simulate a real think tool from message history
    const realThinkMessage: ChatMessage = {
      id: 'real-msg',
      sessionId: 'real-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_01FC61BjwTrh7XYbp7EyVFVL',
          name: 'think',
          input: { 
            thought: 'I need to implement the combined tool interaction feature that ensures tool calls and their corresponding tool results are correctly paired and combined into a single `tool_interaction` event within the unified timeline.'
          }
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Convert to timeline events
    const timelineEvents = convertChatMessageToTimeline(realThinkMessage, 0);
    
    // Pair events
    const pairedEvents = pairToolEvents(timelineEvents);

    // Verify think tool is preserved
    const thinkEvents = pairedEvents.filter(e => 
      e.type === 'tool_call' && (e.data as any)?.name === 'think'
    );

    expect(thinkEvents).toHaveLength(1);
    expect(thinkEvents[0].metadata?.supabase?.messageId).toBe('real-msg');
    
    console.log('Real think tool event:', {
      type: thinkEvents[0].type,
      name: (thinkEvents[0].data as any).name,
      messageId: thinkEvents[0].metadata?.supabase?.messageId,
      thought: (thinkEvents[0].data as any).parameters?.thought?.substring(0, 50) + '...'
    });
  });

  it('should handle messages without IDs correctly', () => {
    // Simulate a message from history file that doesn't have an ID
    const messageWithoutId: ChatMessage = {
      // No id field - simulating real message history data
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_01FC61BjwTrh7XYbp7EyVFVL',
          name: 'think',
          input: { 
            thought: 'Testing think tool without message ID'
          }
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    } as any; // Cast to any to allow missing id

    // Convert to timeline events with index (simulating pairToolEventsAcrossMessages)
    const timelineEvents = convertChatMessageToTimeline(messageWithoutId, 0);
    
    // Pair events
    const pairedEvents = pairToolEvents(timelineEvents);

    // Verify think tool is preserved
    const thinkEvents = pairedEvents.filter(e => 
      e.type === 'tool_call' && (e.data as any)?.name === 'think'
    );

    expect(thinkEvents).toHaveLength(1);
    
    // Should have generated messageId using index
    const generatedMessageId = thinkEvents[0].metadata?.supabase?.messageId;
    expect(generatedMessageId).toMatch(/^msg-0-/); // Should start with msg-0-
    
    console.log('Think tool without message ID:', {
      type: thinkEvents[0].type,
      name: (thinkEvents[0].data as any).name,
      generatedMessageId: generatedMessageId,
      thought: (thinkEvents[0].data as any).parameters?.thought
    });
  });

  it('should filter think tools correctly for both refined and unrefined modes', () => {
    const testMessage: ChatMessage = {
      id: 'test-msg-4',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'think-call-1',
          name: 'think',
          input: { thought: 'This is a complex problem that requires careful analysis.' }
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Convert to timeline events
    const timelineEvents = convertChatMessageToTimeline(testMessage, 0);
    const pairedEvents = pairToolEvents(timelineEvents);

    // Simulate the filtering logic from TimelineRenderer
    const toolEvents = pairedEvents.filter(event => 
      event?.type === 'tool_interaction' || event?.type === 'tool_call' || event?.type === 'tool_result'
    );

    // Test refined mode filtering (think tools should be included)
    const thinkEventsRefined = toolEvents.filter(event => {
      if (event.type === 'tool_interaction') {
        const interaction = event as any;
        return interaction.data.call.name === 'think';
      } else if (event.type === 'tool_call') {
        const toolCall = event as any;
        return toolCall.data.name === 'think';
      }
      return false;
    });

    // Test unrefined mode filtering (think tools should also be included)
    const thinkEventsUnrefined = toolEvents.filter(event => {
      if (event.type === 'tool_interaction') {
        const interaction = event as any;
        return interaction.data.call.name === 'think';
      } else if (event.type === 'tool_call') {
        const toolCall = event as any;
        return toolCall.data.name === 'think';
      }
      return false;
    });

    // Both modes should find the think tool
    expect(thinkEventsRefined).toHaveLength(1);
    expect(thinkEventsUnrefined).toHaveLength(1);
    expect(thinkEventsRefined[0].type).toBe('tool_call');
    expect(thinkEventsUnrefined[0].type).toBe('tool_call');
    expect((thinkEventsRefined[0].data as any).name).toBe('think');
    expect((thinkEventsUnrefined[0].data as any).name).toBe('think');
  });
});