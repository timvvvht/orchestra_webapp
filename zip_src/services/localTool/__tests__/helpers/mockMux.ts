/**
 * Mock FirehoseMux for unit testing LocalToolOrchestrator
 */
import type { ACSRawEvent } from '@/services/acs/streaming/FirehoseMux';

export class FirehoseMux {
    private listeners: Array<(event: ACSRawEvent) => void> = [];

    /**
     * Subscribe to events - returns unsubscribe function
     */
    subscribe(listener: (event: ACSRawEvent) => void): () => void {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Emit an event to all subscribers (for testing)
     */
    emit(event: ACSRawEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Get number of active listeners (for testing)
     */
    getListenerCount(): number {
        return this.listeners.length;
    }

    /**
     * Clear all listeners (for testing cleanup)
     */
    clearListeners(): void {
        this.listeners = [];
    }
}