/**
 * Event Tap Debug Utility - Webapp Stub Implementation
 * 
 * Stub implementation for event tapping and debugging functionality.
 * Provides basic interface for event monitoring and debugging.
 */

interface EventTapOptions {
  filter?: (event: any) => boolean;
  transform?: (event: any) => any;
  maxEvents?: number;
}

interface EventTapInstance {
  tap: (event: any) => void;
  getEvents: () => any[];
  clear: () => void;
  destroy: () => void;
}

export const createEventTap = (options: EventTapOptions = {}): EventTapInstance => {
  const events: any[] = [];
  const maxEvents = options.maxEvents || 1000;

  console.log('🔍 [STUB] Created event tap with options:', options);

  return {
    tap: (event: any) => {
      console.log('📡 [STUB] Would tap event:', event?.type || 'unknown');
      
      if (options.filter && !options.filter(event)) {
        return;
      }

      const processedEvent = options.transform ? options.transform(event) : event;
      
      events.push({
        ...processedEvent,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      });

      // Keep only the most recent events
      if (events.length > maxEvents) {
        events.splice(0, events.length - maxEvents);
      }
    },

    getEvents: () => {
      console.log('📋 [STUB] Getting tapped events, count:', events.length);
      return [...events];
    },

    clear: () => {
      console.log('🧹 [STUB] Clearing tapped events');
      events.length = 0;
    },

    destroy: () => {
      console.log('💥 [STUB] Destroying event tap');
      events.length = 0;
    }
  };
};

// Global event tap instance for debugging
let globalEventTap: EventTapInstance | null = null;

export const getGlobalEventTap = (): EventTapInstance => {
  if (!globalEventTap) {
    globalEventTap = createEventTap({
      maxEvents: 500
    });
    console.log('🌍 [STUB] Created global event tap');
  }
  return globalEventTap;
};

export const tapEvent = (event: any) => {
  const tap = getGlobalEventTap();
  tap.tap(event);
};

export const getEventHistory = () => {
  const tap = getGlobalEventTap();
  return tap.getEvents();
};

export const clearEventHistory = () => {
  const tap = getGlobalEventTap();
  tap.clear();
};

// Additional exports for compatibility
export const getTappedEvents = () => {
  console.log('📋 [STUB] Getting tapped events');
  return getEventHistory();
};

export const clearTappedEvents = () => {
  console.log('🧹 [STUB] Clearing tapped events');
  clearEventHistory();
};

export const exportTapSummary = () => {
  console.log('📤 [STUB] Exporting tap summary');
  const events = getEventHistory();
  return {
    totalEvents: events.length,
    summary: 'Stub tap summary',
    events: events.slice(0, 10), // Last 10 events
    timestamp: Date.now()
  };
};

export const diffObj = (obj1: any, obj2: any) => {
  console.log('🔍 [STUB] Diffing objects');
  return {
    added: {},
    removed: {},
    changed: {},
    unchanged: {}
  };
};

export interface TapLayer {
  id: string;
  name: string;
  active: boolean;
  eventCount: number;
}

