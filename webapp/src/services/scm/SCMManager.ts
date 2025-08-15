/**
 * SCMManager Service - Orchestra Git-based Source Control Management
 *
 * Manages SCM operations across different backends (Rust/Tauri, Node.js, Mock)
 * Automatically selects the appropriate backend based on the runtime environment
 * Provides a unified interface for all SCM operations regardless of backend
 *
 * Refactored to use backend abstraction pattern for maximum flexibility
 */

import { Commit } from './types';
import { ScmBackend, RustTauriBackend, MockBackend, isTauriEnvironment } from './backends';
import { invoke } from '@tauri-apps/api/core';

export interface SCMManagerOptions {
    /**
     * Force a specific backend type instead of auto-detection
     * Useful for testing or specific deployment scenarios
     */
    forceBackend?: 'rust' | 'mock';

    /**
     * Whether to allow fallback to mock backend if real backends fail
     * Default: true in development, false in production
     */
    allowMockFallback?: boolean;
}

export class SCMManager {
    private backend: ScmBackend;
    private options: SCMManagerOptions;

    constructor(options: SCMManagerOptions = {}) {
        this.options = {
            allowMockFallback: process.env.NODE_ENV !== 'production',
            ...options
        };

        this.backend = this.createBackend();
    }

    /**
     * Create the appropriate backend based on environment and options
     */
    private createBackend(): ScmBackend {
        // Check for forced backend type
        if (this.options.forceBackend) {
            switch (this.options.forceBackend) {
                case 'rust':
                    console.log('[SCMManager] FORCED Rust backend - creating RustTauriBackend');
                    return new RustTauriBackend();

                case 'nodejs':
                    throw new Error('[SCMManager] SimpleNodeJsBackend has been deprecated. Use forceBackend: "rust" instead.');

                case 'mock':
                    console.log('[SCMManager] FORCED Mock backend');
                    return new MockBackend();
            }
        }

        // Auto-detect backend based on environment
        try {
            if (isTauriEnvironment()) {
                console.log('[SCMManager] Using Rust/Tauri backend');
                return new RustTauriBackend();
            }

            // -- NO AUTOMATIC NODE BACKEND --
            // SimpleNodeJsBackend has been deprecated and removed

            if (this.options.forceBackend === 'mock' || this.options.allowMockFallback) {
                console.log('[SCMManager] Using Mock backend (web environment)');
                return new MockBackend();
            }

            throw new Error('[SCMManager] Tauri environment not detected and no backend forced. ' + 'Refusing to run with NodeJS backend.');
        } catch (error) {
            console.error('[SCMManager] Failed to create preferred backend:', error);

            if (this.options.allowMockFallback) {
                console.log('[SCMManager] Falling back to Mock backend');
                return new MockBackend();
            } else {
                throw new Error(`Failed to initialize SCM backend: ${error.message}`);
            }
        }
    }

    // ============================================================================
    // PUBLIC API - All methods delegate to the selected backend
    // ============================================================================

    /**
     * Check if a repository exists for the given workspace
     */
    async hasRepository(cwd: string): Promise<boolean> {
        return await this.backend.hasRepository(cwd);
    }

    /**
     * Get the current commit hash for the workspace
     */
    async getCurrentCommit(cwd: string): Promise<string | null> {
        return await this.backend.getCurrentCommit(cwd);
    }

    /**
     * Get commit history for workspace
     */
    async getHistory(cwd: string, limit?: number): Promise<Commit[]> {
        return await this.backend.getHistory(cwd, limit);
    }

    /**
     * Create checkpoint (commit) for workspace
     */
    async checkpoint(cwd: string, message: string): Promise<string> {
        return await this.backend.checkpoint(cwd, message);
    }

    /**
     * Get diff between two commits or between a commit and working tree
     */
    async diff(cwd: string, fromSha: string, toSha?: string): Promise<string> {
        return await this.backend.diff(cwd, fromSha, toSha);
    }

    /**
     * Get diff between two commits (legacy method name for backward compatibility)
     */
    async diffBetween(cwd: string, baseSha: string, targetSha: string): Promise<string> {
        return await this.backend.diff(cwd, baseSha, targetSha);
    }

    /**
     * Revert workspace to specific commit
     */
    async revert(cwd: string, sha: string): Promise<void> {
        return await this.backend.revert(cwd, sha);
    }

    /**
     * Get file content at specific commit
     */
    async getFileAtCommit(cwd: string, sha: string, filePath: string): Promise<string> {
        console.log('📡 [SCMManager] getFileAtCommit called:', {
            cwd,
            sha,
            filePath,
            backendType: this.backend.getBackendType()
        });
        
        try {
            const content = await this.backend.getFileAtCommit(cwd, sha, filePath);
            console.log('📥 [SCMManager] getFileAtCommit result:', {
                filePath,
                sha,
                contentLength: content.length,
                isEmpty: content.trim() === '',
                preview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
            });
            
            return content;
        } catch (error) {
            console.error('❌ [SCMManager] getFileAtCommit failed:', {
                filePath,
                sha,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }

    /**
     * Initialize a repository for the workspace if it doesn't exist
     */
    async initializeRepository(cwd: string): Promise<void> {
        return await this.backend.initializeRepository(cwd);
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get the backend type for debugging/UI purposes
     */
    getBackendType(): string {
        return this.backend.getBackendType();
    }

    /**
     * Check if this manager is using a real backend (vs mocks)
     */
    isRealBackend(): boolean {
        return this.backend.isRealBackend();
    }

    /**
     * Get backend instance (for advanced usage)
     */
    getBackend(): ScmBackend {
        return this.backend;
    }

    /**
     * Switch to a different backend (useful for testing)
     */
    switchBackend(backendType: 'rust' | 'mock'): void {
        this.backend.dispose();

        switch (backendType) {
            case 'rust':
                this.backend = new RustTauriBackend();
                break;
            case 'mock':
                this.backend = new MockBackend();
                break;
            default:
                throw new Error(`[SCMManager] Backend type '${backendType}' is not supported. Use 'rust' or 'mock'.`);
        }

        console.log(`[SCMManager] Switched to ${backendType} backend`);
    }

    /**
     * Dispose of all resources and cleanup
     */
    dispose(): void {
        this.backend.dispose();
    }
}

/**
 * Get the base commit for a worktree session
 * This is a standalone function that directly calls the Tauri command
 */
export async function getWorktreeBaseCommit(sessionId: string, projectRoot: string): Promise<string> {
    return await invoke<string>('get_worktree_base_commit', {
        sessionId: sessionId,
        projectRoot: projectRoot
    });
}
