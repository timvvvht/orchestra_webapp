/**
 * CheckpointService - Global checkpoint management for chat sessions
 *
 * Listens to ACS Firehose SSE events and automatically creates checkpoints
 * for conversation start/end events. Persists checkpoints to Supabase and
 * adds them to the canonical event store for UI display.
 */

import { eventBus } from '@/services/acs/eventBus';
import { supabase } from '@/auth/SupabaseClient';
import { useEventStore } from '@/stores/eventStore';
import { makeCheckpointEvent } from '@/stores/eventReducer';
import { SCMManager } from '@/services/scm/SCMManager';
import { getDefaultACSClient } from '@/services/acs';

import type { SSEEvent } from '@/services/acs/shared/types';

type Phase = 'start' | 'end';

class CheckpointService {
    private seen = new Set<string>(); // Reserved for future use - currently relying on event store deduplication

    private sessionCwdCache = new Map<string, string>(); // Cache session CWDs

    private scmManager: SCMManager;

    constructor() {
        // Always force Rust backend in desktop builds
        this.scmManager = new SCMManager({
            forceBackend: 'rust', // guarantees Rust path
            allowMockFallback: false // never allow mock in prod
        });
        eventBus.on('sse', this.handleSse);
        console.log('🔄 [SCM] CheckpointService initialized and listening to SSE events');
    }

    private handleSse = async (ev: SSEEvent) => {
        if (!ev?.type || !ev.sessionId) return;

        const phase = this.mapEventToPhase(ev);
        if (!phase) return;

        // Remove session-level deduplication to allow multiple checkpoints per session/phase
        // The event store handles ID-based deduplication with unique UUIDs
        console.log(`🔄 [SCM] Processing ${phase} checkpoint for session ${ev.sessionId}`);

        // 1️⃣ optimistic local insert
        useEventStore.getState().addEvent(makeCheckpointEvent(ev.sessionId, Date.now(), phase, null));

        // Note: Database record will be created later when we have the commit hash
        // This allows multiple checkpoints per session/phase with unique commit hashes

        // 3️⃣ Handle SCM operations for both start and end
        if (phase === 'start') {
            await this.createStartCheckpoint(ev.sessionId);
        } else if (phase === 'end') {
            // End checkpoint logic moved to postChatCheckpoint hook
        }
    };



    /**
     * Get the session's actual working directory (agent_cwd)
     */
    private async getSessionCwd(sessionId: string): Promise<string | null> {
        // Check cache first
        if (this.sessionCwdCache.has(sessionId)) {
            const cachedCwd = this.sessionCwdCache.get(sessionId)!;
            console.log(`💾 [SCM] Using cached CWD for ${sessionId}: ${cachedCwd}`);
            return cachedCwd;
        }

        try {
            console.log(`🔍 [SCM] Fetching session CWD for session ${sessionId}`);
            const acsClient = getDefaultACSClient();
            const response = await acsClient.sessions.getSession(sessionId, {
                includeMessages: false // We only need session metadata, not messages
            });

            const agentCwd = response.data.agent_cwd;
            if (agentCwd && agentCwd.trim() !== '') {
                console.log(`✅ [SCM] Found session CWD for ${sessionId}: ${agentCwd}`);
                console.log(`📁 [SCM] Caching workspace path: ${sessionId} → ${agentCwd}`);
                this.sessionCwdCache.set(sessionId, agentCwd);
                return agentCwd;
            } else {
                console.warn(`⚠️ [SCM] No agent_cwd set for session ${sessionId} - session may not have workspace selected`);
                return null;
            }
        } catch (error) {
            console.error(`❌ [SCM] Failed to fetch session CWD for ${sessionId}:`, error);
            return null;
        }
    }

    /**
     * Map SSE event types to checkpoint phases
     */
    private mapEventToPhase(ev: SSEEvent): Phase | null {
        if (ev.type === 'agent_status' && ev.data?.status === 'session_active') return 'start';
        return null; // end handled by PostHookListener + hook system
    }

    /**
     * Create initial SCM checkpoint for conversation start
     */
    private async createStartCheckpoint(sessionId: string): Promise<void> {
        try {
            console.log(`🔍 [SCM] Creating start checkpoint for session ${sessionId}`);

            // Check if this session is running in a worktree
            const sessionCwd = await this.getSessionCwd(sessionId);
            if (!sessionCwd) {
                console.warn(`⚠️ [SCM] No agent_cwd found for session ${sessionId}, skipping checkpoint creation`);
                return;
            }

            // Use the REAL session working directory (worktree not required)
            const workspacePath = sessionCwd;

            console.log(`🎯 [SCM] Using REAL session workspace: ${workspacePath}`);
            console.log(`📂 [SCM] Creating Git repository in actual project directory (not temp!)`);

            // Note: Workspace directory creation is handled by the Rust backend
            // No need to create directories in the renderer process
            console.log(`📁 [SCM] Workspace directory will be created by Rust backend: ${workspacePath}`);

            // Ensure repository is initialized
            const hasRepo = await this.scmManager.hasRepository(workspacePath);
            if (!hasRepo) {
                console.log(`🔧 [SCM] Initializing Git repository at: ${workspacePath}`);
                await this.scmManager.initializeRepository(workspacePath);
                console.log(`✅ [SCM] Git repository initialized in real workspace`);
            } else {
                console.log(`✅ [SCM] Git repository already exists at: ${workspacePath}`);
            }

            // Create initial checkpoint commit
            console.log(`📝 [SCM] Creating initial commit in: ${workspacePath}`);
            const commitHash = await this.scmManager.checkpoint(workspacePath, '📌 Conversation started');

            console.log(`🎉 [SCM] Start checkpoint created successfully!`);
            console.log(`📊 [SCM] Commit hash: ${commitHash}`);
            console.log(`📂 [SCM] Repository location: ${workspacePath}`);

            // Create database record with commit hash (allows multiple checkpoints per session/phase)
            const { error } = await supabase.from('chat_checkpoints').insert({ 
                session_id: sessionId, 
                phase: 'start', 
                commit_hash: commitHash 
            });

            if (error) {
                console.error(`❌ [SCM] Failed to update start checkpoint with hash:`, error);
                return;
            }

            // Update the event store with commit hash
            const enrichedEvent = makeCheckpointEvent(sessionId, Date.now(), 'start', commitHash);

            useEventStore.getState().addEvent(enrichedEvent);

            console.log(`✅ [SCM] Start checkpoint enriched with commit hash for session ${sessionId}`);
        } catch (error) {
            console.error(`❌ [SCM] Failed to create start checkpoint for session ${sessionId}:`, error);
        }
    }





    /**
     * Clear seen cache (useful for testing)
     */
    clearSeenCache(): void {
        this.seen.clear();
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        eventBus.off('sse', this.handleSse);
        this.scmManager.dispose();
        this.seen.clear();
        this.sessionCwdCache.clear();
    }
}

// Create singleton instance
export const checkpointService = new CheckpointService();

// Export for testing
export { CheckpointService };
