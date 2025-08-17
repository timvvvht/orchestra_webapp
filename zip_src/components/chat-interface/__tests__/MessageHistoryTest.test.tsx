/**
 * Test for processing new message history file and testing combined tool interaction feature
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import { convertChatMessageToTimeline } from '@/utils/timelineParser';
import { pairToolEvents } from '@/utils/timelineHelpers';
import type { ChatMessage } from '@/types/chatTypes';

describe('Message History Processing', () => {
  let messageHistory: any[];

  beforeEach(() => {
    // Load the new message history file
    const historyPath = '/Users/tim/code/computer-use/.message_history/history_20250705_220043.json';
    
    try {
      const historyContent = fs.readFileSync(historyPath, 'utf-8');
      messageHistory = JSON.parse(historyContent);
    } catch (error) {
      console.error('Failed to load message history:', error);
      messageHistory = [];
    }
  });

  it('should load message history successfully', () => {
    expect(messageHistory).toBeDefined();
    expect(Array.isArray(messageHistory)).toBe(true);
    expect(messageHistory.length).toBeGreaterThan(0);
    
    console.log(`Loaded ${messageHistory.length} messages from history`);
  });

  it('should identify messages with tool calls', () => {
    const messagesWithTools = messageHistory.filter(msg => {
      if (!msg.content || !Array.isArray(msg.content)) return false;
      
      return msg.content.some(part => 
        part.type === 'tool_use' || 
        part.type === 'tool_result' ||
        'tool_use_id' in part ||
        'tool_use_id_for_output' in part
      );
    });

    console.log(`Found ${messagesWithTools.length} messages with tool calls`);
    expect(messagesWithTools.length).toBeGreaterThan(0);

    // Log first few tool messages for inspection
    messagesWithTools.slice(0, 3).forEach((msg, index) => {
      console.log(`Tool message ${index + 1}:`, {
        role: msg.role,
        contentTypes: msg.content?.map(c => c.type),
        toolParts: msg.content?.filter(c => c.type === 'tool_use' || c.type === 'tool_result')
      });
    });
  });

  it('should convert messages to timeline events without errors', () => {
    const messagesWithTools = messageHistory.filter(msg => {
      if (!msg.content || !Array.isArray(msg.content)) return false;
      
      return msg.content.some(part => 
        part.type === 'tool_use' || 
        part.type === 'tool_result'
      );
    });

    expect(() => {
      messagesWithTools.forEach((msg, index) => {
        try {
          // Convert to ChatMessage format
          const chatMessage: ChatMessage = {
            id: msg.id || `msg-${index}`,
            sessionId: 'test-session',
            role: msg.role,
            content: msg.content,
            createdAt: new Date(),
            isStreaming: false,
            thinking: false,
            delivered: true,
            read: true
          };

          // Convert to timeline events
          const timelineEvents = convertChatMessageToTimeline(chatMessage);
          console.log(`Message ${index}: converted to ${timelineEvents.length} timeline events`);

          // Pair tool events
          const pairedEvents = pairToolEvents(timelineEvents);
          console.log(`Message ${index}: paired to ${pairedEvents.length} events`);

        } catch (error) {
          console.error(`Error processing message ${index}:`, error);
          throw error;
        }
      });
    }).not.toThrow();
  });

  it('should handle tool calls with missing IDs gracefully', () => {
    // Create a test message with malformed tool calls
    const testMessage: ChatMessage = {
      id: 'test-msg',
      sessionId: 'test-session',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_123',
          name: 'test_tool',
          input: { param: 'value' }
        },
        {
          type: 'tool_result',
          tool_call_id: 'call_123',
          content: 'result'
        },
        // Malformed tool call without ID
        {
          type: 'tool_use',
          name: 'bad_tool',
          input: { param: 'value' }
        } as any,
        // Malformed tool result without tool_call_id
        {
          type: 'tool_result',
          content: 'orphaned result'
        } as any
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    expect(() => {
      const timelineEvents = convertChatMessageToTimeline(testMessage);
      const pairedEvents = pairToolEvents(timelineEvents);
      console.log('Paired events with malformed data:', pairedEvents.length);
    }).not.toThrow();
  });

  it('should process tool interactions for unrefined mode display', () => {
    const messagesWithTools = messageHistory.filter(msg => {
      if (!msg.content || !Array.isArray(msg.content)) return false;
      
      return msg.content.some(part => 
        part.type === 'tool_use' || 
        part.type === 'tool_result'
      );
    }).slice(0, 5); // Test with first 5 messages

    let totalToolInteractions = 0;
    let errorCount = 0;

    messagesWithTools.forEach((msg, index) => {
      try {
        const chatMessage: ChatMessage = {
          id: msg.id || `msg-${index}`,
          sessionId: 'test-session',
          role: msg.role,
          content: msg.content,
          createdAt: new Date(),
          isStreaming: false,
          thinking: false,
          delivered: true,
          read: true
        };

        const timelineEvents = convertChatMessageToTimeline(chatMessage);
        const pairedEvents = pairToolEvents(timelineEvents);
        
        const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
        totalToolInteractions += toolInteractions.length;

        // Log details about tool interactions
        toolInteractions.forEach((interaction, i) => {
          const data = (interaction as any).data;
          console.log(`Tool interaction ${i + 1} in message ${index}:`, {
            callId: data.call?.id,
            callName: data.call?.name,
            hasResult: !!data.result,
            resultToolCallId: data.result?.toolCallId
          });
        });

      } catch (error) {
        errorCount++;
        console.error(`Error processing message ${index}:`, error);
      }
    });

    console.log(`Processed ${messagesWithTools.length} messages with ${totalToolInteractions} tool interactions and ${errorCount} errors`);
    expect(errorCount).toBe(0); // Should process without errors
  });
});