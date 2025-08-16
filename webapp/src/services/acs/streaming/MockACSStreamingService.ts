import type { SSEEvent, SSEEventHandler, ACSClientConfig } from '../shared/types';
import { SSE_EVENT_TYPES } from '../shared/types';
import MockEventSource from '@/debug/MockEventSource';

/**
 * Mock version of ACSStreamingService that uses MockEventSource
 * for offline development and testing
 */
export class MockACSStreamingService {
    private mockEventSource: MockEventSource | null = null;
    private config: ACSClientConfig;
    private mockFrames: string[] = [];

    private eventHandlers = new Map<string, Set<SSEEventHandler>>();
    private globalHandlers = new Set<SSEEventHandler>();
    private connectionHandlers = new Set<(connected: boolean) => void>();

    constructor(config: ACSClientConfig, mockFrames: string[] = []) {
        this.config = config;
        this.mockFrames = mockFrames;
        console.log('🎭 [MockACSStreamingService] Created with', mockFrames.length, 'mock frames');
    }

    async connect(sessionId: string, options?: { autoReconnect?: boolean }): Promise<void> {
        console.log('🎭 [MockACSStreamingService] Mock connect called for session:', sessionId);
        
        if (this.mockEventSource) {
            console.log('🎭 [MockACSStreamingService] Already connected, closing previous connection');
            this.mockEventSource.close();
        }

        console.log('🎭 [MockACSStreamingService] Creating MockEventSource with', this.mockFrames.length, 'frames');
        this.mockEventSource = new MockEventSource(this.mockFrames, 1000);

        // Set up event handlers
        this.mockEventSource.onopen = () => {
            console.log('🎭 [MockACSStreamingService] Mock connection opened');
            this.notifyConnectionHandlers(true);
        };

        this.mockEventSource.onerror = () => {
            console.log('🎭 [MockACSStreamingService] Mock connection error');
            this.notifyConnectionHandlers(false);
        };

        this.mockEventSource.onmessage = (event) => {
            console.log('🎭 [MockACSStreamingService] Mock message received:', event.data);
            this.handleMockEvent(event);
        };

        // Return a promise that resolves when connection is open
        return new Promise<void>((resolve) => {
            const checkConnection = () => {
                if (this.mockEventSource?.readyState === MockEventSource.OPEN) {
                    resolve();
                } else {
                    setTimeout(checkConnection, 50);
                }
            };
            checkConnection();
        });
    }

    async disconnect(): Promise<void> {
        console.log('🎭 [MockACSStreamingService] Mock disconnect called');
        if (this.mockEventSource) {
            this.mockEventSource.close();
            this.mockEventSource = null;
        }
        this.notifyConnectionHandlers(false);
    }

    isConnected(): boolean {
        return this.mockEventSource?.readyState === MockEventSource.OPEN;
    }

    // Event subscription methods (same as real service)
    onEvent(handler: SSEEventHandler): () => void {
        this.globalHandlers.add(handler);
        return () => this.globalHandlers.delete(handler);
    }

    onEventType(eventType: string, handler: SSEEventHandler): () => void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(handler);
        return () => {
            const set = this.eventHandlers.get(eventType);
            if (set) {
                set.delete(handler);
                if (set.size === 0) {
                    this.eventHandlers.delete(eventType);
                }
            }
        };
    }

    onConnectionChange(handler: (connected: boolean) => void): () => void {
        this.connectionHandlers.add(handler);
        return () => this.connectionHandlers.delete(handler);
    }

    // Convenience wrappers
    onChunk(h: SSEEventHandler) {
        return this.onEventType(SSE_EVENT_TYPES.CHUNK, h);
    }
    onToken(h: SSEEventHandler) {
        return this.onEventType(SSE_EVENT_TYPES.TOKEN, h);
    }
    onToolCall(h: SSEEventHandler) {
        return this.onEventType(SSE_EVENT_TYPES.TOOL_CALL, h);
    }
    onToolResult(h: SSEEventHandler) {
        return this.onEventType(SSE_EVENT_TYPES.TOOL_RESULT, h);
    }
    onDone(h: SSEEventHandler) {
        return this.onEventType(SSE_EVENT_TYPES.DONE, h);
    }
    onError(h: SSEEventHandler) {
        return this.onEventType(SSE_EVENT_TYPES.ERROR, h);
    }
    onStatus(h: SSEEventHandler) {
        return this.onEventType(SSE_EVENT_TYPES.STATUS, h);
    }

    // Mock implementations of utility methods
    async testConnection(sessionId: string) {
        console.log('🎭 [MockACSStreamingService] Mock test connection for:', sessionId);
        return Promise.resolve();
    }

    async getHealth() {
        console.log('🎭 [MockACSStreamingService] Mock health check');
        return { status: 'healthy', mock: true };
    }

    async getStats() {
        console.log('🎭 [MockACSStreamingService] Mock stats');
        return { connections: 1, events_sent: this.mockFrames.length, mock: true };
    }

    // Private methods
    private handleMockEvent(event: MessageEvent) {
        console.log('🎭 [MockACSStreamingService] Processing mock event:', event.data);
        
        let parsedData: any;
        try {
            parsedData = JSON.parse(event.data);
        } catch (e) {
            console.warn('🎭 [MockACSStreamingService] Failed to parse event data:', e);
            return;
        }

        // Transform the mock data into SSEEvent format
        let sseEvent: SSEEvent | null = null;

        // Handle Orchestra agent events
        if (parsedData.type === 'agent_event' && parsedData.payload) {
            const p = parsedData.payload;
            sseEvent = {
                type: p.event_type,
                sessionId: p.session_id,
                event_id: p.event_id,
                messageId: p.message_id,
                delta: this.extractDelta(p),
                toolCall: this.extractToolCall(p),
                result: this.extractResult(p),
                error: this.extractError(p),
                data: p.data
            };
        }
        // Handle system events
        else if (parsedData.type === 'connected') {
            sseEvent = {
                type: SSE_EVENT_TYPES.CONNECTED,
                sessionId: parsedData.session_id,
                data: parsedData
            } as SSEEvent;
        }
        // Handle direct SSE events (legacy format)
        else if (parsedData.event_type) {
            sseEvent = {
                type: parsedData.event_type,
                sessionId: parsedData.session_id,
                messageId: parsedData.message_id,
                delta: parsedData.data?.content || parsedData.data?.text,
                toolCall: parsedData.tool_call,
                result: parsedData.result,
                error: parsedData.error,
                data: parsedData.data
            };
        }

        if (sseEvent) {
            console.log('🎭 [MockACSStreamingService] Dispatching SSE event:', sseEvent.type);
            
            // Dispatch to global handlers
            this.globalHandlers.forEach(handler => {
                try {
                    handler(sseEvent!);
                } catch (e) {
                    console.error('🎭 [MockACSStreamingService] Handler error:', e);
                }
            });

            // Dispatch to type-specific handlers
            const typeHandlers = this.eventHandlers.get(sseEvent.type);
            if (typeHandlers) {
                typeHandlers.forEach(handler => {
                    try {
                        handler(sseEvent!);
                    } catch (e) {
                        console.error('🎭 [MockACSStreamingService] Type handler error:', e);
                    }
                });
            }
        }
    }

    private extractDelta(p: any) {
        if (p.event_type === 'chunk' || p.event_type === 'token') {
            return p.data?.text || p.data?.content || p.data?.delta;
        }
    }

    private extractToolCall(p: any) {
        if (p.event_type === 'tool_call') {
            return {
                id: p.data.call_id || p.event_id,
                name: p.data.tool_name || p.data.tool,
                arguments: p.data.tool_input || p.data.input || p.data
            };
        }
    }

    private extractResult(p: any) {
        if (p.event_type === 'tool_result') {
            return {
                call_id: p.data.call_id,
                tool_name: p.data.tool_name || p.data.tool,
                result: p.data.result || p.data.output,
                success: p.data.success
            };
        }
    }

    private extractError(p: any) {
        if (p.event_type === 'error') {
            return p.data.message || p.data.error || JSON.stringify(p.data);
        }
    }

    private notifyConnectionHandlers(connected: boolean) {
        console.log('🎭 [MockACSStreamingService] Notifying connection handlers:', connected);
        this.connectionHandlers.forEach(handler => {
            try {
                handler(connected);
            } catch (e) {
                console.error('🎭 [MockACSStreamingService] Connection handler error:', e);
            }
        });
    }

    // --------------------------------------------------------
    // CLEANUP METHODS (Mock implementations)
    // --------------------------------------------------------
    
    /** Close both session and user connections (mock) */
    public close() {
        console.log('🎭 [MockACSStreamingService] 🧹 Closing all connections...');
        
        if (this.mockEventSource) {
            console.log('🎭 [MockACSStreamingService] 🧹 Closing mock EventSource');
            this.mockEventSource.close();
            this.mockEventSource = null;
        }
        
        this.notifyConnectionHandlers(false);
        console.log('✅ [MockACSStreamingService] 🧹 All connections closed');
    }

    /** Close only the session stream (mock) */
    public disconnectSession() {
        console.log('🎭 [MockACSStreamingService] 🧹 Disconnecting session stream only...');
        
        if (this.mockEventSource) {
            console.log('🎭 [MockACSStreamingService] 🧹 Closing mock EventSource');
            this.mockEventSource.close();
            this.mockEventSource = null;
            this.notifyConnectionHandlers(false);
        } else {
            console.log('ℹ️ [MockACSStreamingService] 🧹 No mock EventSource to close');
        }
        
        console.log('✅ [MockACSStreamingService] 🧹 Session disconnected (mock)');
    }
}