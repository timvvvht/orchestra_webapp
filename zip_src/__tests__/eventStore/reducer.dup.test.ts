/**
 * reducer.dup.spec.ts - Tests for duplicate handling in event reducer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventReducer, createInitialEventState, EventState, clearDuplicateCache } from '@/stores/eventReducer';
import { CanonicalEvent } from '@/types/events';

describe('EventReducer - Duplicate Handling', () => {
  let state: EventState;
  let consoleSpy: any;

  beforeEach(() => {
    clearDuplicateCache();
    state = createInitialEventState();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const createMockEvent = (id: string, content: string = 'test'): CanonicalEvent => ({
    id,
    sessionId: 'session1',
    kind: 'message',
    role: 'user',
    content: [{ type: 'text', text: content }],
    createdAt: '2024-01-01T10:00:00Z',
    source: 'supabase',
    partial: false,
  });

  const createToolCallEvent = (id: string, toolUseId: string, input: any): CanonicalEvent => ({
    id,
    sessionId: 'session1',
    kind: 'tool_call',
    role: 'assistant',
    toolUseId,
    name: 'test_tool',
    args: input,
    createdAt: '2024-01-01T10:00:00Z',
    source: 'sse',
    partial: false,
  });

  it('should block exact duplicate IDs', () => {
    const event1 = createMockEvent('duplicate_id', 'first content');
    const event2 = createMockEvent('duplicate_id', 'second content');

    state = eventReducer(state, { type: 'UPSERT', event: event1 });
    expect(state.byId.size).toBe(1);
    expect(state.order.length).toBe(1);

    // Try to add duplicate ID
    state = eventReducer(state, { type: 'UPSERT', event: event2 });
    
    // Should still only have one event
    expect(state.byId.size).toBe(1);
    expect(state.order.length).toBe(1);
    
    // The first event should remain unchanged
    expect(state.byId.get('duplicate_id')?.content[0]).toEqual({ type: 'text', text: 'first content' });
  });

  it('should block duplicate tool call content', () => {
    const toolInput = { query: 'test query', param: 123 };
    const toolCall1 = createToolCallEvent('call1', 'tool_123', toolInput);
    const toolCall2 = createToolCallEvent('call2', 'tool_123', toolInput); // Same toolUseId and content

    state = eventReducer(state, { type: 'UPSERT', event: toolCall1 });
    expect(state.byId.size).toBe(1);

    // Try to add duplicate content
    state = eventReducer(state, { type: 'UPSERT', event: toolCall2 });
    
    // Should still only have one event
    expect(state.byId.size).toBe(1);
    expect(state.order.length).toBe(1);
    
    // The first tool call should remain unchanged
    expect(state.byId.get('call1')).toBeDefined();
  });

  it('should allow different tool calls with same toolUseId but different content', () => {
    const toolCall1 = createToolCallEvent('call1', 'tool_123', { query: 'first' });
    const toolCall2 = createToolCallEvent('call2', 'tool_123', { query: 'second' });

    state = eventReducer(state, { type: 'UPSERT', event: toolCall1 });
    state = eventReducer(state, { type: 'UPSERT', event: toolCall2 });
    
    // Should have both events since content is different
    expect(state.byId.size).toBe(2);
    expect(state.order.length).toBe(2);
  });

  it('should allow same content with different toolUseIds', () => {
    const toolInput = { query: 'same query' };
    const toolCall1 = createToolCallEvent('call1', 'tool_123', toolInput);
    const toolCall2 = createToolCallEvent('call2', 'tool_456', toolInput);

    state = eventReducer(state, { type: 'UPSERT', event: toolCall1 });
    state = eventReducer(state, { type: 'UPSERT', event: toolCall2 });
    
    // Should have both events since toolUseIds are different
    expect(state.byId.size).toBe(2);
    expect(state.order.length).toBe(2);
  });

  it('should handle duplicates in batch operations', () => {
    const event1 = createMockEvent('1', 'content1');
    const event2 = createMockEvent('2', 'content2');
    const event3 = createMockEvent('1', 'duplicate content'); // Duplicate ID

    state = eventReducer(state, { type: 'UPSERT_BATCH', events: [event1, event2, event3] });
    
    // Should only have 2 events (duplicate blocked)
    expect(state.byId.size).toBe(2);
    expect(state.order.length).toBe(2);
    expect(state.byId.has('1')).toBe(true);
    expect(state.byId.has('2')).toBe(true);
  });

  it('should block duplicate events with same ID and kind', () => {
    const originalEvent = createMockEvent('stream1', 'partial content');
    const updatedEvent = createMockEvent('stream1', 'complete content');

    state = eventReducer(state, { type: 'UPSERT', event: originalEvent });
    expect(state.byId.get('stream1')?.content[0]).toEqual({ type: 'text', text: 'partial content' });

    // This should be blocked as duplicate ID+kind
    state = eventReducer(state, { type: 'UPSERT', event: updatedEvent });
    
    // Content should remain unchanged (duplicate blocked)
    expect(state.byId.get('stream1')?.content[0]).toEqual({ type: 'text', text: 'partial content' });
  });

  it('should clear duplicate detection cache when clearing state', () => {
    const event1 = createMockEvent('1', 'content1');
    const event2 = createMockEvent('1', 'content2'); // Duplicate ID

    state = eventReducer(state, { type: 'UPSERT', event: event1 });
    state = eventReducer(state, { type: 'UPSERT', event: event2 }); // Should be blocked

    expect(state.byId.size).toBe(1);

    // Clear state
    state = eventReducer(state, { type: 'CLEAR_ALL' });
    expect(state.byId.size).toBe(0);

    // Now the same ID should be allowed again
    state = eventReducer(state, { type: 'UPSERT', event: event2 });
    expect(state.byId.size).toBe(1);
    expect(state.byId.get('1')?.content[0]).toEqual({ type: 'text', text: 'content2' });
  });

  it('should handle non-tool events without tool-specific duplicate checking', () => {
    const message1 = createMockEvent('msg1', 'hello');
    const message2 = createMockEvent('msg2', 'hello'); // Same content, different ID

    state = eventReducer(state, { type: 'UPSERT', event: message1 });
    state = eventReducer(state, { type: 'UPSERT', event: message2 });
    
    // Both should be allowed (no tool-specific duplicate checking for messages)
    expect(state.byId.size).toBe(2);
    expect(state.order.length).toBe(2);
  });

  it('should handle tool result duplicates', () => {
    const toolResult1: CanonicalEvent = {
      id: 'result1',
      sessionId: 'session1',
      kind: 'tool_result',
      role: 'user',
      toolUseId: 'tool_123',
      result: 'result data',
      createdAt: '2024-01-01T10:00:00Z',
      source: 'sse',
      partial: false,
    };

    const toolResult2: CanonicalEvent = {
      ...toolResult1,
      id: 'result2', // Different ID, same content
    };

    state = eventReducer(state, { type: 'UPSERT', event: toolResult1 });
    state = eventReducer(state, { type: 'UPSERT', event: toolResult2 });
    
    // Should block duplicate tool result content
    expect(state.byId.size).toBe(1);
    expect(state.byId.get('result1')).toBeDefined();
  });
});