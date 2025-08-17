import { supabase } from '@/lib/supabaseClient';
import { getWorktreeBaseCommit } from '@/services/scm/SCMManager';
import { isTauriEnvironment } from '@/services/scm/backends';
import { CheckpointService } from '@/services/checkpoints/CheckpointService';
import { makeCheckpointEvent } from '@/stores/eventReducer';
import { useEventStore } from '@/stores/eventStore';

import type { ChatHookContext } from '@/hooks/chatLifecycleHooks';

/**
 * Pre-chat hook that ensures a start checkpoint exists for the session
 * This hook runs before every chat message is sent
 */
export async function preEnsureStartCheckpoint(ctx: ChatHookContext): Promise<void> {
    const { sessionId, cwd } = ctx;

    try {
        // 1. Query chat_checkpoints for (sessionId, phase='start'); if exists, return
        const { data: existingCheckpoint, error: queryError } = await supabase
            .from('chat_checkpoints')
            .select('id')
            .eq('session_id', sessionId)
            .eq('phase', 'start')
            .single();
        console.log(`[preEnsureStartCheckpoint] Querying checkpoints for session ${sessionId}, with ctx: ${JSON.stringify(ctx)}`);

        if (queryError && queryError.code !== 'PGRST116') {
            // PGRST116 is "not found" error, which is expected if no checkpoint exists
            console.error('[preEnsureStartCheckpoint] Error querying checkpoints:', queryError);
            return;
        }

        if (existingCheckpoint) {
            // Start checkpoint already exists, nothing to do
            return;
        }

        // 2. Determine cwd from ctx.cwd; if absent, try CheckpointService.getSessionCwd
        let effectiveCwd = cwd;
        console.log(`[preEnsureStartCheckpoint] Determining cwd for session ${sessionId}, with ctx: ${JSON.stringify(ctx)}`);
        if (!effectiveCwd) {
            try {
                effectiveCwd = await CheckpointService.getSessionCwd(sessionId);
                console.log(`[preEnsureStartCheckpoint] Determined cwd for session ${sessionId}, with ctx: ${JSON.stringify(ctx)}`);
            } catch (error) {
                console.warn('[preEnsureStartCheckpoint] Could not determine session cwd:', error);
                return; // Can't create checkpoint without cwd
            }
        }

        if (!effectiveCwd) {
            console.warn('[preEnsureStartCheckpoint] No cwd available for session:', sessionId);
            return;
        }

        // 3. Optionally get base commit if available in a Tauri environment
        let baseCommit: string | null = null;
        if (isTauriEnvironment()) {
            try {
                baseCommit = await getWorktreeBaseCommit(sessionId, effectiveCwd);
            } catch (error) {
                console.warn('[preEnsureStartCheckpoint] Could not get base commit:', error);
                // Continue without base commit - we can still create a checkpoint
            }
        }

        // 4. Insert Supabase row: { session_id, phase:'start', commit_hash: baseCommit, stats:{ ... } }
        const checkpointData = {
            session_id: sessionId,
            phase: 'start' as const,
            commit_hash: baseCommit,
            stats: {
                filesChanged: 0,
                linesAdded: 0,
                linesRemoved: 0,
                fileList: []
            }
        };

        const { data: checkpoint, error: insertError } = await supabase.from('chat_checkpoints').insert(checkpointData).select().single();

        if (insertError) {
            console.error('[preEnsureStartCheckpoint] Error creating start checkpoint:', insertError);
            return;
        }

        // 5. Add event to store via makeCheckpointEvent
        if (checkpoint) {
            const checkpointEvent = makeCheckpointEvent(
                sessionId,
                Date.now(),
                'start',
                checkpoint.commit_hash ?? null,
                checkpoint.stats ?? {
                    filesChanged: 0,
                    linesAdded: 0,
                    linesRemoved: 0,
                    fileList: []
                }
            );
            useEventStore.getState().addEvent(checkpointEvent);
            console.log('[preEnsureStartCheckpoint] Created start checkpoint for session:', sessionId);
        }
    } catch (error) {
        console.error('[preEnsureStartCheckpoint] Unexpected error:', error);
        // Don't throw - hooks should not break chat flow
    }
}
