/**
 * Unit tests for ACSFirehoseService deduplication functionality
 */

import { ACSFirehoseService, type ACSRawEvent } from '../ACSFirehoseService';

// Mock the DedupeCache to avoid actual timing dependencies in tests
jest.mock('@/utils/DedupeCache', () => {
  return {
    DedupeCache: jest.fn().mockImplementation(() => {
      const seen = new Set<string>();
      return {
        seen: jest.fn((key: string) => {
          if (seen.has(key)) {
            return true; // Already seen
          }
          seen.add(key);
          return false; // New
        }),
        clear: jest.fn(() => seen.clear()),
        size: jest.fn(() => seen.size)
      };
    })
  };
});

describe('ACSFirehoseService Deduplication', () => {
  let service: ACSFirehoseService;
  let mockRawEvent: ACSRawEvent;

  beforeEach(() => {
    service = new ACSFirehoseService('http://mock-base-url');
    
    mockRawEvent = {
      event_id: 'test-event-123',
      event_type: 'tool_call',
      session_id: 'session-456',
      timestamp: Date.now(),
      data: { tool: 'test_tool', args: {} },
      message_id: 'msg-789'
    };

    // Clear console to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should emit first occurrence of event_id', () => {
    const captured: ACSRawEvent[] = [];
    
    // Subscribe to internal bus to capture emitted events
    service.subscribe((event) => {
      captured.push(event);
    });

    // Emit event for first time
    // @ts-ignore - accessing private method for testing
    service.emitEvent(mockRawEvent);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual(mockRawEvent);
  });

  it('should drop duplicate event_id', () => {
    const captured: ACSRawEvent[] = [];
    
    // Subscribe to internal bus to capture emitted events
    service.subscribe((event) => {
      captured.push(event);
    });

    // Emit same event twice
    // @ts-ignore - accessing private method for testing
    service.emitEvent(mockRawEvent);
    // @ts-ignore - accessing private method for testing
    service.emitEvent(mockRawEvent); // Duplicate

    // Should only capture the first one
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual(mockRawEvent);
  });

  it('should emit events with different event_ids', () => {
    const captured: ACSRawEvent[] = [];
    
    // Subscribe to internal bus to capture emitted events
    service.subscribe((event) => {
      captured.push(event);
    });

    const event1 = { ...mockRawEvent, event_id: 'event-1' };
    const event2 = { ...mockRawEvent, event_id: 'event-2' };

    // @ts-ignore - accessing private method for testing
    service.emitEvent(event1);
    // @ts-ignore - accessing private method for testing
    service.emitEvent(event2);

    expect(captured).toHaveLength(2);
    expect(captured[0].event_id).toBe('event-1');
    expect(captured[1].event_id).toBe('event-2');
  });

  it('should log debug message when dropping duplicates', () => {
    const debugSpy = jest.spyOn(console, 'debug');
    
    // Subscribe to avoid errors
    service.subscribe(() => {});

    // Emit same event twice
    // @ts-ignore - accessing private method for testing
    service.emitEvent(mockRawEvent);
    // @ts-ignore - accessing private method for testing
    service.emitEvent(mockRawEvent); // Duplicate

    expect(debugSpy).toHaveBeenCalledWith(
      '[Firehose] duplicate event_id dropped:',
      'test-event-123',
      'tool_call'
    );
  });

  it('should handle events with missing event_id gracefully', () => {
    const captured: ACSRawEvent[] = [];
    
    service.subscribe((event) => {
      captured.push(event);
    });

    const eventWithoutId = {
      ...mockRawEvent,
      event_id: undefined as any // Simulate missing event_id
    };

    // Should not throw error
    expect(() => {
      // @ts-ignore - accessing private method for testing
      service.emitEvent(eventWithoutId);
    }).not.toThrow();

    // Event should still be processed (deduplication only works with valid IDs)
    expect(captured).toHaveLength(1);
  });
});