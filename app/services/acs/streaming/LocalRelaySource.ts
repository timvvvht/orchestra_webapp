/* eslint-env browser */
/* eslint-disable import/namespace */
import mitt from 'mitt';
import { listen } from '@tauri-apps/api/event';
import type { ACSRawEvent } from './ACSFirehoseService';

type Events = {
    data: ACSRawEvent;
    error: Error;
};

/**
 * LocalRelaySource listens to Tauri backend events ('user_sse') and converts
 * them to the canonical ACSRawEvent shape for consumption by FirehoseMux.
 */
export class LocalRelaySource {
    private readonly bus = mitt<Events>();
    private unlistenFn: (() => void) | null = null;
    private isListening = false;

    constructor() {
        this.setupTauriListener();
    }

    private async setupTauriListener() {
        // Only setup if we're in a Tauri environment
        if (!('__TAURI__' in window)) {
            console.warn('[LocalRelaySource] Not in Tauri environment, skipping setup');
            return;
        }

        try {
            this.unlistenFn = await listen<unknown>('user_sse', ({ payload }) => {
                try {
                    // Convert Tauri event payload to ACSRawEvent format
                    const payloadObj = payload as Record<string, unknown>;
                    const rawEvent: ACSRawEvent = {
                        session_id: payloadObj.session_id as string,
                        event_type: (payloadObj.event || payloadObj.event_type) as string,
                        timestamp: Date.now(), // Add current timestamp since relay may not include it
                        data: payloadObj,
                        message_id: (payloadObj.messageId || payloadObj.message_id) as string | null,
                        event_id: (payloadObj.id || payloadObj.event_id) as string
                    };

                    // Emit to internal bus
                    this.bus.emit('data', rawEvent);
                } catch (error) {
                    console.error('[LocalRelaySource] Failed to process user_sse event:', error);
                    this.bus.emit('error', error instanceof Error ? error : new Error('Failed to process relay event'));
                }
            });

            this.isListening = true;
            console.log('[LocalRelaySource] Successfully setup Tauri user_sse listener');
        } catch (error) {
            console.error('[LocalRelaySource] Failed to setup Tauri listener:', error);
            this.bus.emit('error', error instanceof Error ? error : new Error('Failed to setup Tauri listener'));
        }
    }

    /**
     * Subscribe to relay events
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

    /**
     * Check if the relay source is actively listening
     */
    isConnected(): boolean {
        return this.isListening && this.unlistenFn !== null;
    }

    /**
     * Cleanup and disconnect from Tauri events
     */
    disconnect(): void {
        if (this.unlistenFn) {
            this.unlistenFn();
            this.unlistenFn = null;
        }
        this.isListening = false;
        console.log('[LocalRelaySource] Disconnected from Tauri events');
    }
}