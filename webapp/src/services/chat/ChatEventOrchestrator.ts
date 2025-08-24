/**
 * ChatEventOrchestrator - Global service for handling chat events from FirehoseMux
 *
 * This service subscribes once to the user-wide firehose stream and demultiplexes
 * chat events by sessionId, writing them to the canonical event store.
 *
 * Replaces per-component SSE logic in ChatMainCanonicalLegacy with a centralized,
 * navigation-independent event handler.
 */

import type { FirehoseMux, ACSRawEvent } from '../acs/streaming/FirehoseMux';
import type { SSEEvent } from '../acs';
import { toUnifiedEvents } from '@/utils/toUnifiedEvent';
import { useEventStore } from '@/stores/eventStore';
import { useSessionStatusStore } from '@/stores/sessionStatusStore';
import { DedupeCache } from '@/utils/DedupeCache';
import { logDebug } from '@/utils/sseDebug';

interface ChatEventOrchestratorConfig {
    batchSize?: number;
    debugEnabled?: boolean;
    maxBatchDelay?: number;
}

type SessionContext = {
    abortCtrl?: AbortController;
    batchingEnabled: boolean;
    inflight: boolean;
    pendingEvents: any[];
};

export class ChatEventOrchestrator {
    private static sessions: Map<string, SessionContext> = new Map();

    private firehose: FirehoseMux;
    private config: ChatEventOrchestratorConfig;
    private unsubscribe?: () => void;
    private isStarted = false;

    // Batching state (ported from ChatMainCanonicalLegacy)
    private eventBatch: SSEEvent[] = [];
    private batchTimer: NodeJS.Timeout | null = null;
    private lastEventTime = 0;

    // Deduplication cache for raw events
    private dedupe = new DedupeCache<string>(30_000, 4000); // 30-s window, 4k max entries

    constructor(firehose: FirehoseMux, config: ChatEventOrchestratorConfig = {}) {
        this.firehose = firehose;
        this.config = {
            batchSize: 50,
            debugEnabled: false,
            maxBatchDelay: 500,
            ...config
        };

        console.log('💬 [ChatEventOrchestrator] Initialized with config:', this.config);

        // Setup page visibility handler for batch flushing
        if (typeof window !== 'undefined') {
            window.addEventListener('pagehide', this.flushBatch.bind(this));
        }
    }

    /**
     * Start listening to firehose events and processing chat events
     */
    start(): void {
        if (this.isStarted) {
            console.log('💬 [ChatEventOrchestrator] Already started, skipping');
            return;
        }

        console.log('💬 [ChatEventOrchestrator] 🚀 Starting chat event orchestrator');

        // Subscribe to firehose raw events (similar to LocalToolOrchestrator)
        this.unsubscribe = this.firehose.subscribe((rawEvent: ACSRawEvent) => {
            this.handleRawFirehoseEvent(rawEvent);
        });

        this.isStarted = true;
        console.log('💬 [ChatEventOrchestrator] ✅ Now listening for chat events from user-specific SSE stream');
    }

    /**
     * Stop listening to firehose events and cleanup
     */
    stop(): void {
        if (!this.isStarted) {
            console.log('💬 [ChatEventOrchestrator] Not started, skipping stop');
            return;
        }

        console.log('💬 [ChatEventOrchestrator] 🛑 Stopping chat event orchestrator');

        // Flush any remaining events before stopping
        this.flushBatch();

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        this.isStarted = false;
    }

    /**
     * Check if orchestrator is currently running
     */
    isRunning(): boolean {
        return this.isStarted;
    }

    /**
     * Handle raw firehose events and convert them to SSE events for processing
     * This bridges the gap between ACSRawEvent (firehose) and SSEEvent (chat processing)
     */
    private handleRawFirehoseEvent(rawEvent: ACSRawEvent): void {
        // DEBUG: Log all received raw firehose events
        console.log('[ChatEventOrchestrator] RECEIVED raw firehose event', {
            eventType: rawEvent.event_type,
            sessionId: rawEvent.session_id,
            eventId: rawEvent.event_id
        });

        // FIRST-HOP DEDUPLICATION: Early exit if duplicate event_id
        if (this.dedupe.seen(rawEvent.event_id)) {
            if (this.config.debugEnabled) {
                console.log('💬 [ChatEventOrchestrator] ⏭️ Skipping duplicate event:', rawEvent.event_id);
            }
            return;
        }

        if (this.config.debugEnabled) {
            console.log('💬 [ChatEventOrchestrator] 📥 Raw firehose event:', {
                eventType: rawEvent.event_type,
                sessionId: rawEvent.session_id,
                eventId: rawEvent.event_id
            });
        }

        // Convert ACSRawEvent to SSEEvent format for compatibility with existing processing logic
        // This mimics the transformation done in ACSStreamingService
        const sseEvent: SSEEvent = {
            type: rawEvent.event_type,
            sessionId: rawEvent.session_id,
            event_id: rawEvent.event_id,
            messageId: rawEvent.message_id,
            data: rawEvent.data,
            seq: undefined // Not used in current processing
        };

        // Process the converted SSE event
        this.handleSSEEvent(sseEvent);
    }

    /**
     * Handle SSE events with batching (ported from ChatMainCanonicalLegacy)
     */
    private handleSSEEvent(event: SSEEvent): void {
        // DEBUG: Log all SSE events entering processing
        console.log('[ChatEventOrchestrator] PROCESS SSE event', {
            type: event.type,
            sessionId: event.sessionId,
            messageId: event.messageId,
            eventId: event.event_id
        });

        // Log raw incoming event as the very first action
        logDebug('raw_in', { event });

        // Update last event time for adaptive batching
        this.lastEventTime = Date.now();

        // Log to debug overlay (same as ChatMainCanonicalLegacy)
        if ((window as any).__SSE_DEBUG) {
            (window as any).__SSE_DEBUG.addLogEntry({
                type: 'raw_sse',
                data: event,
                sessionId: event.sessionId,
                messageId: event.messageId
            });
        }

        // Add event to batch instead of processing immediately
        this.eventBatch.push(event);

        // Schedule batch processing
        this.scheduleUIUpdate();
    }

    /**
     * Adaptive batching delay (ported from ChatMainCanonicalLegacy)
     */
    private getBatchDelay(): number {
        const now = Date.now();
        const timeSinceLastEvent = now - this.lastEventTime;

        // If events are coming rapidly (< 200ms apart), use shorter batch delay
        if (timeSinceLastEvent < 200) {
            return 150; // Fast batching during active streaming
        }
        // If events are sparse (> 1s apart), use longer delay for efficiency
        if (timeSinceLastEvent > 1000) {
            return 500; // Slower batching during idle periods
        }
        // Default batching for normal activity
        return 300;
    }

    /**
     * Schedule UI update with adaptive batching (ported from ChatMainCanonicalLegacy)
     */
    private scheduleUIUpdate(): void {
        if (this.batchTimer) clearTimeout(this.batchTimer);

        const delay = this.getBatchDelay();
        this.batchTimer = setTimeout(() => {
            this.processBatch();
            this.batchTimer = null;
        }, delay);
    }

    /**
     * Process batch of events (ported from ChatMainCanonicalLegacy)
     */
    private processBatch(): void {
        if (this.eventBatch.length === 0) return;

        const batchStartTime = performance.now();

        // Process all events in the batch
        const eventsToProcess = [...this.eventBatch];
        this.eventBatch = []; // Clear the batch

        if (this.config.debugEnabled) {
            console.log('💬 [ChatEventOrchestrator] 🔄 Processing batch:', {
                eventCount: eventsToProcess.length,
                batchTime: performance.now() - batchStartTime
            });
        }

        // Group events by type for more efficient processing
        const eventsByType = eventsToProcess.reduce((acc, event) => {
            const type = event.type || 'unknown';
            if (!acc[type]) acc[type] = [];
            acc[type].push(event);
            return acc;
        }, {} as Record<string, SSEEvent[]>);

        // Process each event type in batch
        Object.entries(eventsByType).forEach(([type, events]) => {
            events.forEach(event => this.processSSEEvent(event));
        });
    }

    /**
     * Process individual SSE event (ported from ChatMainCanonicalLegacy)
     */
    private processSSEEvent(event: SSEEvent): void {
        // Safety check: only process events that have a sessionId
        if (!event.sessionId) {
            logDebug('skip_no_session', { event });
            if (this.config.debugEnabled) {
                console.log('💬 [ChatEventOrchestrator] ⚠️ Skipping event without sessionId:', event);
            }
            return;
        }

        const sessionId = event.sessionId;

        // Log to debug overlay
        if ((window as any).__SSE_DEBUG) {
            (window as any).__SSE_DEBUG.addLogEntry({
                type: 'filter',
                data: 'Event processed by orchestrator',
                sessionId: event.sessionId
            });
        }

        // Get session status helpers once
        const { markIdle, markAwaiting } = useSessionStatusStore.getState();

        // Helper to update session status
        const touchStatus = (idle: boolean) => (idle ? markIdle(sessionId) : markAwaiting(sessionId));

        // A) Handle explicit agent_status events (raw event)
        if (event.type === 'agent_status') {
            if (event.data?.status === 'session_idle') {
                touchStatus(true); // mark idle
            } else if (event.data?.status === 'session_active') {
                // Session is now active - checkpoint handled by FirehoseMux
            }
            return; // no further processing needed for raw agent_status events
        }

        try {
            // Convert SSE event to unified timeline events
            const unifiedEvents = toUnifiedEvents(event);

            // Log successful unification
            logDebug('unified_ok', { unified: unifiedEvents, originalEvent: event });

            // Log unified events to debug overlay
            if ((window as any).__SSE_DEBUG) {
                unifiedEvents.forEach(unifiedEvent => {
                    (window as any).__SSE_DEBUG.addLogEntry({
                        type: 'unified',
                        data: unifiedEvent,
                        sessionId: event.sessionId,
                        messageId: unifiedEvent.messageId || event.messageId
                    });
                });
            }

            unifiedEvents.forEach(unifiedEvent => {
                // Handle completion signals to clear streaming state
                if (unifiedEvent.type === 'completion_signal') {
                    // C) Mark session as idle on completion signal
                    touchStatus(true);
                    // End of conversation checkpoint handled by FirehoseMux

                    // Force clear all streaming states in the store
                    const state = useEventStore.getState();
                    const sessionEvents = state.bySession.get(sessionId) || [];

                    sessionEvents.forEach(eventId => {
                        const event = state.byId.get(eventId);
                        if (event && event.kind === 'message' && event.partial) {
                            // Clear streaming state for completed event
                            const updatedEvent = {
                                ...event,
                                partial: false,
                                updatedAt: new Date().toISOString()
                            };

                            // DEBUG: Log before adding event to store
                            console.log('[ChatEventOrchestrator] ADDING event (completion_cleanup)', {
                                id: updatedEvent.id,
                                sessionId,
                                partial: updatedEvent.partial
                            });

                            useEventStore.getState().addEvent(updatedEvent);
                        }
                    });

                    return;
                }

                // Map unified event to canonical event format
                if (unifiedEvent.type === 'chunk') {
                    // B) Mark session as active when receiving chunks
                    touchStatus(false);

                    // Handle streaming text chunks
                    const chunkData = unifiedEvent as any;

                    // Use messageId as the event ID so chunks get merged into the same event
                    const eventId = chunkData.messageId || unifiedEvent.id;

                    // Get existing event to merge with
                    const existingEvent = useEventStore.getState().getEventById(eventId);

                    if (existingEvent && existingEvent.kind === 'message') {
                        // Merge chunk into existing message
                        const existingText = existingEvent.content?.[0]?.type === 'text' ? existingEvent.content[0].text : '';

                        const newText = existingText + (chunkData.delta || '');

                        const updatedEvent = {
                            ...existingEvent,
                            content: [{ type: 'text', text: newText }],
                            partial: chunkData.isStreaming !== false, // Update streaming status
                            updatedAt: new Date().toISOString()
                        };

                        // DEBUG: Log before adding event to store
                        console.log('[ChatEventOrchestrator] ADDING event (merge_chunk)', {
                            id: eventId,
                            sessionId,
                            messageId: chunkData.messageId,
                            textLength: newText.length,
                            partial: updatedEvent.partial
                        });

                        useEventStore.getState().addEvent(updatedEvent);

                        // Log successful store addition
                        logDebug('store_add', {
                            canonicalEvent: updatedEvent,
                            action: 'merge_chunk',
                            eventId,
                            newTextLength: newText.length,
                            sessionId: event.sessionId,
                            messageId: chunkData.messageId
                        });

                        // Log to debug overlay
                        if ((window as any).__SSE_DEBUG) {
                            (window as any).__SSE_DEBUG.addLogEntry({
                                type: 'store_add',
                                data: {
                                    action: 'merge_chunk',
                                    eventId,
                                    newTextLength: newText.length
                                },
                                sessionId: event.sessionId,
                                messageId: chunkData.messageId
                            });
                        }
                    } else {
                        // Create new message event for first chunk
                        const newEvent = {
                            id: eventId,
                            kind: 'message',
                            role: chunkData.role || 'assistant',
                            content: [{ type: 'text', text: chunkData.delta || '' }],
                            createdAt: new Date(chunkData.createdAt || Date.now()).toISOString(),
                            sessionId: sessionId,
                            partial: chunkData.isStreaming !== false,
                            source: 'sse' as const,
                            messageId: chunkData.messageId
                        };

                        // DEBUG: Log before adding event to store
                        console.log('[ChatEventOrchestrator] ADDING event (create_chunk)', {
                            id: eventId,
                            sessionId,
                            messageId: chunkData.messageId,
                            deltaLength: (chunkData.delta || '').length,
                            partial: newEvent.partial
                        });

                        useEventStore.getState().addEvent(newEvent);

                        // Log successful store addition
                        logDebug('store_add', {
                            canonicalEvent: newEvent,
                            action: 'create_chunk',
                            eventId,
                            deltaLength: (chunkData.delta || '').length,
                            sessionId: event.sessionId,
                            messageId: chunkData.messageId
                        });

                        // Log to debug overlay
                        if ((window as any).__SSE_DEBUG) {
                            (window as any).__SSE_DEBUG.addLogEntry({
                                type: 'store_add',
                                data: {
                                    action: 'create_chunk',
                                    eventId,
                                    deltaLength: (chunkData.delta || '').length
                                },
                                sessionId: event.sessionId,
                                messageId: chunkData.messageId
                            });
                        }
                    }
                } else if (unifiedEvent.type === 'message' || unifiedEvent.type === 'text') {
                    let role, content, partial, createdAt;

                    if (unifiedEvent.type === 'text') {
                        // Handle flat TextTimelineEvent from promoted chunks
                        const textEvent = unifiedEvent as any;
                        role = textEvent.role || 'assistant';
                        content = [{ type: 'text', text: textEvent.text || '' }];
                        partial = textEvent.isStreaming || false;
                        createdAt = new Date(textEvent.createdAt || unifiedEvent.timestamp || Date.now()).toISOString();
                    } else {
                        // Handle older message formats that use a 'data' property
                        const messageData = unifiedEvent.data as any;
                        role = messageData?.role || 'assistant';
                        content = messageData?.content || [{ type: 'text', text: messageData?.text || '' }];
                        partial = messageData?.isStreaming || false;
                        createdAt = new Date(unifiedEvent.timestamp || Date.now()).toISOString();
                    }

                    const messageEvent = {
                        id: unifiedEvent.id,
                        kind: 'message',
                        role: role,
                        content: content,
                        createdAt: createdAt,
                        sessionId: sessionId,
                        partial: partial,
                        source: 'sse' as const
                    };
                    // DEBUG: Log before adding event to store
                    console.log('[ChatEventOrchestrator] ADDING event (message)', {
                        id: messageEvent.id,
                        sessionId,
                        role: messageEvent.role,
                        partial: messageEvent.partial
                    });

                    useEventStore.getState().addEvent(messageEvent);

                    // Log successful store addition
                    logDebug('store_add', {
                        canonicalEvent: messageEvent,
                        action: unifiedEvent.type === 'text' ? 'promoted_text' : 'message',
                        sessionId: event.sessionId,
                        messageId: event.messageId
                    });
                } else if (unifiedEvent.type === 'tool_call') {
                    const toolCallData = unifiedEvent as any;
                    const toolEvent = {
                        id: unifiedEvent.id,
                        kind: 'tool_call',
                        role: 'assistant',
                        name: toolCallData.toolCall?.name,
                        args: toolCallData.toolCall?.args || {},
                        toolUseId: toolCallData.toolCall?.id,
                        createdAt: new Date(unifiedEvent.createdAt).toISOString(),
                        sessionId: sessionId,
                        partial: false,
                        source: 'sse' as const
                    };

                    // DEBUG: Log before adding event to store
                    console.log('[ChatEventOrchestrator] ADDING event (tool_call)', {
                        id: toolEvent.id,
                        sessionId,
                        toolUseId: toolEvent.toolUseId,
                        name: toolEvent.name
                    });

                    useEventStore.getState().addEvent(toolEvent);

                    // Log successful store addition
                    logDebug('store_add', {
                        canonicalEvent: toolEvent,
                        action: 'tool_call',
                        toolName: toolCallData.toolCall?.name,
                        sessionId: event.sessionId,
                        messageId: event.messageId
                    });

                    // Log to debug overlay
                    if ((window as any).__SSE_DEBUG) {
                        (window as any).__SSE_DEBUG.addLogEntry({
                            type: 'store_add',
                            data: {
                                action: 'tool_call',
                                toolName: toolCallData.toolCall?.name
                            },
                            sessionId: event.sessionId,
                            messageId: event.messageId
                        });
                    }
                } else if (unifiedEvent.type === 'tool_result') {
                    const toolResultData = unifiedEvent as any;
                    const resultEvent = {
                        id: unifiedEvent.id,
                        kind: 'tool_result',
                        role: 'assistant',
                        toolUseId: toolResultData.toolResult?.toolCallId,
                        result: toolResultData.toolResult?.result,
                        createdAt: new Date(unifiedEvent.createdAt).toISOString(),
                        sessionId: sessionId,
                        partial: false,
                        source: 'sse' as const
                    };

                    // DEBUG: Log before adding event to store
                    console.log('[ChatEventOrchestrator] ADDING event (tool_result)', {
                        id: resultEvent.id,
                        sessionId,
                        toolCallId: resultEvent.toolUseId,
                        success: (unifiedEvent as any)?.toolResult?.success
                    });

                    useEventStore.getState().addEvent(resultEvent);

                    // Log successful store addition
                    logDebug('store_add', {
                        canonicalEvent: resultEvent,
                        action: 'tool_result',
                        toolCallId: toolResultData.toolResult?.toolCallId,
                        success: toolResultData.toolResult?.success,
                        result: toolResultData.toolResult?.result,
                        error: toolResultData.toolResult?.error,
                        sessionId: event.sessionId,
                        messageId: event.messageId
                    });

                    // Log to debug overlay
                    if ((window as any).__SSE_DEBUG) {
                        (window as any).__SSE_DEBUG.addLogEntry({
                            type: 'store_add',
                            data: {
                                action: 'tool_result',
                                toolCallId: toolResultData.toolResult?.toolCallId,
                                success: toolResultData.toolResult?.success,
                                result: toolResultData.toolResult?.result,
                                error: toolResultData.toolResult?.error
                            },
                            sessionId: event.sessionId,
                            messageId: event.messageId
                        });
                    }
                }
            });
        } catch (error) {
            // Error handling for failed event processing
            console.error('💬 [ChatEventOrchestrator] ❌ Failed to process SSE event:', error);

            // Log error to debug overlay
            if ((window as any).__SSE_DEBUG) {
                (window as any).__SSE_DEBUG.addLogEntry({
                    type: 'error',
                    data: `Failed to process SSE event: ${error.message}`,
                    sessionId: event.sessionId,
                    messageId: event.messageId
                });
            }
        }
    }

    /**
     * Flush any remaining events in the batch
     */
    private flushBatch(): void {
        if (this.eventBatch.length > 0) {
            console.log('💬 [ChatEventOrchestrator] 🚿 Flushing remaining batch events:', this.eventBatch.length);
            this.processBatch();
        }
    }

    // Call this when starting a stream for a session
    static attachAbort(sessionId: string, ctrl: AbortController) {
        const ctx = this.sessions.get(sessionId) ?? {
            batchingEnabled: true,
            inflight: false,
            pendingEvents: []
        };
        ctx.abortCtrl = ctrl;
        ctx.inflight = true;
        this.sessions.set(sessionId, ctx);
    }

    // Optional: mark inflight status when stream finishes
    static markComplete(sessionId: string) {
        const ctx = this.sessions.get(sessionId);
        if (!ctx) return;
        ctx.inflight = false;
        ctx.abortCtrl = undefined;
    }
}

export default ChatEventOrchestrator;
