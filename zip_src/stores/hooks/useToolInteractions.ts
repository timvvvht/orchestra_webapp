/**
 * useToolInteractions Hook
 * 
 * Single source of truth for tool interaction state.
 * Queries the eventStore and provides a clean view model for UI components.
 * Supports both refined and unrefined modes.
 */

import { useMemo } from 'react';
import { useEventStore } from '@/stores/eventStore';
import { ChatMessage, ToolInteraction, ToolUsePart, ToolResultPart } from '@/types/chatTypes';
import { getOptimizedToolCallsForResponse } from '@/utils/optimizedMessageFiltering';

export interface UseToolInteractionsOptions {
  refinedMode?: boolean;
  allMessages?: ChatMessage[]; // Required for refined mode
}

/**
 * Hook that provides tool interactions for a given message.
 * Handles all the pairing logic between tool calls and results.
 * 
 * @param message - The message to get tool interactions for
 * @param options - Configuration options
 */
export function useToolInteractions(
  message: ChatMessage, 
  options: UseToolInteractionsOptions = {}
): ToolInteraction[] {
  const { refinedMode = false, allMessages = [] } = options;

  // Get tool calls outside of the Zustand selector to prevent side effects
  const toolUseParts = useMemo(() => {
    console.log('[useToolInteractions] Computing toolUseParts:', {
      messageId: message.id,
      refinedMode,
      allMessagesLength: allMessages.length,
      contentLength: message.content.length
    });
    if (refinedMode && allMessages.length > 0) {
      // Refined mode: Get tool calls from the entire conversation round
      try {
        const toolCalls = getOptimizedToolCallsForResponse(allMessages, message.id);
        // Convert UnifiedToolCall to ToolUsePart format
        return toolCalls.map(toolCall => ({
          type: 'tool_use' as const,
          id: toolCall.id,
          name: toolCall.name,
          input: toolCall.input || {}
        }));
      } catch (error) {
        console.warn('[useToolInteractions] Failed to get refined mode tool calls:', error);
        // Fallback to unrefined mode
        return message.content.filter(p => p.type === 'tool_use') as ToolUsePart[];
      }
    } else {
      // Unrefined mode: Get tool calls only from this message
      return message.content.filter(p => p.type === 'tool_use') as ToolUsePart[];
    }
  }, [refinedMode, allMessages.length, message.id, message.content.length]);

  return useEventStore(
    (state) => {
      
      if (toolUseParts.length === 0) {
        return [];
      }
      
      // Map each tool call to a ToolInteraction
      return toolUseParts.map(toolCall => {
        // Look up the tool pair in the store's tool index
        const pair = state.toolIx.get(toolCall.id);
        const resultEvent = pair?.result ? state.byId.get(pair.result) : undefined;
        
        // Create tool result part if we have a result event
        const toolResult: ToolResultPart | undefined = resultEvent
          ? {
              type: 'tool_result',
              tool_use_id: (resultEvent as any).toolUseId || toolCall.id,
              content: (resultEvent as any).result?.content || (resultEvent as any).result || '',
              is_error: (resultEvent as any).result?.is_error || (resultEvent as any).is_error || false,
            }
          : undefined;

        // Determine status based on result
        const status: ToolInteraction['status'] = toolResult
          ? (toolResult.is_error ? 'failed' : 'completed')
          : 'running';

        // Extract timestamps if available
        const callEvent = pair?.call ? state.byId.get(pair.call) : undefined;
        const startTime = callEvent ? new Date(callEvent.createdAt).getTime() : undefined;
        const endTime = resultEvent ? new Date(resultEvent.createdAt).getTime() : undefined;

        return {
          status,
          toolCall,
          toolResult,
          startTime,
          endTime,
        };
      });
    },
    // Selector dependencies - only depend on toolUseParts which is already memoized
    [toolUseParts]
  );
}

/**
 * Hook that provides tool interactions for multiple messages.
 * Useful for getting all tool interactions in a conversation.
 */
export function useAllToolInteractions(messages: ChatMessage[]): ToolInteraction[] {
  return useMemo(() => {
    return messages.flatMap(message => {
      const toolUseParts = message.content.filter(p => p.type === 'tool_use') as ToolUsePart[];
      return toolUseParts;
    }).map(toolCall => {
      // This is a simplified version - for full functionality, use useToolInteractions per message
      return {
        status: 'running' as const,
        toolCall,
      };
    });
  }, [messages]);
}

/**
 * Hook that provides a summary of tool interaction states for a message.
 * Useful for displaying aggregate status (e.g., "3 tools running, 2 completed").
 */
export function useToolInteractionSummary(
  message: ChatMessage, 
  options: UseToolInteractionsOptions = {}
) {
  const interactions = useToolInteractions(message, options);
  
  return useMemo(() => {
    const summary = {
      total: interactions.length,
      running: 0,
      completed: 0,
      failed: 0,
    };
    
    interactions.forEach(interaction => {
      summary[interaction.status]++;
    });
    
    return summary;
  }, [interactions]);
}