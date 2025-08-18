/**
 * useTimelineEvents - Canonical store selector for timeline events
 * 
 * Provides efficient access to timeline events from the canonical Zustand store
 * with session-based filtering and optional refined mode.
 */

import { useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useEventStore } from '@/stores/eventStore';
import type { EventState } from '@/stores/eventReducer';
import type { CanonicalEvent } from '@/types/events';
import type { UnifiedTimelineEvent } from '@/types/unifiedTimeline';
import { canonicalToUnified, groupConsecutiveThinks } from './_utils';

export interface UseTimelineEventsOptions {
  refined?: boolean;
  sessionId?: string;
}

/**
 * Hook to get timeline events from canonical store
 * 
 * @param sessionId - Session ID to filter events for
 * @param options - Configuration options
 * @returns Array of UnifiedTimelineEvent objects
 */
// Stable empty array reference
const EMPTY_TIMELINE: UnifiedTimelineEvent[] = [];

export const useTimelineEvents = (
  sessionId?: string,
  options: UseTimelineEventsOptions = {}
): UnifiedTimelineEvent[] => {
  const { refined = false } = options;

  // Get the entire state and do the selection in useMemo
  // This avoids the selector returning new arrays
  const state = useEventStore();

  return useMemo(() => {
    if (!sessionId) return EMPTY_TIMELINE;
    
    // Get event IDs for this session
    const eventIds = state.bySession.get(sessionId);
    if (!eventIds || eventIds.length === 0) return EMPTY_TIMELINE;
    
    // Map IDs to events
    const events = eventIds
      .map(id => state.byId.get(id))
      .filter(Boolean) as CanonicalEvent[];
    
    const unified = events.flatMap(e => canonicalToUnified(e));
    if (refined) {
      return groupRefined(unified);
    }
    return unified;
  }, [sessionId, state.bySession, state.byId, refined]);
};

/**
 * Refined mode grouping logic
 * 
 * Groups events by conversation turns and shows only:
 * - User messages
 * - Think tool calls (all of them)
 * - Final assistant message per turn
 * - Tool calls/results for DynamicToolStatusPill
 */
function groupRefined(events: UnifiedTimelineEvent[]): UnifiedTimelineEvent[] {
  const refined: UnifiedTimelineEvent[] = [];
  let currentTurn: UnifiedTimelineEvent[] = [];
  
  for (const event of events) {
    // Start new turn on user message
    if (event.role === 'user') {
      // Process previous turn if it exists
      if (currentTurn.length > 0) {
        refined.push(...processTurn(currentTurn));
        currentTurn = [];
      }
      
      // Add user message to new turn
      currentTurn.push(event);
    } else {
      // Add to current turn
      currentTurn.push(event);
    }
  }
  
  // Process final turn
  if (currentTurn.length > 0) {
    refined.push(...processTurn(currentTurn));
  }
  
  return refined;
}

/**
 * Process a conversation turn for refined mode
 */
function processTurn(turn: UnifiedTimelineEvent[]): UnifiedTimelineEvent[] {
  const result: UnifiedTimelineEvent[] = [];
  
  // Add user message if present (should be first)
  const userMessage = turn.find(e => e.role === 'user');
  if (userMessage) {
    result.push(userMessage);
  }
  
  // Group consecutive think tool calls
  const thinkGroups = groupConsecutiveThinks(turn);
  const groupedThinks = thinkGroups.filter(e => 
    e.type === 'think_group' || 
    (e.type === 'tool_call' && 'toolCall' in e && e.toolCall.name === 'think')
  );
  result.push(...groupedThinks);
  
  // Add final assistant message (last text message from assistant)
  const assistantMessages = turn.filter(e => 
    e.type === 'text' && 
    e.role === 'assistant'
  );
  if (assistantMessages.length > 0) {
    const finalMessage = assistantMessages[assistantMessages.length - 1];
    result.push(finalMessage);
  }
  
  // Add non-think tool calls and results for pill display
  const nonThinkTools = turn.filter(e => 
    (e.type === 'tool_call' || e.type === 'tool_result') &&
    (!('toolCall' in e) || e.toolCall.name !== 'think')
  );
  result.push(...nonThinkTools);
  
  return result;
}