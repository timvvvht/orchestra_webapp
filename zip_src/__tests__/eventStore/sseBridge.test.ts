/**
 * sseBridge.spec.ts - Tests for SSE bridge
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { handleSsePayload } from '@/stores/eventBridges/sseBridge';
import { useEventStore } from '@/stores/eventStore';
import { SseParser } from '@/adapters/SseParser';

// Mock dependencies
vi.mock('@/stores/eventStore');
vi.mock('@/adapters/SseParser');

describe('SseBridge', () => {
  let mockEventStore: any;
  let mockSseParser: any;
  let consoleSpy: any;

  beforeEach(() => {
    // Reset mocks
    mockEventStore = {
      addEvent: vi.fn(),
      addEvents: vi.fn(),
    };
    (useEventStore as any).getState = vi.fn(() => mockEventStore);

    mockSseParser = {
      parse: vi.fn(),
    };
    (SseParser as any).create = vi.fn(() => mockSseParser);
    (SseParser as any).parseSseInput = vi.fn();

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock environment variable
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_CANONICAL_STORE: '1',
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    consoleSpy.mockRestore();
  });

  const createMockCanonicalEvent = (id: string, kind: string = 'message') => ({
    id,
    sessionId: 'session1',
    userId: 'user1',
    kind,
    role: 'user',
    content: [{ type: 'text', text: `Event ${id}` }],
    createdAt: '2024-01-01T10:00:00Z',
    source: 'sse',
  });

  it('should skip processing when feature flag is disabled', () => {
    // Mock the environment variable by stubbing import.meta
    const originalEnv = import.meta.env;
    Object.defineProperty(import.meta, 'env', {
      value: { ...originalEnv, VITE_CANONICAL_STORE: '0' },
      configurable: true,
    });

    handleSsePayload('test payload');

    // The function should return early and not call any parsers
    expect(SseParser.parseSseInput).not.toHaveBeenCalled();
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();

    // Restore original env
    Object.defineProperty(import.meta, 'env', {
      value: originalEnv,
      configurable: true,
    });
  });

  it('should handle string payload (raw SSE)', () => {
    const payload = 'data: {"type": "message", "content": "test"}';
    const events = [createMockCanonicalEvent('event1')];
    
    (SseParser.parseSseInput as Mock).mockReturnValue(events);

    handleSsePayload(payload);

    expect(SseParser.parseSseInput).toHaveBeenCalledWith(payload);
    expect(mockEventStore.addEvents).toHaveBeenCalledWith(events);
  });

  it('should handle empty string payload', () => {
    const payload = '';
    (SseParser.parseSseInput as Mock).mockReturnValue([]);

    handleSsePayload(payload);

    expect(SseParser.parseSseInput).toHaveBeenCalledWith(payload);
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();
  });

  it('should handle single event object payload', () => {
    const payload = {
      type: 'agent_event',
      event_type: 'message',
      data: { content: 'test message' },
    };
    const canonicalEvent = createMockCanonicalEvent('event1');
    
    mockSseParser.parse.mockReturnValue(canonicalEvent);

    handleSsePayload(payload);

    expect(SseParser.create).toHaveBeenCalled();
    expect(mockSseParser.parse).toHaveBeenCalledWith(payload);
    expect(mockEventStore.addEvent).toHaveBeenCalledWith(canonicalEvent);
  });

  it('should handle array of event objects payload', () => {
    const payload = [
      { type: 'agent_event', event_type: 'message', data: { content: 'msg1' } },
      { type: 'agent_event', event_type: 'message', data: { content: 'msg2' } },
    ];
    const events = [
      createMockCanonicalEvent('event1'),
      createMockCanonicalEvent('event2'),
    ];
    
    mockSseParser.parse
      .mockReturnValueOnce(events[0])
      .mockReturnValueOnce(events[1]);

    handleSsePayload(payload);

    expect(mockSseParser.parse).toHaveBeenCalledTimes(2);
    expect(mockEventStore.addEvents).toHaveBeenCalledWith(events);
  });

  it('should handle EventPatch objects (skip for now)', () => {
    const payload = {
      type: 'agent_event',
      event_type: 'patch',
      data: { patch: 'data' },
    };
    const eventPatch = { patch: 'some patch data' }; // Not a CanonicalEvent
    
    mockSseParser.parse.mockReturnValue(eventPatch);

    handleSsePayload(payload);

    expect(mockSseParser.parse).toHaveBeenCalledWith(payload);
    expect(mockEventStore.addEvent).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipped EventPatch')
    );
  });

  it('should handle v1 SSE format', () => {
    const payload = {
      type: 'message',
      content: 'direct message',
      session_id: 'session1',
    };
    const canonicalEvent = createMockCanonicalEvent('event1');
    
    mockSseParser.parse.mockReturnValue(canonicalEvent);

    handleSsePayload(payload);

    expect(mockSseParser.parse).toHaveBeenCalledWith(payload);
    expect(mockEventStore.addEvent).toHaveBeenCalledWith(canonicalEvent);
  });

  it('should handle v2 SSE format with nested payload', () => {
    const payload = {
      v: 2,
      type: 'agent_event',
      payload: {
        event_type: 'tool_call',
        data: { tool_name: 'think' },
        session_id: 'session1',
      },
    };
    const canonicalEvent = createMockCanonicalEvent('event1', 'tool_call');
    
    mockSseParser.parse.mockReturnValue(canonicalEvent);

    handleSsePayload(payload);

    expect(mockSseParser.parse).toHaveBeenCalledWith(payload);
    expect(mockEventStore.addEvent).toHaveBeenCalledWith(canonicalEvent);
  });

  it('should handle unknown payload formats gracefully', () => {
    const payload = 123; // Number payload
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    handleSsePayload(payload);

    expect(warnSpy).toHaveBeenCalledWith(
      '[SseBridge] Unknown SSE payload format:',
      'number'
    );
    expect(mockEventStore.addEvent).not.toHaveBeenCalled();
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('should handle null payload gracefully', () => {
    const payload = null;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    handleSsePayload(payload);

    expect(warnSpy).toHaveBeenCalledWith(
      '[SseBridge] Unknown SSE payload format:',
      'object'
    );

    warnSpy.mockRestore();
  });

  it('should handle parsing errors gracefully for string payloads', () => {
    const payload = 'invalid sse data';
    const error = new Error('Parse error');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (SseParser.parseSseInput as Mock).mockImplementation(() => {
      throw error;
    });

    handleSsePayload(payload);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process SSE string'),
      error
    );
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('should handle parsing errors gracefully for object payloads', () => {
    const payload = { invalid: 'data' };
    const error = new Error('Parse error');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockSseParser.parse.mockImplementation(() => {
      throw error;
    });

    handleSsePayload(payload);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process SSE event'),
      error
    );
    expect(mockEventStore.addEvent).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('should continue processing array even if some events fail', () => {
    const payload = [
      { type: 'valid_event', data: 'good' },
      { type: 'invalid_event', data: 'bad' },
      { type: 'valid_event', data: 'good' },
    ];
    const validEvent1 = createMockCanonicalEvent('event1');
    const validEvent2 = createMockCanonicalEvent('event2');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    mockSseParser.parse
      .mockReturnValueOnce(validEvent1)
      .mockImplementationOnce(() => { throw new Error('Parse error'); })
      .mockReturnValueOnce(validEvent2);

    handleSsePayload(payload);

    expect(mockSseParser.parse).toHaveBeenCalledTimes(3);
    expect(mockEventStore.addEvents).toHaveBeenCalledWith([validEvent1, validEvent2]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse individual SSE event'),
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('should handle tool call events correctly', () => {
    const payload = {
      type: 'agent_event',
      event_type: 'tool_call',
      data: {
        tool_name: 'think',
        tool_use_id: 'tool_123',
        arguments: { query: 'test' },
      },
    };
    const toolCallEvent = createMockCanonicalEvent('tool_call_1', 'tool_call');
    
    mockSseParser.parse.mockReturnValue(toolCallEvent);

    handleSsePayload(payload);

    expect(mockEventStore.addEvent).toHaveBeenCalledWith(toolCallEvent);
  });

  it('should handle tool result events correctly', () => {
    const payload = {
      type: 'agent_event',
      event_type: 'tool_result',
      data: {
        tool_use_id: 'tool_123',
        content: 'result data',
      },
    };
    const toolResultEvent = createMockCanonicalEvent('tool_result_1', 'tool_result');
    
    mockSseParser.parse.mockReturnValue(toolResultEvent);

    handleSsePayload(payload);

    expect(mockEventStore.addEvent).toHaveBeenCalledWith(toolResultEvent);
  });
});