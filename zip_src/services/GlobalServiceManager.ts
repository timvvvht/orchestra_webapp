/**
 * GlobalServiceManager - Manages app-level services
 *
 * This manager ensures that:
 * - ACS Firehose connection persists across navigation
 * - Services automatically recover from failures
 * - Health monitoring and status reporting
 *
 * NOTE: This manager creates and manages the FirehoseMux and its dependencies.
 */

import { ACSFirehoseService } from './acs/streaming/ACSFirehoseService';
import { LocalRelaySource } from './acs/streaming/LocalRelaySource';
import { FirehoseMux } from './acs/streaming/FirehoseMux';
import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from '@/lib/isTauri';

/**
 * Global Service Manager - Singleton pattern for critical service monitoring
 */
class GlobalServiceManager {
    private static instance: GlobalServiceManager | null = null;
    private firehose: FirehoseMux | null = null;
    private remoteFirehose: ACSFirehoseService | null = null;
    private relaySource: LocalRelaySource | null = null;

    private isInitialized = false;
    private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    // SSE Relay management state
    private relayStartedFor: string | null = null;
    private relayStartInFlight: Promise<void> | null = null;

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): GlobalServiceManager {
        if (!GlobalServiceManager.instance) {
            GlobalServiceManager.instance = new GlobalServiceManager();
        }
        return GlobalServiceManager.instance;
    }

    /**
     * Initialize global service monitoring - references existing services
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('🌐 [GlobalServiceManager] Already initialized, skipping...');
            return;
        }

        try {
            console.log('🌐 [GlobalServiceManager] 🚀 Initializing service monitoring...');

            // Create the remote firehose service directly (no dependency on ACS client)
            const sseBaseUrl = (typeof window !== 'undefined' && (window as any).VITE_SSE_BASE_URL) || 'https://orchestra-sse-service.fly.dev';
            this.remoteFirehose = new ACSFirehoseService(sseBaseUrl);

            // Create the relay source
            this.relaySource = new LocalRelaySource();

            // Create the multiplexer that combines both sources
            this.firehose = new FirehoseMux(this.remoteFirehose, this.relaySource);

            this.isInitialized = true;
            console.log('🌐 [GlobalServiceManager] ✅ Service monitoring initialized successfully');

            // Start global health monitoring
            this.startGlobalHealthMonitoring();
        } catch (error) {
            console.error('🌐 [GlobalServiceManager] ❌ Failed to initialize service monitoring:', error);
            throw error;
        }
    }

    private startGlobalHealthMonitoring() {
        // Global health check every 60 seconds
        this.healthCheckInterval = setInterval(() => {
            this.performGlobalHealthCheck();
        }, 60000);
    }

    private performGlobalHealthCheck() {
        try {
            const status = this.getStatus();

            if (!status.firehose.isConnected) {
                console.warn('🌐 [GlobalServiceManager] ⚠️ Firehose disconnected, monitoring...');
            }

            // Log status periodically for debugging
            if (process.env.NODE_ENV === 'development') {
                console.log('🌐 [GlobalServiceManager] Health check:', {
                    firehose: status.firehose.isConnected ? '🟢' : '🔴'
                });
            }
        } catch (error) {
            console.error('🌐 [GlobalServiceManager] Global health check error:', error);
        }
    }

    /**
     * Get current status of all services
     */
    public getStatus() {
        const firehoseStatus = {
            isConnected: this.firehose?.isConnected?.() || false,
            status: this.firehose?.getStatus?.() || { remoteConnected: false, relayConnected: false },
            connectionType: (this.remoteFirehose as any)?.connectionType || 'unknown',
            reconnectAttempts: (this.remoteFirehose as any)?.reconnectAttempts || 0
        };

        return {
            isInitialized: this.isInitialized,
            firehose: firehoseStatus,
            timestamp: Date.now()
        };
    }

    /**
     * Force restart of services (for debugging/recovery)
     */
    public async restart(): Promise<void> {
        console.log('🌐 [GlobalServiceManager] 🔄 Restarting service monitoring...');

        try {
            // Stop current monitoring
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }

            // Reinitialize monitoring
            this.isInitialized = false;
            await this.initialize();

            console.log('🌐 [GlobalServiceManager] ✅ Service monitoring restarted successfully');
        } catch (error) {
            console.error('🌐 [GlobalServiceManager] ❌ Failed to restart service monitoring:', error);
            throw error;
        }
    }

    /**
     * Start SSE relay for a specific user (internal helper)
     */
    private async startSSERelay(userId: string): Promise<void> {
        console.log('[GSM] startSSERelay(userId=', userId, ')');
        if (!isTauriEnvironment()) return; // No-op on web
        if (this.relayStartedFor === userId) return; // already started for same user
        if (this.relayStartInFlight) await this.relayStartInFlight; // wait ongoing

        this.relayStartInFlight = (async () => {
            try {
                await invoke('sse_relay_start', { userId: userId });
                console.log('[GSM] 🔌 SSE relay started for', userId);
                this.relayStartedFor = userId;
            } catch (err) {
                console.error('[GSM] ❌ Failed to start SSE relay:', err);
            } finally {
                this.relayStartInFlight = null;
            }
        })();
        await this.relayStartInFlight;
    }

    /**
     * Stop SSE relay (internal helper)
     */
    private async stopSSERelay(): Promise<void> {
        console.log('[GSM] stopSSERelay()');
        if (!isTauriEnvironment()) return;
        try {
            await invoke('sse_relay_stop');
            console.log('[GSM] 🔌 SSE relay stopped');
        } catch (err) {
            console.error('[GSM] ❌ Failed to stop SSE relay:', err);
        }
        this.relayStartedFor = null;
    }

    /**
     * Handle authentication state changes - start/stop SSE relay accordingly
     */
    public async handleAuthChange(userId: string | null): Promise<void> {
        console.log('[GSM] handleAuthChange called with', userId);
        if (userId) {
            await this.startSSERelay(userId);
        } else {
            await this.stopSSERelay();
        }
    }

    /**
     * Cleanup - call this on app shutdown
     */
    public destroy(): void {
        console.log('🌐 [GlobalServiceManager] 🛑 Shutting down service monitoring...');

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Stop SSE relay if running
        if (this.relayStartedFor) {
            this.stopSSERelay().catch(err => {
                console.error('[GSM] ❌ Failed to stop SSE relay during destroy:', err);
            });
        }

        // Cleanup FirehoseMux and its sources
        this.firehose?.disconnect();
        this.relaySource?.disconnect();

        this.firehose = null;
        this.remoteFirehose = null;
        this.relaySource = null;
        this.isInitialized = false;
        this.relayStartedFor = null;
        this.relayStartInFlight = null;
    }
}

/**
 * Ensure GSM is initialised exactly once – synchronous wrapper
 */
export function ensureGSMInitialised() {
    const gsm = globalServiceManager;
    if (!gsm.getStatus().isInitialized) {
        // initialise() returns a Promise but FirehoseMux is created synchronously
        // so we intentionally do NOT await here.
        gsm.initialize().catch(err => console.error('[GSM] auto-init failed', err));
    }
    return gsm;
}

// Export singleton instance
export const globalServiceManager = GlobalServiceManager.getInstance();

/**
 * Get the FirehoseMux instance for other modules
 */
export function getFirehose(): FirehoseMux | null {
    const gsm = ensureGSMInitialised();
    return (gsm as any).firehose ?? null;
}

/**
 * Notify GlobalServiceManager of authentication state changes
 * This is a convenience function to trigger SSE relay start/stop
 */
export function notifyAuthChange(userId: string | null) {
    globalServiceManager.handleAuthChange(userId);
}

// Export for debugging
if (typeof window !== 'undefined') {
    (window as any).__globalServiceManager = globalServiceManager;
}
