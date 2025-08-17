/**
 * postChatCheckpoint.ts
 * 
 * Post-chat hook that creates an end checkpoint with SCM stats.
 * Runs only if the session cwd is a Git worktree.
 */

import { supabase } from '@/lib/supabaseClient';
import { SCMManager } from '@/services/scm/SCMManager';
import { calculateCommitStats } from '@/utils/scmStats';

import { makeCheckpointEvent } from '@/stores/eventReducer';
import { useEventStore } from '@/stores/eventStore';
import type { ChatHookContext } from '@/hooks/chatLifecycleHooks';

/**
 * postChatCheckpoint – Post-chat hook that creates an **end** checkpoint with SCM stats.
 * Runs only if the session cwd is a Git worktree.
 */
export async function postChatCheckpoint(ctx: ChatHookContext): Promise<void> {
  const { sessionId, cwd } = ctx;

  // DEBUG: Log the full context and args
  console.log('[postChatCheckpoint] DEBUG: Full context:', ctx);
  console.log('[postChatCheckpoint] DEBUG: sessionId:', sessionId);
  console.log('[postChatCheckpoint] DEBUG: cwd:', cwd);
  console.log('[postChatCheckpoint] DEBUG: sessionId type:', typeof sessionId);
  console.log('[postChatCheckpoint] DEBUG: cwd type:', typeof cwd);

  try {
    // 1️⃣ Determine working directory
    const workspacePath = cwd;
    if (!workspacePath) {
      console.warn('[postChatCheckpoint] ctx.cwd missing – skipping checkpoint');
      return;
    }

    // 2️⃣ Ensure repo + create end commit (worktree not required)
    const scm = new SCMManager({ forceBackend: 'rust', allowMockFallback: false });
    try {
      const hasRepo = await scm.hasRepository(workspacePath);
      console.log('[postChatCheckpoint] DEBUG: hasRepository result:', hasRepo);
      if (!hasRepo) {
        console.log('[postChatCheckpoint] DEBUG: Initializing repository...');
        await scm.initializeRepository(workspacePath);
      }

      const commitHash = await scm.checkpoint(workspacePath, '📌 Conversation ended');
      console.log('[postChatCheckpoint] DEBUG: Created end commitHash:', commitHash);

      // Failsafe: Ensure we have a valid commit hash
      if (!commitHash || typeof commitHash !== 'string' || commitHash.trim() === '') {
        console.error('[postChatCheckpoint] Invalid commit hash received:', commitHash);
        return;
      }

      // DEBUG: Fetch ALL checkpoints for this session to see the full picture
      const { data: allCheckpoints } = await supabase
        .from('chat_checkpoints')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      console.log('[postChatCheckpoint] DEBUG: All checkpoints for session:', allCheckpoints);

      // 4️⃣ Get most recent checkpoint (any phase) for diff
      const { data: lastRows } = await supabase
        .from('chat_checkpoints')
        .select('commit_hash')
        .eq('session_id', sessionId)
        .not('commit_hash', 'is', null)        // ⚠️ filter out null hashes
        .order('created_at', { ascending: false }) // most-recent first
        .limit(1);

      // DEBUG: Print what was fetched
      console.log('[postChatCheckpoint] DEBUG: Fetched lastRows:', lastRows);
      console.log('[postChatCheckpoint] DEBUG: Current commitHash:', commitHash);

      // Default stats
      let stats = { filesChanged: 0, linesAdded: 0, linesRemoved: 0, fileList: [] as string[] };

      // If we have a previous checkpoint, compare against it
      const baseHash = lastRows?.[0]?.commit_hash || null;

      // Failsafe: Ensure baseHash is valid if it exists
      if (baseHash && (typeof baseHash !== 'string' || baseHash.trim() === '')) {
        console.warn('[postChatCheckpoint] Invalid baseHash found:', baseHash, '- treating as no previous checkpoint');
        // Continue without baseHash comparison
      } else if (baseHash && baseHash === commitHash) {
        console.log('[postChatCheckpoint] No changes since last checkpoint — skipping insert');
        return;
      }

      if (baseHash && typeof baseHash === 'string' && baseHash.trim() !== '') {
        console.log('[postChatCheckpoint] Attempting diff between', baseHash, 'and', commitHash);
        const diff = await scm.diff(workspacePath, baseHash, commitHash);
        stats = await calculateCommitStats(diff);

        // If diff is empty by stats, skip creating a new checkpoint
        if (
          (stats.filesChanged ?? 0) === 0 &&
          (stats.linesAdded ?? 0) === 0 &&
          (stats.linesRemoved ?? 0) === 0
        ) {
          console.log('[postChatCheckpoint] Empty diff vs last checkpoint — skipping insert');
          return;
        }
      } else {
        console.log('[postChatCheckpoint] No previous checkpoint — inserting end checkpoint to start chain');
      }

      // 5️⃣ Persist end checkpoint row
      const { error } = await supabase.from('chat_checkpoints').insert({
        session_id: sessionId,
        phase: 'end',
        commit_hash: commitHash,
        stats
      });
      if (error) console.error('[postChatCheckpoint] Supabase insert failed:', error);

      // 6️⃣ Emit enriched event to store
      useEventStore.getState().addEvent(
        makeCheckpointEvent(sessionId, Date.now(), 'end', commitHash, stats)
      );
    } finally {
      scm.dispose();
    }
  } catch (err) {
    console.error('[postChatCheckpoint] Unexpected failure:', err);
  }
}
