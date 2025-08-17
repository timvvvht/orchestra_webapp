/**
 * reducer.toolIx.spec.ts - Tests for tool correlation in event reducer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventReducer, createInitialEventState, EventState, eventSelectors, clearDuplicateCache } from '@/stores/eventReducer';
import { CanonicalEvent } from '@/types/events';

describe('EventReducer - Tool Correlation', () => {
  let state: EventState;

  beforeEach(() => {
    clearDuplicateCache();
    state = createInitialEventState();
  });

  const createToolCallEvent = (id: string, toolUseId: string, name: string = 'test_tool'): CanonicalEvent => ({
    id,
    sessionId: 'session1',
    userId: 'user1',
    kind: 'tool_call',
    role: 'assistant',
    content: [{ type: 'tool_use', id: toolUseId, name, input: { test: 'data' } }],
    createdAt: '2024-01-01T10:00:00Z',
    source: 'sse',
    toolUseId,
    name,
  });

  const createToolResultEvent = (id: string, toolUseId: string): CanonicalEvent => ({
    id,
    sessionId: 'session1',
    userId: 'user1',
    kind: 'tool_result',
    role: 'user',
    content: [{ type: 'tool_result', tool_use_id: toolUseId, content: 'result data' }],
    createdAt: '2024-01-01T10:01:00Z',
    source: 'sse',
    toolUseId,
  });

  it('should create tool correlation when adding tool call', () => {
    const toolCall = createToolCallEvent('call1', 'tool_123');
    
    state = eventReducer(state, { type: 'UPSERT', event: toolCall });
    
    expect(state.toolIx.has('tool_123')).toBe(true);
    expect(state.toolIx.get('tool_123')).toEqual({ call: 'call1' });
  });

  it('should create tool correlation when adding tool result', () => {
    const toolResult = createToolResultEvent('result1', 'tool_123');
    
    state = eventReducer(state, { type: 'UPSERT', event: toolResult });
    
    expect(state.toolIx.has('tool_123')).toBe(true);
    expect(state.toolIx.get('tool_123')).toEqual({ result: 'result1' });
  });

  it('should complete tool correlation when both call and result are added', () => {
    const toolCall = createToolCallEvent('call1', 'tool_123');
    const toolResult = createToolResultEvent('result1', 'tool_123');
    
    state = eventReducer(state, { type: 'UPSERT', event: toolCall });
    state = eventReducer(state, { type: 'UPSERT', event: toolResult });
    
    expect(state.toolIx.get('tool_123')).toEqual({ 
      call: 'call1', 
      result: 'result1' 
    });
  });

  it('should handle tool correlation in reverse order (result before call)', () => {
    const toolCall = createToolCallEvent('call1', 'tool_123');
    const toolResult = createToolResultEvent('result1', 'tool_123');
    
    // Add result first, then call
    state = eventReducer(state, { type: 'UPSERT', event: toolResult });
    state = eventReducer(state, { type: 'UPSERT', event: toolCall });
    
    expect(state.toolIx.get('tool_123')).toEqual({ 
      call: 'call1', 
      result: 'result1' 
    });
  });

  it('should return tool pairs correctly', () => {
    const toolCall = createToolCallEvent('call1', 'tool_123');
    const toolResult = createToolResultEvent('result1', 'tool_123');
    
    state = eventReducer(state, { type: 'UPSERT', event: toolCall });
    state = eventReducer(state, { type: 'UPSERT', event: toolResult });
    
    const toolPair = eventSelectors.getToolPair(state, 'tool_123');
    
    expect(toolPair.call).toBeDefined();
    expect(toolPair.result).toBeDefined();
    expect(toolPair.call!.id).toBe('call1');
    expect(toolPair.result!.id).toBe('result1');
  });

  it('should return empty object for non-existent tool', () => {
    const toolPair = eventSelectors.getToolPair(state, 'nonexistent');
    expect(toolPair).toEqual({});
  });

  it('should detect orphaned tool calls', () => {
    const toolCall1 = createToolCallEvent('call1', 'tool_123');
    const toolCall2 = createToolCallEvent('call2', 'tool_456');
    const toolResult1 = createToolResultEvent('result1', 'tool_123');
    
    // Add two calls but only one result
    state = eventReducer(state, { type: 'UPSERT', event: toolCall1 });
    state = eventReducer(state, { type: 'UPSERT', event: toolCall2 });
    state = eventReducer(state, { type: 'UPSERT', event: toolResult1 });
    
    const orphaned = eventSelectors.getOrphanedToolCalls(state);
    
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0].id).toBe('call2');
    expect(orphaned[0].toolUseId).toBe('tool_456');
  });

  it('should handle multiple tool correlations', () => {
    const events = [
      createToolCallEvent('call1', 'tool_123', 'think'),
      createToolCallEvent('call2', 'tool_456', 'search'),
      createToolResultEvent('result1', 'tool_123'),
      createToolResultEvent('result2', 'tool_456'),
    ];
    
    state = eventReducer(state, { type: 'UPSERT_BATCH', events });
    
    expect(state.toolIx.size).toBe(2);
    expect(state.toolIx.get('tool_123')).toEqual({ call: 'call1', result: 'result1' });
    expect(state.toolIx.get('tool_456')).toEqual({ call: 'call2', result: 'result2' });
  });

  it('should clean up tool correlation when removing events', () => {
    const toolCall = createToolCallEvent('call1', 'tool_123');
    const toolResult = createToolResultEvent('result1', 'tool_123');
    
    state = eventReducer(state, { type: 'UPSERT', event: toolCall });
    state = eventReducer(state, { type: 'UPSERT', event: toolResult });
    
    expect(state.toolIx.get('tool_123')).toEqual({ call: 'call1', result: 'result1' });
    
    // Remove the call
    state = eventReducer(state, { type: 'REMOVE_EVENT', eventId: 'call1' });
    
    expect(state.toolIx.get('tool_123')).toEqual({ result: 'result1' });
    
    // Remove the result
    state = eventReducer(state, { type: 'REMOVE_EVENT', eventId: 'result1' });
    
    expect(state.toolIx.has('tool_123')).toBe(false);
  });

  it('should handle specialized tool names', () => {
    const thinkCall = createToolCallEvent('think1', 'tool_think_123', 'think');
    const planCall = createToolCallEvent('plan1', 'tool_plan_456', 'plan');
    
    state = eventReducer(state, { type: 'UPSERT', event: thinkCall });
    state = eventReducer(state, { type: 'UPSERT', event: planCall });
    
    expect(state.toolIx.has('tool_think_123')).toBe(true);
    expect(state.toolIx.has('tool_plan_456')).toBe(true);
    
    const thinkPair = eventSelectors.getToolPair(state, 'tool_think_123');
    const planPair = eventSelectors.getToolPair(state, 'tool_plan_456');
    
    expect(thinkPair.call?.name).toBe('think');
    expect(planPair.call?.name).toBe('plan');
  });

  it('should clear all tool correlations when clearing state', () => {
    const toolCall = createToolCallEvent('call1', 'tool_123');
    const toolResult = createToolResultEvent('result1', 'tool_123');
    
    state = eventReducer(state, { type: 'UPSERT', event: toolCall });
    state = eventReducer(state, { type: 'UPSERT', event: toolResult });
    
    expect(state.toolIx.size).toBe(1);
    
    state = eventReducer(state, { type: 'CLEAR_ALL' });
    
    expect(state.toolIx.size).toBe(0);
  });
});