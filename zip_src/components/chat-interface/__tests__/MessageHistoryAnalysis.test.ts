/**
 * Analysis test for the new message history file
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { convertChatMessageToTimeline } from '@/utils/timelineParser';
import { pairToolEvents } from '@/utils/timelineHelpers';
import type { ChatMessage } from '@/types/chatTypes';

describe('Message History Analysis', () => {
  it('should analyze the new message history file structure', () => {
    const historyPath = '/Users/tim/code/computer-use/.message_history/history_20250705_220043.json';
    
    let messageHistory: any[];
    try {
      const historyContent = fs.readFileSync(historyPath, 'utf-8');
      messageHistory = JSON.parse(historyContent);
    } catch (error) {
      throw new Error(`Failed to load message history: ${error}`);
    }

    console.log(`\n=== MESSAGE HISTORY ANALYSIS ===`);
    console.log(`Total messages: ${messageHistory.length}`);

    // Analyze message structure
    const messagesByRole = messageHistory.reduce((acc, msg) => {
      acc[msg.role] = (acc[msg.role] || 0) + 1;
      return acc;
    }, {});

    console.log(`Messages by role:`, messagesByRole);

    // Find messages with tool calls
    const messagesWithTools = messageHistory.filter(msg => {
      if (!msg.content || !Array.isArray(msg.content)) return false;
      
      return msg.content.some(part => 
        part.type === 'tool_use' || 
        part.type === 'tool_result'
      );
    });

    console.log(`Messages with tools: ${messagesWithTools.length}`);

    // Analyze first few tool messages
    console.log(`\n=== TOOL MESSAGE ANALYSIS ===`);
    messagesWithTools.slice(0, 3).forEach((msg, index) => {
      console.log(`\nTool Message ${index + 1}:`);
      console.log(`  Role: ${msg.role}`);
      console.log(`  Content parts: ${msg.content.length}`);
      
      const toolParts = msg.content.filter(c => c.type === 'tool_use' || c.type === 'tool_result');
      console.log(`  Tool parts: ${toolParts.length}`);
      
      toolParts.forEach((part, i) => {
        if (part.type === 'tool_use') {
          console.log(`    Tool Use ${i + 1}: ${part.name} (id: ${part.id})`);
        } else if (part.type === 'tool_result') {
          console.log(`    Tool Result ${i + 1}: (tool_call_id: ${part.tool_call_id})`);
        }
      });
    });

    // Test processing with pairToolEvents
    console.log(`\n=== TOOL PAIRING ANALYSIS ===`);
    let totalProcessed = 0;
    let totalErrors = 0;
    let totalToolInteractions = 0;

    messagesWithTools.slice(0, 10).forEach((msg, index) => {
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

        console.log(`Message ${index + 1}: ${timelineEvents.length} events → ${pairedEvents.length} paired → ${toolInteractions.length} interactions`);

        // Check for potential issues
        toolInteractions.forEach((interaction, i) => {
          const data = (interaction as any).data;
          if (!data.call?.id) {
            console.log(`  ⚠️  Tool interaction ${i + 1} missing call.id`);
          }
          if (data.result && !data.result.toolCallId) {
            console.log(`  ⚠️  Tool interaction ${i + 1} result missing toolCallId`);
          }
        });

        totalProcessed++;
      } catch (error) {
        totalErrors++;
        console.log(`  ❌ Error processing message ${index + 1}: ${error.message}`);
      }
    });

    console.log(`\n=== PROCESSING SUMMARY ===`);
    console.log(`Processed: ${totalProcessed}/${messagesWithTools.slice(0, 10).length} messages`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Total tool interactions: ${totalToolInteractions}`);

    // Verify no errors occurred
    expect(totalErrors).toBe(0);
    expect(totalProcessed).toBeGreaterThan(0);
    expect(totalToolInteractions).toBeGreaterThan(0);
  });
});