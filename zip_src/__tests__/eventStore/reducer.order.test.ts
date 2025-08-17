/**
 * reducer.order.spec.ts - Tests for chronological ordering in event reducer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventReducer, createInitialEventState, EventState, clearDuplicateCache } from '@/stores/eventReducer';
import { CanonicalEvent } from '@/types/events';

describe('EventReducer - Chronological Ordering', () => {
  let state: EventState;

  beforeEach(() => {
    clearDuplicateCache();
    state = createInitialEventState();
  });

  const createMockEvent = (id: string, createdAt: string, sessionId: string = 'session1'): CanonicalEvent => ({
    id,
    sessionId,
    userId: 'user1',
    kind: 'message',
    role: 'user',
    content: [{ type: 'text', text: `Message ${id}` }],
    createdAt,
    source: 'supabase',
  });

  it('should maintain chronological order when adding events', () => {
    const event1 = createMockEvent('1', '2024-01-01T10:00:00Z');
    const event2 = createMockEvent('2', '2024-01-01T09:00:00Z'); // Earlier
    const event3 = createMockEvent('3', '2024-01-01T11:00:00Z'); // Later

    // Add events out of chronological order
    state = eventReducer(state, { type: 'UPSERT', event: event1 });
    state = eventReducer(state, { type: 'UPSERT', event: event2 });
    state = eventReducer(state, { type: 'UPSERT', event: event3 });

    // Should be ordered chronologically
    expect(state.order).toEqual(['2', '1', '3']);
    
    // Verify actual events are in correct order
    const orderedEvents = state.order.map(id => state.byId.get(id)!);
    expect(orderedEvents[0].createdAt).toBe('2024-01-01T09:00:00Z');
    expect(orderedEvents[1].createdAt).toBe('2024-01-01T10:00:00Z');
    expect(orderedEvents[2].createdAt).toBe('2024-01-01T11:00:00Z');
  });

  it('should maintain session-specific chronological order', () => {
    const session1Event1 = createMockEvent('s1e1', '2024-01-01T10:00:00Z', 'session1');
    const session1Event2 = createMockEvent('s1e2', '2024-01-01T11:00:00Z', 'session1');
    const session2Event1 = createMockEvent('s2e1', '2024-01-01T09:30:00Z', 'session2');
    const session2Event2 = createMockEvent('s2e2', '2024-01-01T10:30:00Z', 'session2');

    // Add events in mixed order
    state = eventReducer(state, { type: 'UPSERT', event: session1Event1 });
    state = eventReducer(state, { type: 'UPSERT', event: session2Event1 });
    state = eventReducer(state, { type: 'UPSERT', event: session1Event2 });
    state = eventReducer(state, { type: 'UPSERT', event: session2Event2 });

    // Check global order
    expect(state.order).toEqual(['s2e1', 's1e1', 's2e2', 's1e2']);

    // Check session-specific order
    expect(state.bySession.get('session1')).toEqual(['s1e1', 's1e2']);
    expect(state.bySession.get('session2')).toEqual(['s2e1', 's2e2']);
  });

  it('should handle batch upserts with correct ordering', () => {
    const events = [
      createMockEvent('1', '2024-01-01T12:00:00Z'),
      createMockEvent('2', '2024-01-01T10:00:00Z'),
      createMockEvent('3', '2024-01-01T11:00:00Z'),
    ];

    state = eventReducer(state, { type: 'UPSERT_BATCH', events });

    expect(state.order).toEqual(['2', '3', '1']);
    expect(state.bySession.get('session1')).toEqual(['2', '3', '1']);
  });

  it('should handle events with identical timestamps', () => {
    const timestamp = '2024-01-01T10:00:00Z';
    const event1 = createMockEvent('1', timestamp);
    const event2 = createMockEvent('2', timestamp);
    const event3 = createMockEvent('3', timestamp);

    state = eventReducer(state, { type: 'UPSERT', event: event1 });
    state = eventReducer(state, { type: 'UPSERT', event: event2 });
    state = eventReducer(state, { type: 'UPSERT', event: event3 });

    // Should maintain insertion order for identical timestamps
    expect(state.order).toEqual(['1', '2', '3']);
  });

  it('should maintain order when removing events', () => {
    const events = [
      createMockEvent('1', '2024-01-01T09:00:00Z'),
      createMockEvent('2', '2024-01-01T10:00:00Z'),
      createMockEvent('3', '2024-01-01T11:00:00Z'),
    ];

    state = eventReducer(state, { type: 'UPSERT_BATCH', events });
    expect(state.order).toEqual(['1', '2', '3']);

    // Remove middle event
    state = eventReducer(state, { type: 'REMOVE_EVENT', eventId: '2' });
    
    expect(state.order).toEqual(['1', '3']);
    expect(state.bySession.get('session1')).toEqual(['1', '3']);
    expect(state.byId.has('2')).toBe(false);
  });

  it('should clear all ordering when clearing state', () => {
    const events = [
      createMockEvent('1', '2024-01-01T09:00:00Z'),
      createMockEvent('2', '2024-01-01T10:00:00Z'),
    ];

    state = eventReducer(state, { type: 'UPSERT_BATCH', events });
    expect(state.order.length).toBe(2);
    expect(state.bySession.size).toBe(1);

    state = eventReducer(state, { type: 'CLEAR_ALL' });
    
    expect(state.order).toEqual([]);
    expect(state.bySession.size).toBe(0);
    expect(state.byId.size).toBe(0);
  });
});