/**
 * sseBridge.ts - SSE events → EventStore bridge
 * 
 * Processes real-time SSE events and feeds them into the
 * canonical event store for unified processing.
 * 
 * CANONICAL ENTRYPOINT: handleSsePayload()
 */

import { SseParser } from '@/adapters/SseParser';
import { useEventStore } from '../eventStore';
import { CanonicalEvent } from '@/types/events';
import { tap } from '@/debug/eventTap';

/**
 * 🔥 CANONICAL ENTRYPOINT - Handles different SSE payload formats
 * This is the single function that should be called from EventManager
 */
export function handleSsePayload(payload: unknown): void {
  const isEnabled = import.meta.env.VITE_CANONICAL_STORE === '1' || import.meta.env.VITE_CANONICAL_STORE === 'true';
  if (!isEnabled) {
    return;
  }
  
  try {
    if (typeof payload === 'string') {
      // Raw SSE string format
      processRawSseString(payload);
    } else if (Array.isArray(payload)) {
      // Array of event objects
      processSseEventArray(payload);
    } else if (typeof payload === 'object' && payload !== null) {
      // Single event object
      processSingleSseEvent(payload);
    } else {
      console.warn('[SseBridge] Unknown SSE payload format:', typeof payload);
    }
  } catch (error) {
    console.error('[SseBridge] Failed to handle SSE payload:', error);
  }
}

/**
 * Internal: Processes raw SSE string payload
 */
function processRawSseString(payload: string): void {
  try {
    console.log('[SseBridge] Processing SSE string:', payload.substring(0, 100) + '...');
    
    // Parse SSE payload into canonical events
    const events = SseParser.parseSseInput(payload);
    
    if (events.length === 0) {
      console.log('[SseBridge] No events parsed from SSE payload');
      return;
    }
    
    console.log(`[SseBridge] Parsed ${events.length} events from SSE string`);
    
    // 🔍 TAP: Capture parsed SSE events before they enter the store
    events.forEach(event => {
      tap('sse-parsed', event, {
        source: 'sseBridge.processRawSseString',
        originalPayload: payload.substring(0, 200) + '...',
        timestamp: new Date().toISOString()
      });
    });
    
    // Add to event store
    const store = useEventStore.getState();
    store.addEvents(events);
    
    console.log(`[SseBridge] ✅ Added ${events.length} SSE events to store`);
    
  } catch (error) {
    console.error('[SseBridge] Failed to process SSE string:', error);
    // Don't throw - we want SSE processing to be resilient
  }
}

/**
 * Internal: Processes a single SSE event object
 */
function processSingleSseEvent(eventData: any): void {
  try {
    console.log('[SseBridge] Processing SSE event:', eventData.type || eventData.event_type);
    
    // Parse single event
    const parser = SseParser.create();
    const result = parser.parse(eventData);
    
    // Handle both CanonicalEvent and EventPatch
    if ('kind' in result) {
      // It's a CanonicalEvent
      const store = useEventStore.getState();
      store.addEvent(result as CanonicalEvent);
      console.log(`[SseBridge] ✅ Added SSE event: ${result.id} (${result.kind})`);
    } else {
      // It's an EventPatch - for now, we'll skip patches
      // TODO: Implement patch handling for streaming updates
      console.log('[SseBridge] Skipped EventPatch (not yet implemented)');
    }
    
  } catch (error) {
    console.error('[SseBridge] Failed to process SSE event:', error);
    // Don't throw - we want SSE processing to be resilient
  }
}

/**
 * Internal: Processes multiple SSE events in batch
 */
function processSseEventArray(eventDataArray: any[]): void {
  try {
    console.log(`[SseBridge] Processing ${eventDataArray.length} SSE events`);
    
    const parser = SseParser.create();
    const canonicalEvents: CanonicalEvent[] = [];
    
    for (const eventData of eventDataArray) {
      try {
        const result = parser.parse(eventData);
        
        if ('kind' in result) {
          canonicalEvents.push(result as CanonicalEvent);
        }
      } catch (error) {
        console.warn('[SseBridge] Failed to parse individual SSE event:', error);
        // Continue processing other events
      }
    }
    
    if (canonicalEvents.length > 0) {
      const store = useEventStore.getState();
      store.addEvents(canonicalEvents);
      console.log(`[SseBridge] ✅ Added ${canonicalEvents.length} SSE events to store`);
    }
    
  } catch (error) {
    console.error('[SseBridge] Failed to process SSE batch:', error);
  }
}

/**
 * Gets SSE processing status for debugging
 */
export function getSseStatus() {
  const isEnabled = import.meta.env.VITE_CANONICAL_STORE === '1' || import.meta.env.VITE_CANONICAL_STORE === 'true';
  if (!isEnabled) {
    return { enabled: false, eventCount: 0 };
  }
  
  const store = useEventStore.getState();
  const allEvents = store.getAllEvents();
  const sseEvents = allEvents.filter(e => e.source === 'sse');
  
  return {
    enabled: true,
    totalEvents: allEvents.length,
    sseEvents: sseEvents.length,
    supabaseEvents: allEvents.length - sseEvents.length,
    debugInfo: store.getDebugInfo(),
  };
}

/**
 * Development helper to simulate SSE events
 */
export function simulateSseEvent(eventType: string, data: any = {}) {
  if (!import.meta.env.DEV) return;
  
  const mockEvent = {
    v: 2,
    type: 'agent_event',
    payload: {
      event_id: `sim_${Date.now()}`,
      session_id: 'simulation',
      event_type: eventType,
      timestamp: Date.now() / 1000,
      data,
      message_id: `sim_msg_${Date.now()}`,
    },
  };
  
  console.log('[SseBridge] Simulating SSE event:', mockEvent);
  handleSsePayload(mockEvent);
}