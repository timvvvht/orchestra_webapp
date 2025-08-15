import { create } from "zustand";
import { sortSessionsByActivity, getSessionTimestamp } from "@/utils/time";
import { type Plan, type PlanProgress } from "@/types/plans";
import { analyzePlanProgressDetailed } from "@/utils/planProgress";
import { type ParsedPlanResult } from "@/utils/plan";
import { baseDirFromCwd } from "@/utils/pathHelpers";
import { type GitStatusCounts } from "@/utils/gitHelpers";
// import { supabase } from "@/auth/SupabaseClient";

// LocalStorage key for read state persistence
const LS_KEY = "mc_read_state_v1";
// LocalStorage key for processing order persistence
const LS_PROCESSING_ORDER = "mc_processing_order_v1";

// Load read state from localStorage
const loadReadMap = (): Record<string, boolean> => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Save read state to localStorage
const saveReadMap = (readMap: Record<string, boolean>) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(readMap));
  } catch (error) {
    console.error("Failed to save read state to localStorage:", error);
  }
};

// Load processing order from localStorage
const loadProcessingOrder = (): string[] => {
  try {
    const raw = localStorage.getItem(LS_PROCESSING_ORDER);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

// Save processing order to localStorage
const saveProcessingOrder = (ids: string[]) => {
  try {
    localStorage.setItem(LS_PROCESSING_ORDER, JSON.stringify(ids));
  } catch (error) {
    console.error("Failed to save processing order to localStorage:", error);
  }
};

export interface MissionControlAgent {
  id: string;
  mission_title: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  agent_config_name: string | null;
  model_id: string | null;
  latest_message_id: string | null;
  latest_message_role: string | null;
  latest_message_content: any | null;
  latest_message_timestamp: string | null;
  agent_cwd: string | null;
  base_dir: string | null; // Base directory for worktree-aware filtering and display
  archived_at: string | null;
  isPending?: boolean; // Flag for sessions that are still being created/confirmed
  backgroundProcessing?: boolean; // Flag for sessions with background operations in progress
  isFinalized?: boolean; // Session worktree pruned; read-only
}

export type ViewMode = "active" | "archived";

export interface CollapsedGroups {
  processing: boolean;
  idleUnread: boolean;
  idleRead: boolean;
  drafts: boolean;
}

interface MissionControlState {
  // Data
  sessions: MissionControlAgent[];
  plans: Record<string, Plan>; // key = session_id
  planProgress: Record<string, PlanProgress>; // key = session_id
  gitStatus: Record<string, GitStatusCounts>; // key = cwd -> git status counts
  gitStatusErrors: Record<string, string>; // key = cwd -> error message

  // Read state tracking
  readMap: Record<string, boolean>; // session_id -> read (true) / unread (false)

  // Stable ordering for processing bucket
  processingOrder: string[]; // session IDs in stable order of entry into processing

  // UI State
  viewMode: ViewMode;
  selectedSession: string | null;
  cwdFilter: string | null;
  collapsedGroups: CollapsedGroups;

  // Modal State
  showNewDraftModal: boolean;
  initialDraftCodePath: string | null; // Prefill code path for NewDraftModal

  // Plan refetch callback
  planRefetchCallback: (() => void) | null;

  // Session refetch callback
  sessionRefetchCallback: (() => Promise<void>) | null;

  // Per-session plan refetch
  refetchSinglePlan: (sessionId: string) => Promise<void>;

  // Ambient indicator state
  lastCheckpointSaved: string | null;
  isAutoSaving: boolean;

  // Actions
  setSessions: (sessions: MissionControlAgent[]) => void;
  updateSession: (
    sessionId: string,
    updates: Partial<MissionControlAgent>
  ) => void;
  setBackgroundProcessing: (sessionId: string, flag: boolean) => void;
  setPlans: (plans: Plan[]) => void;
  setPlanRefetchCallback: (callback: (() => void) | null) => void;
  refetchPlans: () => void;
  setSessionRefetchCallback: (callback: (() => Promise<void>) | null) => void;
  refetchSessions: () => Promise<void>;
  patchPlanFromToolResult: (
    sessionId: string,
    parsed: ParsedPlanResult
  ) => void;
  setGitStatus: (cwd: string, counts: GitStatusCounts) => void;
  setGitStatusError: (cwd: string, error: string | undefined) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedSession: (sessionId: string | null) => void;
  setCwdFilter: (cwd: string | null) => void;
  toggleGroupCollapsed: (group: keyof CollapsedGroups) => void;
  setShowNewDraftModal: (show: boolean) => void;
  setInitialDraftCodePath: (path: string | null) => void;

  // Read state actions
  markSessionRead: (sessionId: string) => void;
  markSessionUnread: (sessionId: string) => void;
  isSessionUnread: (sessionId: string) => boolean;

  // Processing order actions
  ensureInProcessingOrder: (sessionId: string) => void;
  removeFromProcessingOrder: (sessionId: string) => void;
  reconcileProcessingOrder: () => void;

  // Ambient indicator actions
  setLastCheckpointSaved: (timestamp: string | null) => void;
  setIsAutoSaving: (saving: boolean) => void;

  // Computed getters
  getFilteredSessions: () => MissionControlAgent[];
  getSortedSessions: () => MissionControlAgent[];
  getGroupedSessions: () => {
    processing: MissionControlAgent[];
    idle: MissionControlAgent[];
  };
  getSelectedAgentCwd: () => string | null;
}

export const useMissionControlStore = create<MissionControlState>(
  (set, get) => {
    // Load initial state with backwards compatibility for collapsedGroups
    const loadInitialState = () => {
      const baseState = {
        sessions: [] as MissionControlAgent[],
        plans: {} as Record<string, Plan>,
        planProgress: {} as Record<string, PlanProgress>,
        gitStatus: {} as Record<string, GitStatusCounts>,
        gitStatusErrors: {} as Record<string, string>,
        readMap: loadReadMap(), // Load from localStorage on init
        processingOrder: loadProcessingOrder(), // Load stable processing order
        viewMode: "active" as ViewMode,
        selectedSession: null as string | null,
        cwdFilter: null as string | null,
        collapsedGroups: {
          processing: false,
          idleUnread: false,
          idleRead: false,
          drafts: false,
        },
        showNewDraftModal: false,
        initialDraftCodePath: null,
        planRefetchCallback: null as (() => void) | null,
        sessionRefetchCallback: null as (() => Promise<void>) | null,
        lastCheckpointSaved: null as string | null,
        isAutoSaving: false,
      };

      // Backwards compatibility: if old 'idle' state exists in localStorage, migrate it
      try {
        const saved = localStorage.getItem("mc_collapsed_groups_v1");
        if (saved) {
          const oldState = JSON.parse(saved);
          if (typeof oldState.idle === "boolean") {
            // Migrate old 'idle' state to both new keys
            baseState.collapsedGroups.idleUnread = oldState.idle;
            baseState.collapsedGroups.idleRead = oldState.idle;
            // Clear old state to prevent future migrations
            localStorage.removeItem("mc_collapsed_groups_v1");
          }
        }
      } catch (error) {
        console.warn("Failed to migrate collapsed groups state:", error);
      }

      return baseState;
    };

    return {
      // Initial state
      ...loadInitialState(),

      // Actions
      setSessions: (sessions) => {
        set({ sessions });
        // Reconcile processingOrder to remove IDs not present anymore
        set((state) => {
          const validIds = new Set(sessions.map((s) => s.id));
          const pruned = state.processingOrder.filter((id) => validIds.has(id));
          if (pruned.length !== state.processingOrder.length) {
            saveProcessingOrder(pruned);
          }
          return { processingOrder: pruned };
        });
      },

      updateSession: (sessionId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, ...updates } : session
          ),
        })),

      setBackgroundProcessing: (sessionId, flag) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, backgroundProcessing: flag }
              : session
          ),
        })),

      setPlans: (plans) =>
        set(() => {
          console.log("[plan] setPlans called with:", plans);

          // Convert plans array to session_id keyed objects
          const plansMap = plans.reduce(
            (acc, plan) => {
              acc[plan.session_id] = plan;
              return acc;
            },
            {} as Record<string, Plan>
          );

          // Calculate progress for each plan
          const progressMap = plans.reduce(
            (acc, plan) => {
              const progress = analyzePlanProgressDetailed(plan.markdown);
              acc[plan.session_id] = progress;
              console.log(
                `[plan] Calculated progress for session ${plan.session_id}:`,
                progress
              );
              return acc;
            },
            {} as Record<string, PlanProgress>
          );

          // console.log('[plan] Final plans map stored in state:', plansMap);
          // console.log('[plan] Final progress map stored in state:', progressMap);

          return {
            plans: plansMap,
            planProgress: progressMap,
          };
        }),

      setPlanRefetchCallback: (callback) =>
        set((state) =>
          state.planRefetchCallback === callback
            ? state
            : { planRefetchCallback: callback }
        ),

      refetchPlans: () => {
        const { planRefetchCallback } = get();
        if (planRefetchCallback) {
          console.log("[plan] Triggering plan refetch via callback");
          planRefetchCallback();
        } else {
          console.warn("[plan] No plan refetch callback available");
        }
      },

      setSessionRefetchCallback: (callback) =>
        set((state) =>
          state.sessionRefetchCallback === callback
            ? state
            : { sessionRefetchCallback: callback }
        ),

      refetchSessions: async () => {
        const { sessionRefetchCallback } = get();
        if (sessionRefetchCallback) {
          console.log("[session] Triggering session refetch via callback");
          await sessionRefetchCallback();
        } else {
          console.warn("[session] No session refetch callback available");
        }
      },

      refetchSinglePlan: async (sessionId) => {
        if (!sessionId) return;
        try {
          const { data: plan, error } = await supabase
            .from("plans")
            .select(
              "id, session_id, title, status, markdown, current_version, created_at, updated_at"
            )
            .eq("session_id", sessionId)
            .maybeSingle();
          if (error) {
            console.warn("[plan] Single fetch error:", error);
            return;
          }
          if (!plan) {
            console.warn("[plan] No plan for session", sessionId);
            return;
          }
          const progress = analyzePlanProgressDetailed(plan.markdown);
          set((state) => ({
            plans: { ...state.plans, [sessionId]: plan },
            planProgress: { ...state.planProgress, [sessionId]: progress },
          }));
          console.log(
            `[plan] Single plan refetch complete for session ${sessionId}`
          );
        } catch (e) {
          console.error("[plan] Single fetch exception:", e);
        }
      },

      patchPlanFromToolResult: (sessionId: string, parsed: ParsedPlanResult) =>
        set((state) => {
          console.log(
            `[plan] Patching plan for session ${sessionId} with:`,
            parsed
          );

          const currentPlan = state.plans[sessionId];
          if (!currentPlan) {
            console.warn(
              `[plan] No existing plan found for session ${sessionId}, skipping patch`
            );
            return state;
          }

          // Create a patched plan by updating the markdown
          let updatedMarkdown = currentPlan.markdown;

          // If we have a completed task, mark it as done in the markdown
          if (parsed.todo_id && parsed.completed_task) {
            // Simple approach: replace the todo line with a checked version
            const todoPattern = new RegExp(
              `- \\[ \\] (.*)<!-- id:${parsed.todo_id} -->`,
              "g"
            );
            updatedMarkdown = updatedMarkdown.replace(
              todoPattern,
              `- [x] $1<!-- id:${parsed.todo_id} checked_by:assistant -->`
            );
          }

          // If we have next_todos, we could potentially add them, but for now we'll rely on the backend
          // to provide the complete updated plan via refetch

          const updatedPlan: Plan = {
            ...currentPlan,
            markdown: updatedMarkdown,
            current_version: parsed.version || currentPlan.current_version,
          };

          // Recalculate progress for this plan
          const updatedProgress = analyzePlanProgressDetailed(updatedMarkdown);

          console.log(
            "[UI-SSE][planPatched]",
            "session=",
            sessionId,
            "newProgress=",
            updatedProgress
          );

          return {
            plans: {
              ...state.plans,
              [sessionId]: updatedPlan,
            },
            planProgress: {
              ...state.planProgress,
              [sessionId]: updatedProgress,
            },
          };
        }),

      setGitStatus: (cwd, counts) =>
        set((state) => ({
          gitStatus: {
            ...state.gitStatus,
            [cwd]: counts,
          },
        })),

      setGitStatusError: (cwd, error) =>
        set((state) => {
          const newErrors = { ...state.gitStatusErrors };
          if (error) {
            newErrors[cwd] = error;
          } else {
            delete newErrors[cwd];
          }
          return { gitStatusErrors: newErrors };
        }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setSelectedSession: (sessionId) => set({ selectedSession: sessionId }),

      setCwdFilter: (cwd) => set({ cwdFilter: cwd }), // Note: cwd param now stores base_dir values

      toggleGroupCollapsed: (group) =>
        set((state) => ({
          collapsedGroups: {
            ...state.collapsedGroups,
            [group]: !state.collapsedGroups[group],
          },
        })),

      setShowNewDraftModal: (show) => set({ showNewDraftModal: show }),

      setInitialDraftCodePath: (path) => set({ initialDraftCodePath: path }),

      // Read state actions
      markSessionRead: (sessionId) =>
        set((state) => {
          const wasUnread = state.readMap[sessionId] !== true;
          const updatedReadMap = { ...state.readMap, [sessionId]: true };
          saveReadMap(updatedReadMap);
          if (wasUnread) {
            console.log("[UI] Session manually marked as READ:", sessionId);
          }
          return { readMap: updatedReadMap };
        }),

      markSessionUnread: (sessionId) =>
        set((state) => {
          const wasRead = state.readMap[sessionId] === true;
          const updatedReadMap = { ...state.readMap, [sessionId]: false };
          saveReadMap(updatedReadMap);
          if (wasRead) {
            console.log("[UI] Session manually marked as UNREAD:", sessionId);
          }
          return { readMap: updatedReadMap };
        }),

      isSessionUnread: (sessionId) => {
        const readMap = get().readMap;
        // If session is not in readMap, it's unread (default state)
        return readMap[sessionId] !== true;
      },

      // Processing order actions
      ensureInProcessingOrder: (sessionId: string) =>
        set((state) => {
          if (state.processingOrder.includes(sessionId))
            return {} as Partial<MissionControlState>;
          const updated = [...state.processingOrder, sessionId];
          saveProcessingOrder(updated);
          console.log(
            "[UI] Session added to processing order:",
            sessionId,
            `(position: ${updated.length})`
          );
          return { processingOrder: updated };
        }),

      removeFromProcessingOrder: (sessionId: string) =>
        set((state) => {
          if (!state.processingOrder.includes(sessionId))
            return {} as Partial<MissionControlState>;
          const updated = state.processingOrder.filter(
            (id) => id !== sessionId
          );
          saveProcessingOrder(updated);
          console.log("[UI] Session removed from processing order:", sessionId);
          return { processingOrder: updated };
        }),

      reconcileProcessingOrder: () =>
        set((state) => {
          const validIds = new Set(state.sessions.map((s) => s.id));
          const updated = state.processingOrder.filter((id) =>
            validIds.has(id)
          );
          if (updated.length !== state.processingOrder.length) {
            saveProcessingOrder(updated);
            return { processingOrder: updated };
          }
          return {} as Partial<MissionControlState>;
        }),

      // Ambient indicator actions
      setLastCheckpointSaved: (timestamp: string | null) =>
        set({ lastCheckpointSaved: timestamp }),

      setIsAutoSaving: (saving: boolean) => set({ isAutoSaving: saving }),

      // Computed getters
      getFilteredSessions: () => {
        const { sessions, cwdFilter } = get();
        return sessions.filter(
          (session) =>
            !cwdFilter ||
            (session.base_dir ?? baseDirFromCwd(session.agent_cwd)) ===
              cwdFilter
        );
      },

      getSortedSessions: () => {
        const filteredSessions = get().getFilteredSessions();
        return sortSessionsByActivity(filteredSessions);
      },

      getGroupedSessions: () => {
        const filteredSessions = get().getFilteredSessions();

        // Define processing statuses
        const processingStatuses = [
          "working",
          "awaiting",
          "creating",
          "processing",
        ];

        const groups = {
          processing: [] as MissionControlAgent[],
          idle: [] as MissionControlAgent[],
        };

        filteredSessions.forEach((session) => {
          // Check if session is actively processing
          if (
            processingStatuses.includes(session.status) ||
            session.latest_message_role === "tool_call"
          ) {
            groups.processing.push(session);
          }
          // Everything else is idle (completed, error, idle, waiting for user input, etc.)
          else {
            groups.idle.push(session);
          }
        });

        // Stable order for processing group using processingOrder
        const { processingOrder } = get();
        const processingSet = new Set(groups.processing.map((s) => s.id));
        const orderedFromState = processingOrder.filter((id) =>
          processingSet.has(id)
        );
        const knownSet = new Set(orderedFromState);
        const newOnes = groups.processing.filter((s) => !knownSet.has(s.id));
        // Deterministic append for any new processing sessions not yet tracked
        newOnes.sort(
          (a, b) =>
            getSessionTimestamp(a).getTime() - getSessionTimestamp(b).getTime()
        ); // oldest first
        const finalProcessing: MissionControlAgent[] = [
          ...orderedFromState
            .map((id) => groups.processing.find((s) => s.id === id)!)
            .filter(Boolean),
          ...newOnes,
        ];
        groups.processing = finalProcessing;

        // Sort idle sessions with priority for unread final assistant messages
        const { isSessionUnread } = get();
        groups.idle.sort((a, b) => {
          const aIsUnread = isSessionUnread(a.id);
          const bIsUnread = isSessionUnread(b.id);
          const aIsFinalAssistant =
            a.latest_message_role === "assistant" ||
            a.latest_message_role === "session_end";
          const bIsFinalAssistant =
            b.latest_message_role === "assistant" ||
            b.latest_message_role === "session_end";

          // Priority 1: Unread final assistant messages go to the very top
          const aIsUnreadFinal = aIsUnread && aIsFinalAssistant;
          const bIsUnreadFinal = bIsUnread && bIsFinalAssistant;

          if (aIsUnreadFinal && !bIsUnreadFinal) return -1;
          if (!aIsUnreadFinal && bIsUnreadFinal) return 1;

          // Priority 2: Among unread final messages, sort by newest first
          if (aIsUnreadFinal && bIsUnreadFinal) {
            return (
              getSessionTimestamp(b).getTime() -
              getSessionTimestamp(a).getTime()
            );
          }

          // Priority 3: Other unread sessions
          if (aIsUnread && !bIsUnread) return -1;
          if (!aIsUnread && bIsUnread) return 1;

          // Priority 4: Within same read/unread status, sort by activity timestamp - newest first
          return (
            getSessionTimestamp(b).getTime() - getSessionTimestamp(a).getTime()
          );
        });

        return groups;
      },

      getSelectedAgentCwd: () => {
        const { selectedSession, sessions } = get();
        return (
          sessions.find((s) => s.id === selectedSession)?.agent_cwd || null
        );
      },
    };
  }
);
