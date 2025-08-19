/**
 * historyBridge.ts - Supabase history → EventStore bridge
 *
 * Loads historical chat messages from Supabase and feeds them
 * into the canonical event store for unified processing.
 */

import { mapBatch } from "@/adapters/RowMapper";
import { useEventStore } from "../eventStore";
import { getRecentMessagesForSession } from "@/services/supabase/chatMessageService";
import { supabase } from "@/auth/SupabaseClient";
import { makeCheckpointEvent } from "@/stores/eventReducer";
import { CanonicalEvent } from "@/types/events";

/**
 * Hydrates the event store with historical messages from a session using pagination
 */
export async function hydrateSession(sessionId: string): Promise<void> {
  // Feature flag check
  const isEnabled =
    import.meta.env.VITE_CANONICAL_STORE === "1" ||
    import.meta.env.VITE_CANONICAL_STORE === "true";

  // Hydration debug probe - Feature flag tracking
  import("@/utils/hydroDebug").then(({ pushHydro }) => {
    pushHydro("DB", {
      source: "hydrateSession",
      sessionId,
      featureFlag: import.meta.env.VITE_CANONICAL_STORE,
      isEnabled,
      action: isEnabled ? "proceeding" : "skipping",
    });
  });

  if (!isEnabled) {
    console.log("[HistoryBridge] Skipped hydration (feature flag disabled)");
    return;
  }

  try {
    console.log(`[HistoryBridge] Loading history for session: ${sessionId}`);

    const PAGE_SIZE = 500;
    let totalEvents = 0;
    let cursor: string | undefined;
    let hasMore = true;

    let offset = 0;

    while (hasMore) {
      // Fetch raw messages directly from Supabase
      console.log(`[HistoryBridge] Fetching raw messages from Supabase...`);

      const { data: rawRows, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("[HistoryBridge] Error fetching messages:", error);
        throw error;
      }

      console.log(
        `[HistoryBridge] Fetched ${rawRows?.length || 0} raw messages from Supabase`
      );

      // Hydration debug probe - DB stage
      if (rawRows && rawRows.length > 0) {
        import("@/utils/hydroDebug").then(({ pushHydro }) => {
          pushHydro("DB", {
            sessionId,
            rowCount: rawRows.length,
            firstRow: rawRows[0],
          });
        });
      }

      if (!rawRows || rawRows.length === 0) {
        console.log("[HistoryBridge] No more messages found");
        break;
      }

      console.log(`[HistoryBridge] First raw row:`, rawRows[0]);

      // Convert to canonical events
      console.log(
        `[HistoryBridge] Converting ${rawRows.length} messages to canonical events...`
      );
      let canonicalEvents;
      try {
        canonicalEvents = mapBatch(rawRows as any[]);
        console.log(
          `[HistoryBridge] Converted to ${canonicalEvents.length} canonical events`
        );
        if (canonicalEvents.length > 0) {
          console.log(
            `[HistoryBridge] First canonical event:`,
            canonicalEvents[0]
          );
        }
      } catch (error) {
        console.error(`[HistoryBridge] Error in mapBatch:`, error);
        throw error;
      }

      // Add to event store
      const store = useEventStore.getState();
      console.log(`[HistoryBridge] Store state before adding:`, {
        eventCount: store.byId.size,
        sessionCount: store.bySession.size,
      });

      store.addEvents(canonicalEvents);

      console.log(`[HistoryBridge] Store state after adding:`, {
        eventCount: store.byId.size,
        sessionCount: store.bySession.size,
      });

      totalEvents += canonicalEvents.length;
      console.log(
        `[HistoryBridge] Processed page: ${rawRows.length} messages → ${canonicalEvents.length} events (total: ${totalEvents})`
      );

      // Check if we have more pages
      hasMore = rawRows.length === PAGE_SIZE;
      if (hasMore) {
        offset += PAGE_SIZE;
      }
    }

    // Load checkpoint events for this session
    await hydrateCheckpoints(sessionId);

    console.log(
      `[HistoryBridge] ✅ Hydrated session ${sessionId} with ${totalEvents} total events`
    );
  } catch (error) {
    console.error("[HistoryBridge] Failed to hydrate session:", error);
    throw error;
  }
}

/**
 * Hydrates checkpoint events for a session from Supabase
 */
async function hydrateCheckpoints(sessionId: string): Promise<void> {
  try {
    console.log(
      `[HistoryBridge] Loading checkpoints for session: ${sessionId}`
    );

    const { data: checkpoints, error } = await supabase
      .from("chat_checkpoints")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[HistoryBridge] Error fetching checkpoints:", error);
      return; // Don't throw - checkpoints are optional
    }

    if (!checkpoints || checkpoints.length === 0) {
      console.log("[HistoryBridge] No checkpoints found for session");
      return;
    }

    console.log(`[HistoryBridge] Found ${checkpoints.length} checkpoints`);

    // Debug: Log checkpoint data
    checkpoints.forEach((checkpoint, index) => {
      console.log(`[HistoryBridge] Checkpoint ${index}:`, {
        phase: checkpoint.phase,
        commit_hash: checkpoint.commit_hash,
        stats: checkpoint.stats,
        statsType: typeof checkpoint.stats,
        fileListLength: checkpoint.stats?.fileList?.length || 0,
        fileList: checkpoint.stats?.fileList,
      });
    });

    // Filter out checkpoints without commit hash (pointless to display)
    const checkpointsWithHash = checkpoints.filter((checkpoint) => {
      if (!checkpoint.commit_hash) {
        console.log(
          `[HistoryBridge] ✂️ Skipping checkpoint without commit hash: ${checkpoint.phase} - ${new Date(checkpoint.created_at).toISOString()}`
        );
        return false;
      }
      return true;
    });

    // Sort by creation time
    const sortedCheckpoints = [...checkpointsWithHash].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Filter out redundant checkpoints (same commit hash as most recent checkpoint)
    const filteredCheckpoints = [];
    let mostRecentCommitHash: string | null = null;

    console.log(
      `[HistoryBridge] Processing ${sortedCheckpoints.length} checkpoints with commit hashes:`
    );
    sortedCheckpoints.forEach((cp, i) => {
      console.log(
        `  ${i}: ${cp.phase} - ${cp.commit_hash.slice(0, 8)} - ${new Date(cp.created_at).toISOString()}`
      );
    });

    for (const checkpoint of sortedCheckpoints) {
      console.log(
        `[HistoryBridge] Processing ${checkpoint.phase} checkpoint ${checkpoint.commit_hash.slice(0, 8)}, mostRecentCommitHash: ${
          mostRecentCommitHash?.slice(0, 8) || "none"
        }`
      );

      if (checkpoint.commit_hash === mostRecentCommitHash) {
        console.log(
          `[HistoryBridge] ✂️ Skipping redundant ${checkpoint.phase} checkpoint ${checkpoint.commit_hash.slice(0, 8)} (same as most recent)`
        );
        continue;
      }

      console.log(
        `[HistoryBridge] ✅ Keeping ${checkpoint.phase} checkpoint ${checkpoint.commit_hash.slice(0, 8)}`
      );
      filteredCheckpoints.push(checkpoint);
      mostRecentCommitHash = checkpoint.commit_hash;
      if (mostRecentCommitHash)
        console.log(
          `[HistoryBridge] 📝 Updated mostRecentCommitHash to ${mostRecentCommitHash.slice(0, 8)}`
        );
    }

    console.log(
      `[HistoryBridge] Filtered ${checkpoints.length} checkpoints to ${filteredCheckpoints.length} non-redundant ones with commit hashes`
    );

    // Convert filtered checkpoints to canonical events
    const checkpointEvents = filteredCheckpoints.map((checkpoint) => {
      return makeCheckpointEvent(
        sessionId,
        new Date(checkpoint.created_at).getTime(),
        checkpoint.phase as "start" | "end",
        checkpoint.commit_hash,
        checkpoint.stats
      );
    });

    // Add to event store
    const store = useEventStore.getState();
    store.addEvents(checkpointEvents);

    console.log(
      `[HistoryBridge] ✅ Hydrated ${checkpointEvents.length} checkpoint events`
    );
  } catch (error) {
    console.error("[HistoryBridge] Failed to hydrate checkpoints:", error);
    // Don't throw - checkpoints are optional
  }
}

/**
 * Hydrates multiple sessions (for bulk loading)
 */
export async function hydrateSessions(sessionIds: string[]): Promise<void> {
  const isEnabled =
    import.meta.env.VITE_CANONICAL_STORE === "1" ||
    import.meta.env.VITE_CANONICAL_STORE === "true";
  if (!isEnabled) {
    console.log(
      "[HistoryBridge] Skipped bulk hydration (feature flag disabled)"
    );
    return;
  }

  console.log(`[HistoryBridge] Bulk hydrating ${sessionIds.length} sessions`);

  const results = await Promise.allSettled(
    sessionIds.map((sessionId) => hydrateSession(sessionId))
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(
    `[HistoryBridge] Bulk hydration complete: ${successful} successful, ${failed} failed`
  );

  if (failed > 0) {
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason);
    console.warn("[HistoryBridge] Bulk hydration errors:", errors);
  }
}

/**
 * Clears all historical events from the store
 */
export function clearHistory(): void {
  const isEnabled =
    import.meta.env.VITE_CANONICAL_STORE === "1" ||
    import.meta.env.VITE_CANONICAL_STORE === "true";
  if (!isEnabled) {
    console.log("[HistoryBridge] Skipped clear (feature flag disabled)");
    return;
  }

  const store = useEventStore.getState();
  store.clearAll();
  console.log("[HistoryBridge] ✅ Cleared all historical events");
}

/**
 * Gets hydration status for debugging
 */
export function getHydrationStatus() {
  const isEnabled =
    import.meta.env.VITE_CANONICAL_STORE === "1" ||
    import.meta.env.VITE_CANONICAL_STORE === "true";
  if (!isEnabled) {
    return { enabled: false, eventCount: 0, lastEventId: "" };
  }

  const store = useEventStore.getState();
  return {
    enabled: true,
    eventCount: store.getEventCount(),
    lastEventId: store.getLastEventId(),
    debugInfo: store.getDebugInfo(),
  };
}
