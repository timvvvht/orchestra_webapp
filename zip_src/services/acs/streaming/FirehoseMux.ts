/* eslint-env browser */
import mitt from 'mitt';
import { DedupeCache } from '@/utils/DedupeCache';
import type { ACSFirehoseService, ACSRawEvent } from './ACSFirehoseService';
import type { LocalRelaySource } from './LocalRelaySource';

type Events = {
    data: ACSRawEvent;
    error: Error;
    status: { remoteConnected: boolean; relayConnected: boolean };
};

interface FirehoseMuxConfig {
    ignoreRelayHeartbeats?: boolean;
}

/**
 * Recursively strips timestamp fields from an object
 * @param obj The object to process
 * @returns A new object with timestamp fields removed
 */
function stripTimestamps(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(stripTimestamps);
    }
    
    if (typeof obj === 'string') {
        // Try to parse JSON strings and strip timestamps from them too
        try {
            const parsed = JSON.parse(obj);
            if (typeof parsed === 'object' && parsed !== null) {
                const cleaned = stripTimestamps(parsed);
                return JSON.stringify(cleaned);
            }
        } catch {
            // Not JSON, return as-is
        }
        return obj;
    }
    
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip timestamp fields (case-insensitive)
            if (key.toLowerCase().includes('timestamp')) {
                continue;
            }
            result[key] = stripTimestamps(value);
        }
        return result;
    }
    
    return obj;
}

/**
 * Generates a simple hash from a string using djb2 algorithm
 * @param str The string to hash
 * @returns A hash string
 */
function simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
}

/**
 * Creates a deduplication key by stripping timestamps and hashing the JSON
 * @param event The event to create a key for
 * @returns A hash-based deduplication key
 */
function createDedupeKey(event: ACSRawEvent): string {
    try {
        // Create a copy of the event without timestamps
        const cleanEvent = stripTimestamps(event);
        
        // Convert to JSON string and hash it
        const jsonString = JSON.stringify(cleanEvent);
        const hash = simpleHash(jsonString);
        
        // Debug logging to show the transformation
        console.log('[FirehoseMux] 🧹 Timestamp stripping and hashing:', {
            originalEventKeys: Object.keys(event),
            cleanedEventKeys: Object.keys(cleanEvent),
            jsonLength: jsonString.length,
            hash: hash
        });
        
        return hash;
    } catch (error) {
        console.warn('[FirehoseMux] Failed to create dedupe key, falling back to session:event format:', error);
        // Fallback to original method if anything goes wrong
        return `${event.session_id}:${event.event_id}`;
    }
}

/**
 * FirehoseMux multiplexes events from both ACSFirehoseService (remote) and LocalRelaySource (relay),
 * providing deduplication, health tracking, and unified event emission.
 */
export class FirehoseMux {
    private readonly bus = mitt<Events>();
    private readonly dedupe = new DedupeCache<string>(30_000, 10_000); // 30s window, 10k max entries
    private remoteUnsub: (() => void) | null = null;
    private relayUnsub: (() => void) | null = null;
    private remoteErrorUnsub: (() => void) | null = null;
    private relayErrorUnsub: (() => void) | null = null;
    private heartbeatCache = new Set<string>(); // Track heartbeat event_ids to filter duplicates
    private config: FirehoseMuxConfig;
    private statusMonitorInterval: ReturnType<typeof setInterval> | null = null;

    constructor(private remote: ACSFirehoseService, private relay: LocalRelaySource, config: FirehoseMuxConfig = {}) {
        this.config = { ignoreRelayHeartbeats: false, ...config };
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Subscribe to remote events
        this.remoteUnsub = this.remote.subscribe(event => {
            this.handleEvent(event, 'remote');
        });

        // Subscribe to relay events
        this.relayUnsub = this.relay.subscribe(event => {
            this.handleEvent(event, 'relay');
        });

        // Subscribe to error events
        this.remoteErrorUnsub = this.remote.subscribe(error => {
            this.bus.emit('error', error instanceof Error ? error : new Error('Remote error'));
        });

        this.relayErrorUnsub = this.relay.onError(error => {
            this.bus.emit('error', error);
        });

        // Subscribe to remote status changes
        if (typeof this.remote.onStatusChange === 'function') {
            this.remote.onStatusChange(connected => {
                console.log(`[FirehoseMux] Remote connection status changed: ${connected}`);
                this.emitStatus();
            });
        }

        // Emit initial status
        this.emitStatus();

        // Set up periodic status monitoring
        this.setupStatusMonitoring();
    }

    private handleEvent(event: ACSRawEvent, source: 'remote' | 'relay'): void {
        // Create deduplication key using hash of timestamp-stripped JSON
        console.log(`[FirehoseMux] 👾 Received event from ${source}:`, JSON.stringify(event, null, 2));
        const dedupeKey = createDedupeKey(event);
        console.log(`[FirehoseMux] 🔑 Generated dedupe key (hash of timestamp-stripped JSON): ${dedupeKey}`);

        // Check for duplicates
        if (this.dedupe.seen(dedupeKey)) {
            console.log(`[FirehoseMux] 🚫 Filtered duplicate event from ${source} with hash:`, dedupeKey);
            return;
        }

        // Filter heartbeat events if configured
        if (this.shouldFilterHeartbeat(event, source)) {
            return;
        }

        // Enhance event with source information for debugging
        const enhancedEvent: ACSRawEvent & { source?: string; originalTimestamp?: number } = {
            ...event,
            source
        };

        // Enhanced timestamp handling: fallback to remote timestamp if relay timestamp differs
        if (source === 'relay') {
            // Store original relay timestamp for debugging
            enhancedEvent.originalTimestamp = event.timestamp;

            // If relay timestamp is missing or significantly different, use current time
            if (!event.timestamp || Math.abs(event.timestamp - Date.now()) > 60000) {
                console.log(`[FirehoseMux] Relay timestamp fallback for event hash ${dedupeKey}:`, {
                    originalTimestamp: event.timestamp,
                    fallbackTimestamp: Date.now(),
                    source
                });
                enhancedEvent.timestamp = Date.now();
            }
        } else if (source === 'remote') {
            // For remote events, preserve the original timestamp but ensure it exists
            if (!event.timestamp) {
                enhancedEvent.timestamp = Date.now();
                console.log(`[FirehoseMux] Remote timestamp fallback for event hash ${dedupeKey}:`, {
                    fallbackTimestamp: enhancedEvent.timestamp,
                    source
                });
            }
        }

        // Log event processing for debugging
        console.log(`[FirehoseMux] Processing event from ${source}:`, {
            eventId: event.event_id,
            sessionId: event.session_id,
            eventType: event.event_type,
            timestamp: enhancedEvent.timestamp,
            originalTimestamp: enhancedEvent.originalTimestamp,
            source
        });

        // Emit the event
        this.bus.emit('data', enhancedEvent);
    }

    private shouldFilterHeartbeat(event: ACSRawEvent, source: 'remote' | 'relay'): boolean {
        if (event.event_type !== 'heartbeat') {
            return false;
        }

        // If configured to ignore relay heartbeats, filter them out
        if (this.config.ignoreRelayHeartbeats && source === 'relay') {
            console.log('[FirehoseMux] Filtered relay heartbeat event:', event.event_id);
            return true;
        }

        // For duplicate heartbeat filtering, track by event_id
        if (this.heartbeatCache.has(event.event_id)) {
            console.log(`[FirehoseMux] Filtered duplicate heartbeat from ${source}:`, event.event_id);
            return true;
        }

        // Add to heartbeat cache
        this.heartbeatCache.add(event.event_id);

        // Clean up heartbeat cache periodically (keep last 100 heartbeat IDs)
        if (this.heartbeatCache.size > 100) {
            const entries = Array.from(this.heartbeatCache);
            this.heartbeatCache.clear();
            // Keep the last 50 entries
            entries.slice(-50).forEach(id => this.heartbeatCache.add(id));
        }

        return false;
    }

    private setupStatusMonitoring(): void {
        // Monitor status changes every 5 seconds
        this.statusMonitorInterval = setInterval(() => {
            this.emitStatus();
        }, 5000);
    }

    private emitStatus(): void {
        const status = {
            remoteConnected: this.remote.isConnected(),
            relayConnected: this.relay.isConnected()
        };

        console.log('[FirehoseMux] Status update:', status);
        this.bus.emit('status', status);
    }

    /**
     * Subscribe to multiplexed events
     * @param handler Function to handle ACSRawEvent
     * @returns Unsubscribe function
     */
    subscribe(handler: (event: ACSRawEvent) => void): () => void {
        this.bus.on('data', handler);
        return () => this.bus.off('data', handler);
    }

    /**
     * Subscribe to error events
     * @param handler Function to handle errors
     * @returns Unsubscribe function
     */
    onError(handler: (error: Error) => void): () => void {
        this.bus.on('error', handler);
        return () => this.bus.off('error', handler);
    }

    /** Delegates user-specific connection to remote firehose */
    public connectPrivate(userId: string, jwt: string) {
        this.remote.connectPrivate(userId, jwt);
    }

    /** Delegates user disconnect to remote firehose (no-op if unsupported) */
    public disconnectUser() {
        if (typeof this.remote.disconnectUser === 'function') {
            this.remote.disconnectUser();
        }
    }

    /**
     * Subscribe to status change events
     * @param handler Function to handle status changes
     * @returns Unsubscribe function
     */
    onStatus(handler: (status: { remoteConnected: boolean; relayConnected: boolean }) => void): () => void {
        this.bus.on('status', handler);
        return () => this.bus.off('status', handler);
    }

    /**
     * Get current connection status
     */
    getStatus(): { remoteConnected: boolean; relayConnected: boolean } {
        return {
            remoteConnected: this.remote.isConnected(),
            relayConnected: this.relay.isConnected()
        };
    }

    /**
     * Check if either source is connected
     */
    isConnected(): boolean {
        return this.remote.isConnected() || this.relay.isConnected();
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<FirehoseMuxConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Cleanup and disconnect from all sources
     */
    disconnect(): void {
        // Clear status monitoring
        if (this.statusMonitorInterval) {
            clearInterval(this.statusMonitorInterval);
            this.statusMonitorInterval = null;
        }

        // Unsubscribe from all event handlers
        this.remoteUnsub?.();
        this.relayUnsub?.();
        this.remoteErrorUnsub?.();
        this.relayErrorUnsub?.();

        this.remoteUnsub = null;
        this.relayUnsub = null;
        this.remoteErrorUnsub = null;
        this.relayErrorUnsub = null;

        // Clear caches
        this.dedupe.clear();
        this.heartbeatCache.clear();

        console.log('[FirehoseMux] Disconnected from all sources');
    }
}

// Re-export ACSRawEvent type for consumers
export type { ACSRawEvent } from './ACSFirehoseService';
