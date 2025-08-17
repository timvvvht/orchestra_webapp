/**
 * FirehoseMux.fallback.test.ts - Tests for dual-source event multiplexing
 * 
 * Verifies that FirehoseMux correctly handles:
 * - Deduplication of events from multiple sources
 * - Fallback behavior when sources are unavailable
 * - Heartbeat filtering
 * - Status tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FirehoseMux } from '../FirehoseMux';
import type { ACSRawEvent } from '../ACSFirehoseService';

// Mock implementations
class MockACSFirehoseService {
    private handlers: Array<(event: ACSRawEvent) => void> = [];
    private statusHandlers: Array<(connected: boolean) => void> = [];
    private connected = false;

    subscribe(handler: (event: ACSRawEvent) => void) {
        this.handlers.push(handler);
        return () => {
            const index = this.handlers.indexOf(handler);
            if (index > -1) this.handlers.splice(index, 1);
        };
    }

    onStatusChange(handler: (connected: boolean) => void) {
        this.statusHandlers.push(handler);
        return () => {
            const index = this.statusHandlers.indexOf(handler);
            if (index > -1) this.statusHandlers.splice(index, 1);
        };
    }

    isConnected() {
        return this.connected;
    }

    // Test helpers
    setConnected(connected: boolean) {
        this.connected = connected;
        this.statusHandlers.forEach(handler => handler(connected));
    }

    emitEvent(event: ACSRawEvent) {
        this.handlers.forEach(handler => handler(event));
    }
}

class MockLocalRelaySource {
    private handlers: Array<(event: ACSRawEvent) => void> = [];
    private errorHandlers: Array<(error: Error) => void> = [];
    private connected = false;

    subscribe(handler: (event: ACSRawEvent) => void) {
        this.handlers.push(handler);
        return () => {
            const index = this.handlers.indexOf(handler);
            if (index > -1) this.handlers.splice(index, 1);
        };
    }

    onError(handler: (error: Error) => void) {
        this.errorHandlers.push(handler);
        return () => {
            const index = this.errorHandlers.indexOf(handler);
            if (index > -1) this.errorHandlers.splice(index, 1);
        };
    }

    isConnected() {
        return this.connected;
    }

    disconnect() {
        this.connected = false;
    }

    // Test helpers
    setConnected(connected: boolean) {
        this.connected = connected;
    }

    emitEvent(event: ACSRawEvent) {
        this.handlers.forEach(handler => handler(event));
    }

    emitError(error: Error) {
        this.errorHandlers.forEach(handler => handler(error));
    }
}

describe('FirehoseMux', () => {
    let mockRemote: MockACSFirehoseService;
    let mockRelay: MockLocalRelaySource;
    let firehoseMux: FirehoseMux;
    let receivedEvents: ACSRawEvent[];
    let receivedStatuses: Array<{ remoteConnected: boolean; relayConnected: boolean }>;

    beforeEach(() => {
        // Clear console.log to avoid test noise
        vi.spyOn(console, 'log').mockImplementation(() => {});
        
        mockRemote = new MockACSFirehoseService();
        mockRelay = new MockLocalRelaySource();
        firehoseMux = new FirehoseMux(mockRemote as any, mockRelay as any);
        
        receivedEvents = [];
        receivedStatuses = [];

        // Subscribe to events and status
        firehoseMux.subscribe((event) => {
            receivedEvents.push(event);
        });

        firehoseMux.onStatus((status) => {
            receivedStatuses.push(status);
        });
    });

    afterEach(() => {
        firehoseMux.disconnect();
        vi.restoreAllMocks();
    });

    describe('Deduplication', () => {
        it('should emit duplicate event (same event_id) from two sources only once', () => {
            const testEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'duplicate-event-123',
                timestamp: Date.now(),
                data: { message: 'test' }
            };

            // Emit same event from both sources
            mockRemote.emitEvent(testEvent);
            mockRelay.emitEvent(testEvent);

            // Should only receive one event
            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].event_id).toBe('duplicate-event-123');
            expect(receivedEvents[0].source).toBe('remote'); // First source wins
        });

        it('should handle events with different event_ids normally', () => {
            const remoteEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'remote-event-123',
                timestamp: Date.now(),
                data: { message: 'remote' }
            };

            const relayEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'relay-event-456',
                timestamp: Date.now(),
                data: { message: 'relay' }
            };

            mockRemote.emitEvent(remoteEvent);
            mockRelay.emitEvent(relayEvent);

            expect(receivedEvents).toHaveLength(2);
            expect(receivedEvents[0].event_id).toBe('remote-event-123');
            expect(receivedEvents[1].event_id).toBe('relay-event-456');
        });
    });

    describe('Fallback Behavior', () => {
        it('should receive events when remote down, relay up', () => {
            // Set connection states
            mockRemote.setConnected(false);
            mockRelay.setConnected(true);

            const relayEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'relay-only-event',
                timestamp: Date.now(),
                data: { message: 'relay only' }
            };

            mockRelay.emitEvent(relayEvent);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].event_id).toBe('relay-only-event');
            expect(receivedEvents[0].source).toBe('relay');
        });

        it('should receive events when relay down, remote up (baseline)', () => {
            // Set connection states
            mockRemote.setConnected(true);
            mockRelay.setConnected(false);

            const remoteEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'remote-only-event',
                timestamp: Date.now(),
                data: { message: 'remote only' }
            };

            mockRemote.emitEvent(remoteEvent);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].event_id).toBe('remote-only-event');
            expect(receivedEvents[0].source).toBe('remote');
        });

        it('should continue working when both sources are available', () => {
            // Set both connected
            mockRemote.setConnected(true);
            mockRelay.setConnected(true);

            const remoteEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'remote-event',
                timestamp: Date.now(),
                data: { message: 'remote' }
            };

            const relayEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'relay-event',
                timestamp: Date.now(),
                data: { message: 'relay' }
            };

            mockRemote.emitEvent(remoteEvent);
            mockRelay.emitEvent(relayEvent);

            expect(receivedEvents).toHaveLength(2);
            expect(receivedEvents.map(e => e.event_id)).toContain('remote-event');
            expect(receivedEvents.map(e => e.event_id)).toContain('relay-event');
        });
    });

    describe('Heartbeat Filtering', () => {
        it('should filter duplicate heartbeat events from both sources', () => {
            const heartbeatEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'heartbeat',
                event_id: 'heartbeat-123',
                timestamp: Date.now(),
                data: {}
            };

            // Emit same heartbeat from both sources
            mockRemote.emitEvent(heartbeatEvent);
            mockRelay.emitEvent(heartbeatEvent);

            // Should only receive one heartbeat
            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].event_type).toBe('heartbeat');
            expect(receivedEvents[0].source).toBe('remote');
        });

        it('should filter relay heartbeats when ignoreRelayHeartbeats is enabled', () => {
            // Create new mux with relay heartbeat filtering enabled
            firehoseMux.disconnect();
            firehoseMux = new FirehoseMux(mockRemote as any, mockRelay as any, { ignoreRelayHeartbeats: true });
            
            receivedEvents = [];
            firehoseMux.subscribe((event) => {
                receivedEvents.push(event);
            });

            const remoteHeartbeat: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'heartbeat',
                event_id: 'remote-heartbeat',
                timestamp: Date.now(),
                data: {}
            };

            const relayHeartbeat: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'heartbeat',
                event_id: 'relay-heartbeat',
                timestamp: Date.now(),
                data: {}
            };

            mockRemote.emitEvent(remoteHeartbeat);
            mockRelay.emitEvent(relayHeartbeat);

            // Should only receive remote heartbeat
            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].event_id).toBe('remote-heartbeat');
            expect(receivedEvents[0].source).toBe('remote');
        });

        it('should allow different heartbeat event_ids through', () => {
            const heartbeat1: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'heartbeat',
                event_id: 'heartbeat-1',
                timestamp: Date.now(),
                data: {}
            };

            const heartbeat2: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'heartbeat',
                event_id: 'heartbeat-2',
                timestamp: Date.now(),
                data: {}
            };

            mockRemote.emitEvent(heartbeat1);
            mockRelay.emitEvent(heartbeat2);

            expect(receivedEvents).toHaveLength(2);
            expect(receivedEvents.map(e => e.event_id)).toContain('heartbeat-1');
            expect(receivedEvents.map(e => e.event_id)).toContain('heartbeat-2');
        });
    });

    describe('Status Tracking', () => {
        it('should track connection status of both sources', async () => {
            // Check initial status via getStatus() method
            const initialStatus = firehoseMux.getStatus();
            expect(initialStatus.remoteConnected).toBe(false);
            expect(initialStatus.relayConnected).toBe(false);
            
            // Change remote connection status
            mockRemote.setConnected(true);
            
            // Wait for status update
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Check updated status
            const updatedStatus = firehoseMux.getStatus();
            expect(updatedStatus.remoteConnected).toBe(true);
            expect(updatedStatus.relayConnected).toBe(false);
        });

        it('should report connected when either source is connected', () => {
            mockRemote.setConnected(false);
            mockRelay.setConnected(true);
            
            expect(firehoseMux.isConnected()).toBe(true);
            
            mockRemote.setConnected(true);
            mockRelay.setConnected(false);
            
            expect(firehoseMux.isConnected()).toBe(true);
            
            mockRemote.setConnected(false);
            mockRelay.setConnected(false);
            
            expect(firehoseMux.isConnected()).toBe(false);
        });

        it('should provide detailed status via getStatus()', () => {
            mockRemote.setConnected(true);
            mockRelay.setConnected(false);
            
            const status = firehoseMux.getStatus();
            expect(status).toEqual({
                remoteConnected: true,
                relayConnected: false
            });
        });
    });

    describe('Timestamp Handling', () => {
        it('should preserve remote timestamps', () => {
            const testTimestamp = Date.now() - 1000;
            const remoteEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'remote-event',
                timestamp: testTimestamp,
                data: {}
            };

            mockRemote.emitEvent(remoteEvent);

            expect(receivedEvents[0].timestamp).toBe(testTimestamp);
        });

        it('should fallback relay timestamp if missing or too old', () => {
            const oldTimestamp = Date.now() - 120000; // 2 minutes ago
            const relayEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'relay-event',
                timestamp: oldTimestamp,
                data: {}
            };

            const beforeEmit = Date.now();
            mockRelay.emitEvent(relayEvent);
            const afterEmit = Date.now();

            expect(receivedEvents[0].timestamp).toBeGreaterThanOrEqual(beforeEmit);
            expect(receivedEvents[0].timestamp).toBeLessThanOrEqual(afterEmit);
            expect((receivedEvents[0] as any).originalTimestamp).toBe(oldTimestamp);
        });
    });

    describe('Configuration', () => {
        it('should allow updating configuration', () => {
            firehoseMux.updateConfig({ ignoreRelayHeartbeats: true });

            const relayHeartbeat: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'heartbeat',
                event_id: 'relay-heartbeat',
                timestamp: Date.now(),
                data: {}
            };

            mockRelay.emitEvent(relayHeartbeat);

            // Should be filtered due to updated config
            expect(receivedEvents).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        it('should forward errors from both sources', () => {
            const receivedErrors: Error[] = [];
            firehoseMux.onError((error) => {
                receivedErrors.push(error);
            });

            const testError = new Error('Test error');
            mockRelay.emitError(testError);

            expect(receivedErrors).toHaveLength(1);
            expect(receivedErrors[0]).toBe(testError);
        });
    });

    describe('Cleanup', () => {
        it('should properly cleanup on disconnect', () => {
            firehoseMux.disconnect();

            // Events should not be received after disconnect
            const testEvent: ACSRawEvent = {
                session_id: 'test-session',
                event_type: 'test_event',
                event_id: 'after-disconnect',
                timestamp: Date.now(),
                data: {}
            };

            const initialEventCount = receivedEvents.length;
            mockRemote.emitEvent(testEvent);
            mockRelay.emitEvent(testEvent);

            expect(receivedEvents).toHaveLength(initialEventCount);
        });
    });
});