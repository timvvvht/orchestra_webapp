// /Users/tim/Code/orchestra/src/stores/pendingToolsStore.ts
// -----------------------------------------------------------------------------
// Zustand store for Pending Local Tool Approvals (Browser-Only MVP)
// -----------------------------------------------------------------------------
// Responsibilities:
//   1. Track jobs (tool calls) awaiting user approval.
//   2. Persist those jobs + per-tool preferences to localStorage.
//   3. Provide actions for enqueue / approve / reject / dequeueApproved.
//   4. Provide action for updating user Preference for each sensitive tool.
//   5. Broadcast changes across tabs via the `storage` event -> `rehydrate()`.
// -----------------------------------------------------------------------------

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { SensitiveTool } from "@/config/approvalTools";

// ---------------------------
// Types / Interfaces
// ---------------------------
export interface PendingJob {
  id: string; // The job_id from JobInstruction (unique per call)
  tool: SensitiveTool; // Tool name (subset)
  sse: any; // Raw SSE payload blob (opaque to the store)
  createdAt: number; // UNIX ms timestamp
  status: "waiting" | "approved" | "rejected";
}

export type Preference = "always" | "never" | "ask";

interface PendingToolsState {
  jobs: Record<string, PendingJob>;
  prefs: Record<SensitiveTool, Preference>;

  // --- Actions ---
  enqueue: (job: PendingJob) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
  dequeueApproved: () => PendingJob | undefined;
  dequeueRejected: () => PendingJob | undefined;
  setPref: (tool: SensitiveTool, pref: Preference) => void;

  // Debug methods
  clearAllJobs: () => void;

  // Internal helper for pruning stale jobs (optional V1) – not used yet
  _pruneExpired: (ttlMs?: number) => void;
}

// ---------------------------
// Implementation
// ---------------------------
export const usePendingToolsStore = create<PendingToolsState>()(
  // Wrap with both subscribeWithSelector (for orchestrator) and persist
  subscribeWithSelector(
    persist(
      (set, get) => ({
        jobs: {},
        prefs: {
          str_replace_editor: "ask",
          cp: "ask",
          mv: "ask",
          execute_in_runner_session: "ask",
        },

        // Add new job (status: waiting)
        enqueue: (job) => {
          set((state) => ({
            jobs: {
              ...state.jobs,
              [job.id]: job,
            },
          }));
        },

        // Mark job approved
        approve: (id) => {
          console.log("🏪 [Store] approve() called for job:", id);
          set((state) => {
            if (!state.jobs[id]) {
              console.log("🏪 [Store] Job not found:", id);
              return state;
            }
            console.log("🏪 [Store] Marking job as approved:", id);
            return {
              jobs: {
                ...state.jobs,
                [id]: {
                  ...state.jobs[id],
                  status: "approved",
                },
              },
            };
          });
        },

        // Mark job rejected
        reject: (id) => {
          console.log("🏪 [Store] reject() called for job:", id);
          set((state) => {
            if (!state.jobs[id]) {
              console.log("🏪 [Store] Job not found:", id);
              return state;
            }
            console.log("🏪 [Store] Marking job as rejected:", id);
            return {
              jobs: {
                ...state.jobs,
                [id]: {
                  ...state.jobs[id],
                  status: "rejected",
                },
              },
            };
          });
        },

        // Pop first approved job (FIFO by createdAt) – orchestrator will call
        dequeueApproved: () => {
          const { jobs } = get();
          const approvedJobs = Object.values(jobs)
            .filter((j) => j.status === "approved")
            .sort((a, b) => a.createdAt - b.createdAt);
          if (approvedJobs.length === 0) return undefined;
          const first = approvedJobs[0];
          set((state) => {
            const newJobs = { ...state.jobs };
            delete newJobs[first.id];
            return { jobs: newJobs };
          });
          return first;
        },

        // Pop first rejected job (FIFO by createdAt) – orchestrator will call
        dequeueRejected: () => {
          const { jobs } = get();
          const rejectedJobs = Object.values(jobs)
            .filter((j) => j.status === "rejected")
            .sort((a, b) => a.createdAt - b.createdAt);
          if (rejectedJobs.length === 0) return undefined;
          const first = rejectedJobs[0];
          set((state) => {
            const newJobs = { ...state.jobs };
            delete newJobs[first.id];
            return { jobs: newJobs };
          });
          return first;
        },

        // Update per-tool preference
        setPref: (tool, pref) => {
          set((state) => ({
            prefs: {
              ...state.prefs,
              [tool]: pref,
            },
          }));
        },

        // Clear all jobs
        clearAllJobs: () => {
          set({
            jobs: {},
            prefs: {
              str_replace_editor: "ask",
              cp: "ask",
              mv: "ask",
              execute_in_runner_session: "ask",
            },
          });
        },

        // (Optional) Remove jobs older than TTL (default 24h)
        _pruneExpired: (ttlMs = 24 * 60 * 60 * 1000) => {
          const threshold = Date.now() - ttlMs;
          set((state) => {
            const newJobs: Record<string, PendingJob> = {};
            for (const [id, job] of Object.entries(state.jobs)) {
              if (job.createdAt >= threshold) newJobs[id] = job;
            }
            return { jobs: newJobs };
          });
        },
      }),
      {
        name: "pending-tools-store",
        // Persist only jobs & prefs (entire state)
        partialize: (state) => ({ jobs: state.jobs, prefs: state.prefs }),
      }
    )
  )
);

// ---------------------------
// Cross-Tab Sync (rehydrate on storage event)
// ---------------------------
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "pending-tools-store") {
      // Trigger Zustand rehydrate – this ensures all tabs share the latest state
      usePendingToolsStore.persist.rehydrate();
    }
  });
}
