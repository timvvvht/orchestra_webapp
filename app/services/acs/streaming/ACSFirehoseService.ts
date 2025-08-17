/* eslint-env browser */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mitt from 'mitt';
// Real fetch-event-source implementation
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { eventBus } from '../eventBus';
import type { SSEEvent } from '../shared/types';
import { DedupeCache } from '@/utils/DedupeCache';

// Extend window interface for SSE debug history
declare global {
    interface Window {
        __SSE_HISTORY?: Array<{
            timestamp: number;
            kind: string;
            event?: any;
            unified?: any;
            canonicalEvent?: any;
            eventId?: string;
            sessionId?: string;
            reason?: string;
            error?: string;
            rawData?: string;
            [key: string]: any;
        }>;
    }
}

export interface ACSRawEvent {
    session_id: string;
    event_type: string;
    timestamp: number;
    data: any;
    message_id?: string | null;
    event_id: string;
}

type Events = {
    data: ACSRawEvent;
    error: Error;
    status: boolean;
};

export class ACSFirehoseService {
    private es: EventSource | null = null;
    private abortCtrl?: AbortController;
    private reconnectAttempts = 0;
    private readonly bus = mitt<Events>();
    private currentAuthToken: string | null = null;
    private currentUserId: string | null = null;
    private connectionType: 'global' | 'user' = 'global';
    private log(prefix: string, ...args: unknown[]) {
        console.log(`%c${prefix}`, 'color:#0af', ...args);
    }
    private dedupe = new DedupeCache<string>(30_000, 4000); // 30-s window, 4k max entries (now using full JSON hash)

    constructor(private readonly baseUrl: string) {}

    /**
     * Validate baseUrl + path and construct the final URL.
     * Throws loud errors if any part is invalid so bugs surface early.
     */
    private buildUrl(path: string): string {
        if (!this.baseUrl || typeof this.baseUrl !== 'string') {
            throw new Error(`[Firehose] Invalid baseUrl: ${String(this.baseUrl)}`);
        }
        if (!path) {
            throw new Error('[Firehose] buildUrl() requires a non-empty path');
        }

        const sanitized = this.baseUrl.replace(/\/$/, ''); // strip trailing "/"
        const finalUrl = `${sanitized}${path.startsWith('/') ? '' : '/'}${path}`;

        // let URL constructor validate
        try {
            new URL(finalUrl);
        } catch {
            throw new Error(`[Firehose] Generated invalid URL: ${finalUrl}`);
        }

        return finalUrl;
    }

    /** Convert ACSRawEvent to SSEEvent format for global eventBus */
    private convertToSSEEvent(rawEvent: ACSRawEvent): SSEEvent {
        // Create a base event object without optional properties
        const baseEvent: SSEEvent = {
            type: rawEvent.event_type,
            sessionId: rawEvent.session_id
        };

        // Add optional properties only if they have defined values
        if (rawEvent.event_id) {
            baseEvent.event_id = rawEvent.event_id;
        }

        if (rawEvent.message_id) {
            baseEvent.messageId = rawEvent.message_id;
        }

        if (rawEvent.data) {
            baseEvent.data = rawEvent.data;
        }

        // Extract specific fields based on event type
        if (rawEvent.event_type === 'chunk' && (rawEvent.data?.delta || rawEvent.data?.content)) {
            baseEvent.delta = rawEvent.data.delta || rawEvent.data.content;
        }

        if (rawEvent.event_type === 'tool_call' && rawEvent.data?.tool_call) {
            baseEvent.toolCall = rawEvent.data.tool_call;
        }

        if (rawEvent.event_type === 'tool_result' && rawEvent.data?.result) {
            baseEvent.result = rawEvent.data.result;
        }

        if (rawEvent.event_type === 'error' && rawEvent.data?.error) {
            baseEvent.error = rawEvent.data.error;
        }

        // Return the completed event
        return baseEvent;
    }

    /** Log debug entry to global SSE history */
    private logDebugEntry(kind: string, data: any = {}) {
        if (!window.__SSE_HISTORY) {
            window.__SSE_HISTORY = [];
        }

        const entry = {
            timestamp: Date.now(),
            kind,
            ...data
        };

        window.__SSE_HISTORY.push(entry);

        // Keep only last 1000 entries to prevent memory bloat
        if (window.__SSE_HISTORY.length > 1000) {
            window.__SSE_HISTORY = window.__SSE_HISTORY.slice(-1000);
        }
    }

    /** Create a simple hash of a string for deduplication */
    private hashString(str: string): string {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /** Emit event to both internal bus and global eventBus */
    private emitEvent(rawEvent: ACSRawEvent): void {
        // Log raw incoming event FIRST (before any filtering)
        this.logDebugEntry('raw_in', {
            event: rawEvent,
            eventId: rawEvent.event_id,
            sessionId: rawEvent.session_id
        });

        // FIRST-HOP DEDUPLICATION: Early exit if duplicate full JSON content
        const eventJsonString = JSON.stringify(rawEvent);
        const eventHash = this.hashString(eventJsonString);
        
        if (this.dedupe.seen(eventHash)) {
            // Log the dedupe drop with full event data
            this.logDebugEntry('skip_dedupe', {
                event: rawEvent,
                eventId: rawEvent.event_id,
                sessionId: rawEvent.session_id,
                eventHash: eventHash,
                reason: `Duplicate full event content (hash: ${eventHash})`,
                rawData: eventJsonString
            });
            return;
        }

        /* ────────────────────────────────
         *  1️⃣  SCM CHECKPOINT HOOK
         * ──────────────────────────────── */
        // NOTE: SCM checkpoints are now handled by CheckpointService.ts
        // which listens to SSE events via eventBus and properly retrieves
        // session working directories from Supabase. The old Tauri-based
        // checkpoint system has been removed to avoid conflicts.

        /* ────────────────────────────────
         *  2️⃣  EXISTING BUS EMISSION LOGIC
         * ──────────────────────────────── */
        // Emit to internal bus (for LocalToolOrchestrator and other subscribers)
        this.bus.emit('data', rawEvent);

        // Convert and emit to global eventBus
        const sseEvent = this.convertToSSEEvent(rawEvent);
        eventBus.emit('sse', sseEvent);

        // Log successful processing
        this.logDebugEntry('unified_ok', {
            event: rawEvent,
            unified: sseEvent,
            eventId: rawEvent.event_id,
            sessionId: rawEvent.session_id
        });
    }

    /** open EventSource for session-specific events (no auth) */
    connect(sessionId: string) {
        if (this.es) return; // already connected
        this.connectionType = 'global';
        const url = this.buildUrl(`/sse/${encodeURIComponent(sessionId)}`);
        this.log('🔗 [SSE] startStream URL:', url);

        this.log('🔌 [SSE] connect(session) called with sessionId:', sessionId);
        this.es = new EventSource(url);

        this.es.onopen = () => {
            this.reconnectAttempts = 0; // reset back-off
            this.log('🟢 [SSE] onopen (session) URL:', url);
            this.bus.emit('status', true);
        };
                this.es.onmessage = ev => {
            // Log the raw JSON data FIRST, before any processing
            this.logDebugEntry('raw_json', {
                rawData: ev.data,
                source: 'EventSource (session)',
                timestamp: Date.now()
            });

            try {
                const rawMessage = JSON.parse(ev.data);
                console.log(`[SSE_RAW] ${JSON.stringify(rawMessage)}`);

                // Transform the SSE event structure to ACSRawEvent format
                let parsed: ACSRawEvent;
                if (rawMessage.payload) {
                    // New schema with payload wrapper
                    parsed = {
                        session_id: rawMessage.payload.session_id,
                        event_type: rawMessage.payload.event_type,
                        timestamp: rawMessage.payload.timestamp,
                        data: rawMessage.payload.data,
                        message_id: rawMessage.payload.message_id,
                        event_id: rawMessage.payload.event_id
                    };
                } else {
                    // Legacy schema (direct format)
                    parsed = rawMessage as ACSRawEvent;
                }

                this.emitEvent(parsed);
            } catch (error) {
                // Log parse failures to debug history
                this.logDebugEntry('skip_parse_error', {
                    rawData: ev.data,
                    error: error instanceof Error ? error.message : 'Parse error',
                    reason: 'Failed to parse JSON from SSE message'
                });
            }
        };

        this.es.onerror = (err: any) => {
            this.bus.emit('error', err instanceof Error ? err : new Error('SSE error'));
            this.bus.emit('status', false);
            this.scheduleReconnect();
        };
    }

    /** Connect to user-specific SSE endpoint with JWT authentication */
    connectPrivate(userId: string, jwt: string) {
        if (this.abortCtrl && this.currentUserId === userId) return; // already connected to this user

        // Close existing connection if any
        this.disconnect();

        this.currentAuthToken = jwt;
        this.currentUserId = userId;
        this.connectionType = 'user';

        const url = this.buildUrl(`/sse/user/${encodeURIComponent(userId)}`);

        // Check if we're connecting to localhost (our tested implementation)
        const isLocalhost = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');

        if (isLocalhost) {
            // Use native EventSource for localhost (matches our tested implementation)
            this.es = new EventSource(url);

            this.es.onopen = () => {
                this.reconnectAttempts = 0;
                this.bus.emit('status', true);
            };

            this.es.onmessage = ev => {
                // Log the raw JSON data FIRST, before any processing
                this.logDebugEntry('raw_json', {
                    rawData: ev.data,
                    source: 'EventSource (private)',
                    timestamp: Date.now()
                });

                try {
                    const rawMessage = JSON.parse(ev.data);

                    // Transform the SSE event structure to ACSRawEvent format
                    let parsed: ACSRawEvent;
                    if (rawMessage.payload) {
                        // New schema with payload wrapper
                        parsed = {
                            session_id: rawMessage.payload.session_id,
                            event_type: rawMessage.payload.event_type,
                            timestamp: rawMessage.payload.timestamp,
                            data: rawMessage.payload.data,
                            message_id: rawMessage.payload.message_id,
                            event_id: rawMessage.payload.event_id
                        };
                    } else {
                        // Legacy schema (direct format)
                        parsed = rawMessage as ACSRawEvent;
                    }

                    this.emitEvent(parsed);
                } catch (error) {
                    // Log parse failures to debug history
                    this.logDebugEntry('skip_parse_error', {
                        rawData: ev.data,
                        error: error instanceof Error ? error.message : 'Parse error',
                        reason: 'Failed to parse JSON from SSE message (private connection)'
                    });
                }
            };

            this.es.onerror = (err: any) => {
                this.bus.emit('error', err instanceof Error ? err : new Error('SSE error'));
                this.bus.emit('status', false);
                this.scheduleReconnect();
            };
        } else {
            // Use fetchEventSource with JWT for production
            this.abortCtrl = new AbortController();
            fetchEventSource(url, {
                headers: { Authorization: `Bearer ${jwt}` },
                signal: this.abortCtrl.signal,
                onopen: async () => {
                    this.reconnectAttempts = 0;
                    this.bus.emit('status', true);
                    return Promise.resolve();
                },
                onmessage: ev => {
                    // Log the raw JSON data FIRST, before any processing
                    this.logDebugEntry('raw_json', {
                        rawData: ev.data,
                        source: 'fetchEventSource',
                        timestamp: Date.now()
                    });

                    try {
                        const rawMessage = JSON.parse(ev.data);

                        // Transform the SSE event structure to ACSRawEvent format
                        let parsed: ACSRawEvent;
                        if (rawMessage.payload) {
                            // New schema with payload wrapper
                            parsed = {
                                session_id: rawMessage.payload.session_id,
                                event_type: rawMessage.payload.event_type,
                                timestamp: rawMessage.payload.timestamp,
                                data: rawMessage.payload.data,
                                message_id: rawMessage.payload.message_id,
                                event_id: rawMessage.payload.event_id
                            };
                        } else {
                            // Legacy schema (direct format)
                            parsed = rawMessage as ACSRawEvent;
                        }

                        this.emitEvent(parsed);
                    } catch (error) {
                        // Log parse failures to debug history
                        this.logDebugEntry('skip_parse_error', {
                            rawData: ev.data,
                            error: error instanceof Error ? error.message : 'Parse error',
                            reason: 'Failed to parse JSON from SSE message (fetchEventSource)'
                        });
                    }
                },
                onerror: err => {
                    this.bus.emit('error', err instanceof Error ? err : new Error('SSE error'));
                    this.bus.emit('status', false);
                    this.scheduleReconnect();
                }
            });
        }
    }

    subscribe(handler: (e: ACSRawEvent) => void) {
        this.bus.on('data', handler);
        return () => this.bus.off('data', handler);
    }

    /**
     * Subscribe to connection status changes
     * @param handler Function to handle status changes (true = connected, false = disconnected)
     * @returns Unsubscribe function
     */
    onStatusChange(handler: (connected: boolean) => void): () => void {
        this.bus.on('status', handler);
        return () => this.bus.off('status', handler);
    }

    private scheduleReconnect() {
        this.abortCtrl?.abort();
        this.abortCtrl = undefined;
        this.es?.close();
        this.es = null;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts++, 30000);
        setTimeout(() => {
            if (this.connectionType === 'user' && this.currentUserId && this.currentAuthToken) {
                this.connectPrivate(this.currentUserId, this.currentAuthToken);
            }
            // Note: Session connections will be re-established by the component that needs them
        }, delay);
    }

    /** Close the underlying EventSource and reset state */
    close() {
        this.disconnect();
    }

    /** Disconnect user connection only */
    disconnectUser() {
        this.abortCtrl?.abort();
        this.abortCtrl = undefined;
    }

    /** Disconnect and clean up all connections */
    disconnect() {
        if (this.abortCtrl || this.es) {
            this.abortCtrl?.abort();
            this.abortCtrl = undefined;
            this.es?.close();
            this.es = null;
            this.reconnectAttempts = 0;
            this.currentAuthToken = null;
            this.currentUserId = null;
            this.connectionType = 'global';
            this.bus.emit('status', false);
        }
    }

    /** true if EventSource is open */
    isConnected(): boolean {
        return this.es?.readyState === EventSource.OPEN;
    }
}