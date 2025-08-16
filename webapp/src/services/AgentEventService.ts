import { safeTauriListen } from '@/utils/tauriApi';
import { isTauri } from '@/utils/environment';

// Type for unlisten function
type UnlistenFn = () => void;

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface RawAgentEventPayload {
    type: string;
    sessionId: string;
    messageId?: string;
    seq?: number; // Sequence number for streaming events and tool calls/results
    event_id?: string; // Unique event ID from Python to prevent duplicate processing

    // Optional – only present for particular event `type`s
    delta?: string;
    toolCall?: { id: string; name: string; arguments: any };
    result?: any;
    history?: any[];
    error?: string;
}

export type EventHandler = (payload: RawAgentEventPayload) => void;

// ------------------------------------------------------------
// HMR-SAFE GLOBAL STATE STORAGE
// ------------------------------------------------------------

// Vite/React in dev mode hot-reloads individual modules which would normally
// re-evaluate this file and re-create the variables (-> duplicate listeners).
// To avoid that we stash *all* mutable module state on a single object hanging
// off `globalThis`. On the first evaluation we create the object, later HMR
// reloads simply retrieve the existing one so they share the same listener &
// subscriber registries.

interface OrchestraAgentGlobals {
    unlisten?: UnlistenFn | null;
    isListenerActive?: boolean;

    // key  -> callback
    wildcardSubscribers?: Map<string, EventHandler>;

    // sessionId -> Set<callback>
    sessionGlobalSubscribers?: Map<string, Set<EventHandler>>;

    // sessionId -> eventType -> Set<callback>
    sessionTypeSubscribers?: Map<string, Map<string, Set<EventHandler>>>;
}

const GLOBAL_KEY = '__ORCHESTRA_AGENT_EVENT_SERVICE__';

const g: OrchestraAgentGlobals = ((globalThis as any)[GLOBAL_KEY] ??= {
    wildcardSubscribers: new Map(),
    sessionGlobalSubscribers: new Map(),
    sessionTypeSubscribers: new Map()
});

// ------------------------------------------------------------
// INTERNAL HELPERS
// ------------------------------------------------------------

function safeInvoke(cb: EventHandler, payload: RawAgentEventPayload) {
    try {
        cb(payload);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AgentEventService] subscriber threw error for event type:', payload.type, 'Error:', err);
        console.error('[AgentEventService] Failed payload:', payload);
    }
}

function dispatch(payload: RawAgentEventPayload) {
    // Debug logging to verify event processing
    // console.debug('[AgentEventService] payload', payload.type, payload.seq);

    // CRITICAL: Log all events to understand flow
    // console.log(`[AgentEventService] DISPATCH_ENTRY: type=${payload.type}, sessionId=${payload.sessionId}, messageId=${payload.messageId}`);

    // Additional logging for tool_result debugging
    if (payload.type === 'tool_result') {
        console.log('[AgentEventService] TOOL_RESULT_DISPATCH: Dispatching tool_result event:', {
            type: payload.type,
            sessionId: payload.sessionId,
            messageId: payload.messageId,
            wildcardSubscribers: g.wildcardSubscribers!.size,
            hasResult: !!payload.result,
            resultKeys: payload.result ? Object.keys(payload.result) : []
        });
    }

    // 1. Wildcard subscribers
    let invokedCount = 0;
    for (const [key, cb] of g.wildcardSubscribers!) {
        if (payload.type === 'tool_result') {
            console.log(`[AgentEventService] TOOL_RESULT_DISPATCH: Invoking wildcard subscriber ${key}`);
        }
        safeInvoke(cb, payload);
        invokedCount++;
    }

    if (payload.type === 'tool_result') {
        console.log(`[AgentEventService] TOOL_RESULT_DISPATCH: Invoked ${invokedCount} wildcard subscribers`);
    }

    // 2. Session-wide subscribers
    const sessionSet = g.sessionGlobalSubscribers!.get(payload.sessionId);
    if (sessionSet) {
        for (const cb of sessionSet) safeInvoke(cb, payload);
    }

    // 3. Session+eventType subscribers
    const typeMap = g.sessionTypeSubscribers!.get(payload.sessionId);
    const typeSet = typeMap?.get(payload.type);
    if (typeSet) {
        for (const cb of typeSet) safeInvoke(cb, payload);
    }
}

// ------------------------------------------------------------
// PUBLIC API – LISTENER LIFECYCLE
// ------------------------------------------------------------

export async function startAgentEventListener(): Promise<UnlistenFn | null> {
    if (g.isListenerActive && g.unlisten) {
        return g.unlisten;
    }

    if (!isTauri()) {
        console.log('[AgentEventService] Skipping Tauri event listener in web mode');
        // Return a no-op function for web mode
        const noOpUnlisten = () => {};
        g.unlisten = noOpUnlisten;
        g.isListenerActive = true;
        return noOpUnlisten;
    }

    try {
        console.log('[AgentEventService] Installing global Tauri `agent_event` listener');

        const unlisten = await safeTauriListen('agent_event', (event: any) => {
            dispatch(event.payload);
        });

        g.unlisten = unlisten;
        g.isListenerActive = true;
        return unlisten;
    } catch (err) {
        console.error('[AgentEventService] Failed to start listener', err);
        g.unlisten = undefined;
        g.isListenerActive = false;
        return null;
    }
}

export function stopAgentEventListener(): void {
    if (g.unlisten) {
        g.unlisten();
        g.unlisten = undefined;
        g.isListenerActive = false;
    }
}

// ------------------------------------------------------------
// PUBLIC API – SUBSCRIPTION HELPERS
// ------------------------------------------------------------

// Helpers: callers may pass an explicit `key` that stays stable across HMR to
// prevent duplicate registrations. If omitted we generate a random one so the
// *caller* receives a new subscription each time.

function normaliseKey(scope: string, explicit?: string): string {
    return explicit ?? `${scope}::${crypto.randomUUID()}`;
}

/** Subscribe to *all* events (every session, every type). */
export function subscribeToAllEvents(callback: EventHandler, key?: string): () => void {
    const k = normaliseKey('wildcard', key);
    g.wildcardSubscribers!.set(k, callback);

    if (!g.isListenerActive) startAgentEventListener();

    return () => {
        g.wildcardSubscribers!.delete(k);
    };
}

/** Subscribe to all events for a specific session. */
export function subscribeToSession(sessionId: string, callback: EventHandler): () => void {
    if (!g.sessionGlobalSubscribers!.has(sessionId)) {
        g.sessionGlobalSubscribers!.set(sessionId, new Set());
    }
    const set = g.sessionGlobalSubscribers!.get(sessionId)!;
    set.add(callback);

    if (!g.isListenerActive) startAgentEventListener();

    return () => {
        set.delete(callback);
        if (set.size === 0) g.sessionGlobalSubscribers!.delete(sessionId);
    };
}

/** Subscribe to a specific `eventType` for a specific `sessionId`. */
export function subscribeToSessionEventType(sessionId: string, eventType: string, callback: EventHandler): () => void {
    if (!g.sessionTypeSubscribers!.has(sessionId)) {
        g.sessionTypeSubscribers!.set(sessionId, new Map());
    }

    const typeMap = g.sessionTypeSubscribers!.get(sessionId)!;
    if (!typeMap.has(eventType)) typeMap.set(eventType, new Set());

    const set = typeMap.get(eventType)!;
    set.add(callback);

    if (!g.isListenerActive) startAgentEventListener();

    return () => {
        set.delete(callback);
        if (set.size === 0) {
            typeMap.delete(eventType);
            if (typeMap.size === 0) g.sessionTypeSubscribers!.delete(sessionId);
        }
    };
}
