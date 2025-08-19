/**
 * eventReducer.ts - Pure reducer logic for canonical events
 *
 * Handles event normalization, deduplication, and tool correlation
 * in a predictable, testable way using Immer for immutable updates.
 */

import { produce, enableMapSet } from "immer";
import { CanonicalEvent, CheckpointEvent } from "@/types/events";

// Enable MapSet plugin for Immer
enableMapSet();

export interface EventState {
  // Core event storage
  byId: Map<string, CanonicalEvent>;
  order: string[];

  // Session index for O(1) session queries
  bySession: Map<string, string[]>;

  // Tool correlation index
  toolIx: Map<string, { call?: string; result?: string }>;

  // Resume/pagination support
  resume: { lastEventId: string };

  // Store actions (added to state for Zustand compatibility)
  dispatch?: (action: Action) => void;
}

export type Action =
  | { type: "UPSERT"; event: CanonicalEvent }
  | { type: "UPSERT_BATCH"; events: CanonicalEvent[] }
  | { type: "CLEAR_ALL" }
  | { type: "REMOVE_EVENT"; eventId: string };

// Duplicate detection cache (in closure, not persisted)
// We track duplicates by **id+kind** to avoid collisions between
// `message` and `tool_call/tool_result` rows that share the same UUID.
// This prevents legitimate tool events from being dropped when a message
// with the same id has already been processed.
const processedIds = new Set<string>();
const processedContent = new Map<string, string>(); // toolUseId+kind -> content hash

/**
 * Clears the duplicate detection cache (for testing)
 */
export function clearDuplicateCache(): void {
  processedIds.clear();
  processedContent.clear();
}

/**
 * Pure reducer function using Immer for immutable updates
 */
export const eventReducer = produce((draft: EventState, action: Action) => {
  switch (action.type) {
    case "UPSERT": {
      const isDup = isDuplicate(action.event);

      if (!isDup) {
        upsertEvent(draft, action.event);
        markAsProcessed(action.event);
      }
      break;
    }

    case "UPSERT_BATCH": {
      const processedEvents: CanonicalEvent[] = [];
      const duplicateEvents: CanonicalEvent[] = [];

      action.events.forEach((event) => {
        if (!isDuplicate(event)) {
          upsertEvent(draft, event);
          markAsProcessed(event);
          processedEvents.push(event);
        } else {
          duplicateEvents.push(event);
        }
      });
      break;
    }

    case "CLEAR_ALL":
      draft.byId.clear();
      draft.order.length = 0;
      draft.bySession.clear();
      draft.toolIx.clear();
      draft.resume.lastEventId = "";
      // Clear duplicate detection cache
      processedIds.clear();
      processedContent.clear();
      break;

    case "REMOVE_EVENT":
      removeEvent(draft, action.eventId);
      break;

    default:
      // TypeScript exhaustiveness check - using void to acknowledge unused variable
      ((action: never) => void action)(action);
      break;
  }
});

/**
 * Checks if an event is a duplicate
 */
function isDuplicate(event: CanonicalEvent): boolean {
  // Check exact ID duplicate
  const idKey = `${event.id}:${event.kind}`;
  if (processedIds.has(idKey)) {
    return true;
  }

  // Check content duplicate for tool events
  if (
    (event.kind === "tool_call" || event.kind === "tool_result") &&
    "toolUseId" in event &&
    typeof event.toolUseId === "string" &&
    event.toolUseId
  ) {
    const contentKey = `${event.toolUseId}:${event.kind}`;
    // Only hash the relevant content parts, not the entire event
    const contentToHash = {
      toolUseId: event.toolUseId,
      kind: event.kind,
      content: "content" in event ? (event as any).content : undefined, // event.content,
      name: "name" in event ? (event as any).name : undefined, //event.name,

      // Don't include id, createdAt, sessionId etc. in the hash
    };
    const contentHash = JSON.stringify(contentToHash);
    const existingHash = processedContent.get(contentKey);

    if (existingHash === contentHash) {
      return true;
    }
  }

  return false;
}

/**
 * Marks an event as processed for duplicate detection
 */
function markAsProcessed(event: CanonicalEvent): void {
  processedIds.add(`${event.id}:${event.kind}`);

  if (
    //event.toolUseId &&
    //(event.kind === "tool_call" || event.kind === "tool_result")

    (event.kind === "tool_call" || event.kind === "tool_result") &&
    "toolUseId" in event &&
    typeof event.toolUseId === "string" &&
    event.toolUseId
  ) {
    const contentKey = `${event.toolUseId}:${event.kind}`;
    // Only hash the relevant content parts, not the entire event
    const contentToHash = {
      toolUseId: event.toolUseId,
      kind: event.kind,
      content: "content" in event ? (event as any).content : undefined, // event.content,
      name: "name" in event ? (event as any).name : undefined, //event.name,

      // Don't include id, createdAt, sessionId etc. in the hash
    };
    const contentHash = JSON.stringify(contentToHash);
    processedContent.set(contentKey, contentHash);
  }

  // Cleanup old entries periodically (keep last 1000)
  if (processedIds.size > 1000) {
    // NOTE: processedIds now include kind, but cleanup logic remains the same
    const idsArray = Array.from(processedIds);
    const toKeep = idsArray.slice(-500); // Keep last 500
    processedIds.clear();
    toKeep.forEach((id) => processedIds.add(id));
  }

  if (processedContent.size > 500) {
    const entriesArray = Array.from(processedContent.entries());
    const toKeep = entriesArray.slice(-250); // Keep last 250
    processedContent.clear();
    toKeep.forEach(([key, value]) => processedContent.set(key, value));
  }
}

/**
 * Upserts a single event with deduplication and tool correlation
 */
function upsertEvent(state: EventState, event: CanonicalEvent) {
  const existingEvent = state.byId.get(event.id);

  if (!existingEvent) {
    // New event - add to store and maintain order
    state.byId.set(event.id, event);

    // Insert in chronological order
    const insertIndex = findInsertionIndex(state, event);
    state.order.splice(insertIndex, 0, event.id);

    // Maintain session index
    const sessionId = event.sessionId ?? "unknown";

    const sessionEvents = state.bySession.get(sessionId) ?? [];
    if (!sessionEvents.includes(event.id)) {
      const sessionInsertIndex = findInsertionIndexSession(
        sessionEvents,
        event,
        state
      );
      sessionEvents.splice(sessionInsertIndex, 0, event.id);
      state.bySession.set(sessionId, sessionEvents);
    }
  } else {
    // Existing event - update in place (handles streaming updates)
    Object.assign(existingEvent, event);
  }

  // Update tool correlation index
  const toolUseId = hasToolUseId(event);
  if (!toolUseId) return;

  updateToolIndex(state, event);

  // Update resume cursor
  state.resume.lastEventId = event.id;
}

/**
 * Function to determine if an event has a toolUseId
 * @param event The CanonicalEvent to check
 * @returns the toolUseId if it exists, otherwise false
 */
function hasToolUseId(event: CanonicalEvent): string | false {
  if (event.kind === "checkpoint") return false;
  const id =
    (event as any).toolUseId ||
    (event as any).tool_use_id ||
    (event as any).toolCallId ||
    (event as any).tool_call_id;
  return typeof id === "string" && id ? id : false;
}

/**
 * Removes an event and cleans up tool correlations
 */
function removeEvent(state: EventState, eventId: string) {
  const event = state.byId.get(eventId);
  if (!event) return;

  // Remove from main storage
  state.byId.delete(eventId);
  const orderIndex = state.order.indexOf(eventId);
  if (orderIndex >= 0) {
    state.order.splice(orderIndex, 1);
  }

  // Remove from session index
  const sessionId = event.sessionId ?? "unknown";
  const sessionEvents = state.bySession.get(sessionId);
  if (sessionEvents) {
    const sessionIndex = sessionEvents.indexOf(eventId);
    if (sessionIndex >= 0) {
      sessionEvents.splice(sessionIndex, 1);
    }
    // Remove empty session arrays
    if (sessionEvents.length === 0) {
      state.bySession.delete(sessionId);
    }
  }

  const toolUseId = hasToolUseId(event);
  if (!toolUseId) return;

  const toolLink = state.toolIx.get(toolUseId);
  if (toolLink) {
    if (event.kind === "tool_call") delete toolLink.call;
    if (event.kind === "tool_result") delete toolLink.result;

    // Remove empty tool links
    if (!toolLink.call && !toolLink.result) {
      state.toolIx.delete(toolUseId);
    }
  }
}

/**
 * Finds the correct insertion index to maintain chronological order
 */
function findInsertionIndex(
  state: EventState,
  newEvent: CanonicalEvent
): number {
  const newTimestamp = new Date(newEvent.createdAt).getTime();

  // Binary search for insertion point
  let left = 0;
  let right = state.order.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const midEventId = state.order[mid];
    const midEvent = state.byId.get(midEventId);

    if (!midEvent) {
      // Shouldn't happen, but handle gracefully
      left = mid + 1;
      continue;
    }

    const midTimestamp = new Date(midEvent.createdAt).getTime();

    if (midTimestamp <= newTimestamp) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

/**
 * Finds the correct insertion index for session-specific chronological order
 */
function findInsertionIndexSession(
  sessionEvents: string[],
  newEvent: CanonicalEvent,
  state: EventState
): number {
  const newTimestamp = new Date(newEvent.createdAt).getTime();

  // Binary search for insertion point within session
  let left = 0;
  let right = sessionEvents.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const midEventId = sessionEvents[mid];
    const midEvent = state.byId.get(midEventId);

    if (!midEvent) {
      // Shouldn't happen, but handle gracefully
      left = mid + 1;
      continue;
    }

    const midTimestamp = new Date(midEvent.createdAt).getTime();

    if (midTimestamp <= newTimestamp) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

/**
 * Updates the tool correlation index
 */
function updateToolIndex(state: EventState, event: CanonicalEvent) {
  // if event is checkpoint event, skip tool index update

  const toolUseId = hasToolUseId(event);
  if (!toolUseId) return;

  const toolLink = state.toolIx.get(toolUseId) ?? {};

  if (event.kind === "tool_call") {
    toolLink.call = event.id;
  } else if (event.kind === "tool_result") {
    toolLink.result = event.id;
  }

  state.toolIx.set(toolUseId, toolLink);
}

/**
 * Initial state factory
 */
export function createInitialEventState(): EventState {
  return {
    byId: new Map(),
    order: [],
    bySession: new Map(),
    toolIx: new Map(),
    resume: { lastEventId: "" },
  };
}

/**
 * Selectors for common queries
 */
export const eventSelectors = {
  getAllEvents: (state: EventState): CanonicalEvent[] =>
    state.order.map((id) => state.byId.get(id)!).filter(Boolean),

  getEventById: (state: EventState, id: string): CanonicalEvent | undefined =>
    state.byId.get(id),

  // 🔥 NEW SESSION SELECTORS
  getEventsForSession: (
    state: EventState,
    sessionId: string
  ): CanonicalEvent[] => {
    const sessionEventIds = state.bySession.get(sessionId) || [];
    return sessionEventIds.map((id) => state.byId.get(id)!).filter(Boolean);
  },

  getSessionIds: (state: EventState): string[] =>
    Array.from(state.bySession.keys()),

  getSessionEventCount: (state: EventState, sessionId: string): number =>
    state.bySession.get(sessionId)?.length ?? 0,

  getToolPair: (
    state: EventState,
    toolUseId: string
  ): { call?: CanonicalEvent; result?: CanonicalEvent } => {
    const link = state.toolIx.get(toolUseId);
    if (!link) return {};

    const result: { call?: CanonicalEvent; result?: CanonicalEvent } = {};
    if (link.call) {
      const callEvent = state.byId.get(link.call);
      if (callEvent) result.call = callEvent;
    }
    if (link.result) {
      const resultEvent = state.byId.get(link.result);
      if (resultEvent) result.result = resultEvent;
    }
    return result;
  },

  getOrphanedToolCalls: (state: EventState): CanonicalEvent[] => {
    const orphaned: CanonicalEvent[] = [];

    for (const [toolUseId, link] of state.toolIx.entries()) {
      if (link.call && !link.result) {
        const callEvent = state.byId.get(link.call);
        if (callEvent) orphaned.push(callEvent);
      }
    }

    return orphaned;
  },

  getEventCount: (state: EventState): number => state.order.length,

  getLastEventId: (state: EventState): string => state.resume.lastEventId,
};

/**
 * Helper function to create checkpoint events
 */
export function makeCheckpointEvent(
  sessionId: string,
  timestamp: number,
  phase: "start" | "end",
  commitHash: string | null = null,
  stats?: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    fileList: { path: string; linesAdded: number; linesRemoved: number }[];
  }
): CheckpointEvent {
  return {
    id: crypto.randomUUID(),
    kind: "checkpoint",
    createdAt: new Date(timestamp).toISOString(),
    role: "system",
    partial: false,
    source: "sse",
    sessionId,
    data: {
      phase,
      commitHash,
      stats,
    },
  };
}
