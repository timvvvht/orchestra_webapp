/**
 * eventStore.ts - Zustand store for canonical events
 *
 * Provides a reactive store for canonical events with:
 * - Immutable updates via Immer
 * - Tool correlation tracking
 * - Chronological ordering
 * - Feature flag gating
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  eventReducer,
  type EventState,
  type Action,
  createInitialEventState,
  eventSelectors,
} from "./eventReducer";
import { CanonicalEvent } from "@/types/events";

interface EventStore extends EventState {
  // Actions
  dispatch: (action: Action) => void;

  // Convenience methods
  addEvent: (event: CanonicalEvent) => void;
  addEvents: (events: CanonicalEvent[]) => void;
  clearAll: () => void;
  removeEvent: (eventId: string) => void;

  // Selectors (for convenience)
  getAllEvents: () => CanonicalEvent[];
  getEventById: (id: string) => CanonicalEvent | undefined;
  getEventsForSession: (sessionId: string) => CanonicalEvent[];
  getSessionIds: () => string[];
  getSessionEventCount: (sessionId: string) => number;
  getToolPair: (toolUseId: string) => {
    call?: CanonicalEvent;
    result?: CanonicalEvent;
  };
  getOrphanedToolCalls: () => CanonicalEvent[];
  getEventCount: () => number;
  getLastEventId: () => string;

  // Debug helpers
  getDebugInfo: () => {
    eventCount: number;
    toolPairCount: number;
    orphanedCalls: number;
    lastEventId: string;
    hasDuplicateIds: boolean;
  };
}

/**
 * Feature flag check
 */
function isCanonicalStoreEnabled(): boolean {
  const value = import.meta.env.VITE_CANONICAL_STORE;
  const enabled = value === "1" || value === "true";
  console.log(
    `🏴 [EventStore] Canonical store enabled: ${enabled} (VITE_CANONICAL_STORE=${value})`
  );
  return enabled;
}

/**
 * Main event store
 */
export const useEventStore = create<EventStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      ...createInitialEventState(),

      // Core dispatch action
      dispatch: (action: Action) => {
        if (!isCanonicalStoreEnabled()) {
          console.log(
            `⚠️ [EventStore] Canonical store disabled, ignoring action:`,
            action.type
          );
          return;
        }

        const dispatchId = `dispatch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🔄 [EventStore] [${dispatchId}] Dispatching action:`, {
          type: action.type,
          eventId: "event" in action ? action.event?.id : undefined,
          eventCount: "events" in action ? action.events?.length : undefined,
        });

        set((state) => {
          const beforeState = {
            eventCount: state.order.length,
            sessionCount: state.bySession.size,
            toolPairCount: state.toolIx.size,
          };

          // When using immer middleware, we need to mutate the draft, not return a new state
          // The reducer returns a new state, so we need to copy its properties
          const newState = eventReducer(state, action);

          console.log("[eventStores][eventReducer] newState:", newState);

          // Copy all properties from newState to the draft state
          state.byId = newState.byId;
          state.order = newState.order;
          state.bySession = newState.bySession;
          state.toolIx = newState.toolIx;
          state.resume = newState.resume;

          const afterState = {
            eventCount: state.order.length,
            sessionCount: state.bySession.size,
            toolPairCount: state.toolIx.size,
          };

          console.log(`✅ [EventStore] [${dispatchId}] Action processed:`, {
            before: beforeState,
            after: afterState,
            changes: {
              eventsDelta: afterState.eventCount - beforeState.eventCount,
              sessionsDelta: afterState.sessionCount - beforeState.sessionCount,
              toolPairsDelta:
                afterState.toolPairCount - beforeState.toolPairCount,
            },
          });
        });
      },

      // Convenience methods
      addEvent: (event: CanonicalEvent) => {
        const eventId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`📦 [EventStore] [${eventId}] Adding single event:`, {
          id: event.id,
          kind: event.kind,
          role: event.role,
          sessionId: event.sessionId,
          partial: event.partial,
          source: event.source,
        });
        get().dispatch({ type: "UPSERT", event });
        console.log(`✅ [EventStore] [${eventId}] Event added successfully`);
      },

      addEvents: (events: CanonicalEvent[]) => {
        if (events.length === 0) {
          console.log(`⚠️ [EventStore] Skipping empty events batch`);
          return;
        }

        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`📦 [EventStore] [${batchId}] Adding events batch:`, {
          count: events.length,
          eventIds: events.map((e) => e.id),
          sessionIds: [...new Set(events.map((e) => e.sessionId))],
        });

        get().dispatch({ type: "UPSERT_BATCH", events });
        console.log(
          `✅ [EventStore] [${batchId}] Events batch added successfully`
        );
      },

      clearAll: () => {
        console.log(`🧽 [EventStore] Clearing all events from store`);
        const state = get();
        const eventCount = state.order.length;
        const sessionCount = state.bySession.size;

        console.log(`🧽 [EventStore] Before clear:`, {
          eventCount,
          sessionCount,
          toolPairCount: state.toolIx.size,
        });

        get().dispatch({ type: "CLEAR_ALL" });
        console.log(`✅ [EventStore] All events cleared successfully`);
      },

      removeEvent: (eventId: string) => {
        get().dispatch({ type: "REMOVE_EVENT", eventId });
      },

      // Selectors
      getAllEvents: () => {
        const events = eventSelectors.getAllEvents(get());
        console.log(
          `🔍 [EventStore] getAllEvents returning ${events.length} events`
        );
        return events;
      },
      getEventById: (id: string) => {
        const event = eventSelectors.getEventById(get(), id);
        console.log(`🔍 [EventStore] getEventById(${id}) found:`, !!event);
        return event;
      },
      getEventsForSession: (sessionId: string) => {
        const events = eventSelectors.getEventsForSession(get(), sessionId);
        console.log(
          `🔍 [EventStore] getEventsForSession(${sessionId}) returning ${events.length} events`
        );
        return events;
      },
      getSessionIds: () => eventSelectors.getSessionIds(get()),
      getSessionEventCount: (sessionId: string) =>
        eventSelectors.getSessionEventCount(get(), sessionId),
      getToolPair: (toolUseId: string) =>
        eventSelectors.getToolPair(get(), toolUseId),
      getOrphanedToolCalls: () => eventSelectors.getOrphanedToolCalls(get()),
      getEventCount: () => eventSelectors.getEventCount(get()),
      getLastEventId: () => eventSelectors.getLastEventId(get()),

      // Debug helpers
      getDebugInfo: () => {
        const state = get();
        const allEvents = eventSelectors.getAllEvents(state);
        const orphanedCalls = eventSelectors.getOrphanedToolCalls(state);
        const uniqueIds = new Set(state.order);

        return {
          eventCount: allEvents.length,
          toolPairCount: state.toolIx.size,
          orphanedCalls: orphanedCalls.length,
          lastEventId: state.resume.lastEventId,
          hasDuplicateIds: uniqueIds.size !== state.order.length,
        };
      },
    }))
  )
);

/**
 * Hook for feature flag status
 */
export function useCanonicalStoreEnabled(): boolean {
  return isCanonicalStoreEnabled();
}

/**
 * Hook for debug information
 */
export function useEventStoreDebug() {
  return useEventStore((state) => state.getDebugInfo());
}

/**
 * Hook for tool correlation status
 */
export function useToolCorrelation(toolUseId: string) {
  return useEventStore((state) => state.getToolPair(toolUseId));
}

/**
 * Hook for chronological events
 */
export function useChronologicalEvents() {
  return useEventStore((state) => state.getAllEvents());
}

/**
 * Development helpers
 */
if (import.meta.env.DEV && typeof window !== "undefined") {
  // Expose store to window for debugging
  (window as any).eventStore = useEventStore;
  (window as any).useEventStore = useEventStore;
}

/**
 * Agent Status Store - Tracks idle sessions for UI typing indicators
 */
export const useAgentStatusStore = create<{
  idleSessions: Set<string>;
  markIdle: (sessionId: string) => void;
  markActive: (sessionId: string) => void;
  clearIdle: (sessionId: string) => void;
}>((set) => ({
  idleSessions: new Set(),
  markIdle: (sessionId: string) =>
    set((state) => {
      if (state.idleSessions.has(sessionId)) {
        return {}; // No change needed
      }
      const newIdleSessions = new Set(state.idleSessions);
      newIdleSessions.add(sessionId);
      return { idleSessions: newIdleSessions };
    }),
  markActive: (sessionId: string) =>
    set((state) => {
      if (!state.idleSessions.has(sessionId)) {
        return {}; // No change needed
      }
      const newIdleSessions = new Set(state.idleSessions);
      newIdleSessions.delete(sessionId);
      return { idleSessions: newIdleSessions };
    }),
  clearIdle: (sessionId: string) =>
    set((state) => {
      const newIdleSessions = new Set(state.idleSessions);
      newIdleSessions.delete(sessionId);
      return { idleSessions: newIdleSessions };
    }),
}));
