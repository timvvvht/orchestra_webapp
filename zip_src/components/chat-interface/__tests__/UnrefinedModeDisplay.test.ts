/**
 * Test for unrefined mode display with new message history data
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { convertChatMessageToTimeline } from '@/utils/timelineParser';
import { pairToolEvents } from '@/utils/timelineHelpers';
import type { ChatMessage } from '@/types/chatTypes';

// Mock shouldUseUnifiedRendering to avoid DOM dependencies
const shouldUseUnifiedRendering = (message: ChatMessage): boolean => {
  if (!Array.isArray(message.content)) {
    return false;
  }
  
  return message.content.some(part => {
    if (part.type === 'tool_use' || part.type === 'tool_result') return true;
    if ('tool_use_id' in part || 'tool_use_id_for_output' in part) return true;
    return false;
  });
};

describe('Unrefined Mode Display', () => {
  it('should process new message history for unrefined mode without errors', () => {
    const historyPath = '/Users/tim/code/computer-use/.message_history/history_20250705_220043.json';
    
    let messageHistory: any[];
    try {
      const historyContent = fs.readFileSync(historyPath, 'utf-8');
      messageHistory = JSON.parse(historyContent);
    } catch (error) {
      throw new Error(`Failed to load message history: ${error}`);
    }

    // Filter to messages with tool calls
    const messagesWithTools = messageHistory.filter(msg => {
      if (!msg.content || !Array.isArray(msg.content)) return false;
      
      return msg.content.some(part => 
        part.type === 'tool_use' || 
        part.type === 'tool_result'
      );
    });

    console.log(`\n=== UNREFINED MODE PROCESSING TEST ===`);
    console.log(`Processing ${messagesWithTools.length} messages with tools`);

    let totalProcessed = 0;
    let totalErrors = 0;
    let totalToolInteractions = 0;
    let unrefinedModeMessages = 0;

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

        // Test if message should use unified rendering
        const shouldUseUnified = shouldUseUnifiedRendering(chatMessage);
        if (shouldUseUnified) {
          unrefinedModeMessages++;
        }

        // Convert to timeline events
        const timelineEvents = convertChatMessageToTimeline(chatMessage);
        
        // Pair tool events (this is where the error was occurring)
        const pairedEvents = pairToolEvents(timelineEvents);
        
        // Count tool interactions
        const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
        totalToolInteractions += toolInteractions.length;

        // Verify tool interactions have proper structure for unrefined mode
        toolInteractions.forEach((interaction, i) => {
          const data = (interaction as any).data;
          
          // Verify call structure
          expect(data.call).toBeDefined();
          expect(data.call.id).toBeDefined();
          expect(data.call.name).toBeDefined();
          
          // If there's a result, verify its structure
          if (data.result) {
            expect(data.result.toolCallId).toBeDefined();
            expect(data.result.success).toBeDefined();
          }
        });

        totalProcessed++;
      } catch (error) {
        totalErrors++;
        console.error(`Error processing message ${index + 1}:`, error.message);
      }
    });

    console.log(`\n=== PROCESSING RESULTS ===`);
    console.log(`Total processed: ${totalProcessed}/${messagesWithTools.length}`);
    console.log(`Messages for unified rendering: ${unrefinedModeMessages}`);
    console.log(`Total tool interactions: ${totalToolInteractions}`);
    console.log(`Errors: ${totalErrors}`);

    // Verify no errors occurred
    expect(totalErrors).toBe(0);
    expect(totalProcessed).toBe(messagesWithTools.length);
    expect(totalToolInteractions).toBeGreaterThan(0);
    expect(unrefinedModeMessages).toBeGreaterThan(0);
  });

  it('should handle tool interactions correctly in unrefined mode', () => {
    // Create a test message that simulates the problematic structure from the history file
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
        }
      ],
      createdAt: new Date(),
      isStreaming: false,
      thinking: false,
      delivered: true,
      read: true
    };

    // Test the processing pipeline
    const timelineEvents = convertChatMessageToTimeline(testMessage);
    expect(timelineEvents.length).toBeGreaterThan(0);

    const pairedEvents = pairToolEvents(timelineEvents);
    expect(pairedEvents.length).toBeGreaterThan(0);

    // Should create tool_interaction events for unrefined mode
    const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
    expect(toolInteractions.length).toBeGreaterThan(0);

    // Verify structure
    const interaction = toolInteractions[0] as any;
    expect(interaction.data.call).toBeDefined();
    expect(interaction.data.call.id).toBe('call_123');
    expect(interaction.data.call.name).toBe('search_files');
  });

  it('should handle tool results with tool_use_id field correctly', () => {
    // Create a test message that simulates the problematic tool result structure
    const testMessage: ChatMessage = {
      id: 'test-msg',
      sessionId: 'test-session',
      role: 'user', // Tool results can come from user role in the history
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call_123', // This is the problematic field name
          content: [
            {
              type: 'text',
              text: '{"success": true, "message": "Test result"}'
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

    // Test the processing pipeline
    expect(() => {
      const timelineEvents = convertChatMessageToTimeline(testMessage);
      const pairedEvents = pairToolEvents(timelineEvents);
      
      // Should handle the tool_use_id -> toolCallId mapping correctly
      const toolResults = pairedEvents.filter(e => e.type === 'tool_result');
      if (toolResults.length > 0) {
        const result = toolResults[0] as any;
        expect(result.data.toolCallId).toBe('call_123');
      }
    }).not.toThrow();
  });
});