/**
 * ResilientLocalToolOrchestrator - Enhanced LocalToolOrchestrator with automatic recovery
 * 
 * Features:
 * - Automatic restart on failure
 * - Health monitoring and status reporting
 * - Exponential backoff for reconnection
 * - Connection state tracking
 * - Performance metrics
 */

import { LocalToolOrchestrator } from './LocalToolOrchestrator';
import type { FirehoseMux } from '@/services/acs/streaming/FirehoseMux';

export interface ServiceStatus {
    isRunning: boolean;
    isHealthy: boolean;
    reconnectAttempts: number;
    lastHealthCheck: number;
    uptime: number;
    errorCount: number;
    lastError?: string;
}

export class ResilientLocalToolOrchestrator extends LocalToolOrchestrator {
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private isHealthy = true;
    private startTime = Date.now();
    private lastHealthCheck = Date.now();
    private errorCount = 0;
    private lastError?: string;
    private isDestroyed = false;

    constructor(firehose: FirehoseMux) {
        super(firehose);
        this.startHealthMonitoring();
        console.log('🔧 [ResilientLTO] ✅ Resilient Local Tool Orchestrator initialized');
    }

    /**
     * Start health monitoring with periodic checks
     */
    private startHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // Health check every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            if (!this.isDestroyed) {
                this.performHealthCheck();
            }
        }, 30000);

        console.log('🔧 [ResilientLTO] 🏥 Health monitoring started');
    }

    /**
     * Perform health check and attempt recovery if needed
     */
    private performHealthCheck() {
        try {
            this.lastHealthCheck = Date.now();
            
            // Check if we're still processing events
            const isProcessing = this.isProcessingEvents();
            const firehoseHealthy = this.isFirehoseHealthy();
            
            if (!isProcessing || !firehoseHealthy) {
                this.isHealthy = false;
                
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    console.warn('🔧 [ResilientLTO] ⚠️ Health check failed, attempting restart...', {
                        isProcessing,
                        firehoseHealthy,
                        attempt: this.reconnectAttempts + 1
                    });
                    this.attemptRestart();
                } else {
                    console.error('🔧 [ResilientLTO] ❌ Max restart attempts reached, service degraded');
                    this.lastError = 'Max restart attempts exceeded';
                }
            } else {
                // Health check passed
                if (!this.isHealthy) {
                    console.log('🔧 [ResilientLTO] ✅ Health restored');
                }
                this.isHealthy = true;
                this.reconnectAttempts = 0; // Reset on successful health check
                this.lastError = undefined;
            }
        } catch (error) {
            console.error('🔧 [ResilientLTO] ❌ Health check error:', error);
            this.isHealthy = false;
            this.errorCount++;
            this.lastError = error instanceof Error ? error.message : String(error);
        }
    }

    /**
     * Check if the orchestrator is processing events
     */
    private isProcessingEvents(): boolean {
        try {
            // Check if the executing set exists and is accessible
            return this.executing && typeof this.executing.size === 'number';
        } catch (error) {
            console.error('🔧 [ResilientLTO] Error checking processing state:', error);
            return false;
        }
    }

    /**
     * Check if the firehose connection is healthy
     */
    private isFirehoseHealthy(): boolean {
        try {
            const firehose = (this as any).firehose;
            if (!firehose) return false;
            
            // Check if firehose has an active connection
            return firehose.isConnected?.() || false;
        } catch (error) {
            console.error('🔧 [ResilientLTO] Error checking firehose health:', error);
            return false;
        }
    }

    /**
     * Attempt to restart the orchestrator with exponential backoff
     */
    private attemptRestart() {
        this.reconnectAttempts++;
        const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`🔧 [ResilientLTO] 🔄 Restart attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffMs}ms`);
        
        setTimeout(() => {
            if (this.isDestroyed) return;
            
            try {
                // Stop current instance
                this.stop?.();
                
                // Wait a moment then restart
                setTimeout(() => {
                    if (this.isDestroyed) return;
                    
                    this.start();
                    console.log('🔧 [ResilientLTO] ✅ Restart successful');
                    this.isHealthy = true;
                }, 1000);
                
            } catch (error) {
                console.error('🔧 [ResilientLTO] ❌ Restart failed:', error);
                this.isHealthy = false;
                this.errorCount++;
                this.lastError = error instanceof Error ? error.message : String(error);
            }
        }, backoffMs);
    }

    /**
     * Enhanced start method with error handling
     */
    public start() {
        try {
            console.log('🔧 [ResilientLTO] 🚀 Starting orchestrator...');
            super.start();
            this.isHealthy = true;
            console.log('🔧 [ResilientLTO] ✅ Orchestrator started successfully');
        } catch (error) {
            console.error('🔧 [ResilientLTO] ❌ Failed to start orchestrator:', error);
            this.isHealthy = false;
            this.errorCount++;
            this.lastError = error instanceof Error ? error.message : String(error);
            throw error;
        }
    }

    /**
     * Enhanced stop method with cleanup
     */
    public stop() {
        try {
            console.log('🔧 [ResilientLTO] 🛑 Stopping orchestrator...');
            super.stop?.();
            this.isHealthy = false;
            console.log('🔧 [ResilientLTO] ✅ Orchestrator stopped');
        } catch (error) {
            console.error('🔧 [ResilientLTO] ❌ Error stopping orchestrator:', error);
            this.errorCount++;
            this.lastError = error instanceof Error ? error.message : String(error);
        }
    }

    /**
     * Get comprehensive status information
     */
    public getStatus(): ServiceStatus {
        return {
            isRunning: this.isProcessingEvents(),
            isHealthy: this.isHealthy,
            reconnectAttempts: this.reconnectAttempts,
            lastHealthCheck: this.lastHealthCheck,
            uptime: Date.now() - this.startTime,
            errorCount: this.errorCount,
            lastError: this.lastError
        };
    }

    /**
     * Force a health check (for debugging)
     */
    public forceHealthCheck() {
        console.log('🔧 [ResilientLTO] 🔍 Forcing health check...');
        this.performHealthCheck();
    }

    /**
     * Reset error counters and reconnect attempts
     */
    public resetCounters() {
        console.log('🔧 [ResilientLTO] 🔄 Resetting counters...');
        this.reconnectAttempts = 0;
        this.errorCount = 0;
        this.lastError = undefined;
        this.isHealthy = true;
    }

    /**
     * Destroy the orchestrator and cleanup resources
     */
    public destroy() {
        console.log('🔧 [ResilientLTO] 🗑️ Destroying orchestrator...');
        
        this.isDestroyed = true;
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        try {
            this.stop();
        } catch (error) {
            console.error('🔧 [ResilientLTO] Error during destruction:', error);
        }

        console.log('🔧 [ResilientLTO] ✅ Orchestrator destroyed');
    }

    /**
     * Get detailed diagnostic information
     */
    public getDiagnostics() {
        const status = this.getStatus();
        const firehose = (this as any).firehose;
        
        return {
            ...status,
            firehose: {
                exists: !!firehose,
                isConnected: firehose?.isConnected?.() || false,
                connectionType: firehose?.connectionType || 'unknown',
                reconnectAttempts: firehose?.reconnectAttempts || 0
            },
            executing: {
                size: this.executing?.size || 0,
                jobs: Array.from(this.executing || [])
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            }
        };
    }
}

export default ResilientLocalToolOrchestrator;
