/**
 * Event Tap Debugging Utility
 * 
 * Provides debugging capabilities for inspecting and comparing data transformations
 * at various stages of the SSE and Supabase data pipelines.
 * 
 * Usage:
 * - Enabled by default, set VITE_EVENT_TAP=false to disable
 * - Use tap('layer-name', event) to capture events at different pipeline stages
 * - Automatic diffing when events reach the store layer
 */

// Environment check - enabled by default, can be disabled with VITE_EVENT_TAP=false
const isEnabled = import.meta.env.VITE_EVENT_TAP !== 'false';

// Storage for tapped events by layer
const eventTaps = new Map<string, Map<string, any>>();

// Layer identifiers
export type TapLayer = 
  | 'raw-sse'           // Raw SSE events from useACSChatStreaming
  | 'sse-parsed'        // Parsed SSE events from SseParser
  | 'raw-supa'          // Raw Supabase events
  | 'supa-processed'    // Processed Supabase events
  | 'store'             // Final canonical events entering eventStore
  | 'custom';           // Custom tap points

// Color coding for console output
const layerColors: Record<TapLayer, string> = {
  'raw-sse': '#3B82F6',        // Blue
  'sse-parsed': '#10B981',     // Emerald
  'raw-supa': '#8B5CF6',       // Purple
  'supa-processed': '#F59E0B', // Amber
  'store': '#EF4444',          // Red
  'custom': '#6B7280'          // Gray
};

/**
 * Tap function - captures events at different pipeline stages
 */
export function tap(layer: TapLayer, event: any, metadata?: Record<string, any>): void {
  if (!isEnabled) return;

  try {
    // Generate a unique identifier for this event
    const eventId = generateEventId(event);
    const timestamp = new Date().toISOString();
    
    // Store the event
    if (!eventTaps.has(layer)) {
      eventTaps.set(layer, new Map());
    }
    
    const layerMap = eventTaps.get(layer)!;
    const tappedEvent = {
      layer,
      eventId,
      timestamp,
      event: deepClone(event),
      metadata: metadata || {}
    };
    
    layerMap.set(eventId, tappedEvent);
    
    // Console logging with styling
    const color = layerColors[layer];
    console.group(`%c[TAP:${layer.toUpperCase()}] ${eventId}`, 
      `color: ${color}; font-weight: bold; background: ${color}20; padding: 2px 6px; border-radius: 3px;`);
    
    console.log('%cEvent:', 'font-weight: bold;', event);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log('%cMetadata:', 'font-weight: bold;', metadata);
    }
    console.log('%cTimestamp:', 'font-weight: bold;', timestamp);
    
    console.groupEnd();
    
    // If this is a store event, trigger diffing
    if (layer === 'store') {
      performDiffAnalysis(eventId, tappedEvent);
    }
    
    // Cleanup old events to prevent memory leaks (keep last 100 per layer)
    if (layerMap.size > 100) {
      const oldestKey = layerMap.keys().next().value;
      layerMap.delete(oldestKey);
    }
    
  } catch (error) {
    console.error('[TAP] Error capturing event:', error);
  }
}

/**
 * Generate a consistent event ID from event data
 */
function generateEventId(event: any): string {
  // Try to extract meaningful identifiers
  const candidates = [
    event?.id,
    event?.eventId,
    event?.event_id,
    event?.messageId,
    event?.message_id,
    event?.toolUseId,
    event?.tool_use_id,
    event?.sessionId,
    event?.session_id
  ].filter(Boolean);
  
  if (candidates.length > 0) {
    return candidates[0];
  }
  
  // Fallback to timestamp + random
  return `tap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone utility to avoid reference issues
 */
function deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

/**
 * Perform diff analysis when events reach the store
 */
function performDiffAnalysis(storeEventId: string, storeEvent: any): void {
  try {
    // Find corresponding events from other layers
    const sseEvent = findEventInLayer('sse-parsed', storeEventId);
    const supaEvent = findEventInLayer('supa-processed', storeEventId) || 
                     findEventInLayer('raw-supa', storeEventId);
    
    if (sseEvent && supaEvent) {
      // Compare SSE vs Supabase representations
      const diff = diffObj(sseEvent.event, supaEvent.event);
      if (diff.length > 0) {
        console.group('%c[DIFF] SSE vs Supabase Mismatch Detected!', 
          'color: #DC2626; font-weight: bold; background: #FEE2E2; padding: 4px 8px; border-radius: 4px;');
        console.log('%cEvent ID:', 'font-weight: bold;', storeEventId);
        console.log('%cSSE Event:', 'color: #10B981;', sseEvent.event);
        console.log('%cSupabase Event:', 'color: #8B5CF6;', supaEvent.event);
        console.log('%cDifferences:', 'color: #DC2626; font-weight: bold;', diff);
        console.groupEnd();
      }
    }
    
    // Compare with raw SSE if available
    const rawSseEvent = findEventInLayer('raw-sse', storeEventId);
    if (rawSseEvent && sseEvent) {
      const diff = diffObj(rawSseEvent.event, sseEvent.event);
      if (diff.length > 0) {
        console.group('%c[DIFF] SSE Parsing Transformation', 
          'color: #059669; font-weight: bold; background: #D1FAE5; padding: 4px 8px; border-radius: 4px;');
        console.log('%cEvent ID:', 'font-weight: bold;', storeEventId);
        console.log('%cRaw SSE:', 'color: #3B82F6;', rawSseEvent.event);
        console.log('%cParsed SSE:', 'color: #10B981;', sseEvent.event);
        console.log('%cTransformations:', 'color: #059669;', diff);
        console.groupEnd();
      }
    }
    
  } catch (error) {
    console.error('[TAP] Error performing diff analysis:', error);
  }
}

/**
 * Find an event in a specific layer by ID
 */
function findEventInLayer(layer: TapLayer, eventId: string): any {
  const layerMap = eventTaps.get(layer);
  if (!layerMap) return null;
  
  // Try exact match first
  if (layerMap.has(eventId)) {
    return layerMap.get(eventId);
  }
  
  // Try fuzzy matching based on common ID patterns
  for (const [storedId, event] of layerMap.entries()) {
    if (storedId.includes(eventId) || eventId.includes(storedId)) {
      return event;
    }
    
    // Check if the stored event contains the target ID in its data
    const storedEvent = event.event;
    if (storedEvent && (
      storedEvent.id === eventId ||
      storedEvent.eventId === eventId ||
      storedEvent.messageId === eventId ||
      storedEvent.toolUseId === eventId
    )) {
      return event;
    }
  }
  
  return null;
}

/**
 * Object diffing utility
 */
export function diffObj(obj1: any, obj2: any, path: string = ''): Array<{path: string, type: string, value1: any, value2: any}> {
  const differences: Array<{path: string, type: string, value1: any, value2: any}> = [];
  
  // Handle null/undefined cases
  if (obj1 === null || obj1 === undefined || obj2 === null || obj2 === undefined) {
    if (obj1 !== obj2) {
      differences.push({
        path: path || 'root',
        type: 'value_change',
        value1: obj1,
        value2: obj2
      });
    }
    return differences;
  }
  
  // Handle primitive types
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    if (obj1 !== obj2) {
      differences.push({
        path: path || 'root',
        type: 'value_change',
        value1: obj1,
        value2: obj2
      });
    }
    return differences;
  }
  
  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLength = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLength; i++) {
      const currentPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= obj1.length) {
        differences.push({
          path: currentPath,
          type: 'added',
          value1: undefined,
          value2: obj2[i]
        });
      } else if (i >= obj2.length) {
        differences.push({
          path: currentPath,
          type: 'removed',
          value1: obj1[i],
          value2: undefined
        });
      } else {
        differences.push(...diffObj(obj1[i], obj2[i], currentPath));
      }
    }
    return differences;
  }
  
  // Handle objects
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (!(key in obj1)) {
      differences.push({
        path: currentPath,
        type: 'added',
        value1: undefined,
        value2: obj2[key]
      });
    } else if (!(key in obj2)) {
      differences.push({
        path: currentPath,
        type: 'removed',
        value1: obj1[key],
        value2: undefined
      });
    } else {
      differences.push(...diffObj(obj1[key], obj2[key], currentPath));
    }
  }
  
  return differences;
}

/**
 * Get all tapped events for debugging
 */
export function getTappedEvents(): Map<string, Map<string, any>> {
  return eventTaps;
}

/**
 * Clear all tapped events
 */
export function clearTappedEvents(): void {
  eventTaps.clear();
}

/**
 * Get events from a specific layer
 */
export function getLayerEvents(layer: TapLayer): Map<string, any> {
  return eventTaps.get(layer) || new Map();
}

/**
 * Export summary of current tapped events
 */
export function exportTapSummary(): any {
  const summary: any = {};
  
  for (const [layer, events] of eventTaps.entries()) {
    summary[layer] = {
      count: events.size,
      events: Array.from(events.values()).map(event => ({
        eventId: event.eventId,
        timestamp: event.timestamp,
        metadata: event.metadata,
        // Include a preview of the event data
        preview: {
          type: event.event?.type,
          id: event.event?.id,
          sessionId: event.event?.sessionId,
          messageId: event.event?.messageId
        }
      }))
    };
  }
  
  return summary;
}