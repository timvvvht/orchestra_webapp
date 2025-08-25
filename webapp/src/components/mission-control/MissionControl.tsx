import React, { useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Session, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  useMissionControlStore,
  type MissionControlAgent,
} from "@/stores/missionControlStore";

import { NewTaskModal } from "@/components/modals/NewTaskModal";
import { SelectionProvider } from "@/context/SelectionContext";
import { ChatUIProvider } from "@/context/ChatUIContext";
// KeyboardShortcutsProvider removed — no global shortcuts context
import Header from "./Header";
import LayoutSplit from "./LayoutSplit";

import { Plan } from "@/types/plans";

import type { SessionSummary } from "@/services/acs";
import { getDefaultACSClient } from "@/services/acs";
import { mapACSSessionsToMCAgent } from "@/utils/mapACSSessionsToMCAgent";
import { useAuth } from "@/auth/AuthContext";
import { useMissionControlFirehose } from "@/hooks/useMissionControlFirehose";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspaceStore } from "@/stores/workspaceStore";

// Animation variants for staggered reveals
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

interface MissionControlProps {
  repo: any;
}

const MissionControl: React.FC<MissionControlProps> = ({
  repo,
}: MissionControlProps) => {
  const { isAuthenticated, setShowModal, booted, user } = useAuth();

  const sessions = useMissionControlStore((s) => s.activeSessions);

  const location = useLocation() as any;
  const navigate = useNavigate();

  const {
    showNewDraftModal,
    setShowNewDraftModal,
    setSessions,
    setPlans,
    setSessionRefetchCallback,
    activeSessions: currentSessions,
    initialDraftCodePath,
    setInitialDraftCodePath,
    setArchivedSessions,
    archivedLoaded,
    archiveLoading,
    setArchivedLoaded,
    setArchivedLoading,
    viewMode,
    setRouterNavigate,
    setWorkspaceKey,
    setSelectedSession,
  } = useMissionControlStore();

  // Workspace provisioning state
  const [workspaceStatus] = useState<
    "idle" | "provisioning" | "active" | "error"
  >("idle");
  const [progressText] = useState<string>("");
  const [workspaceError] = useState<string | null>(null);

  // Fetch sessions data
  // const {
  //   sessions,
  //   isLoading,
  //   error,
  //   refetch: refetchSessions,
  // } = useSessionsSnapshot(viewMode);
  const [isLoading, setIsLoading] = useState<boolean>(false); // still stubbed
  const error = null;

  const fetchArchivedSessions = useCallback(async () => {
    if (archiveLoading) return;
    if (archivedLoaded) return;

    setArchivedLoading(true);
    setArchivedSessions([]);

    // Get archived sessions
    const { data: archivedSessions } = await supabase
      .from("chat_sessions")
      .select("*")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(100);

    if (!archivedSessions?.length) {
      setArchivedSessions([]);
      setArchivedLoading(false);
      return;
    }

    // Get latest messages for archived sessions
    const sessionIds = archivedSessions.map((s) => s.id);
    const { data: latestMessages } = await supabase
      .from("chat_messages")
      .select("id, session_id, role, content, timestamp")
      .in("session_id", sessionIds)
      .order("timestamp", { ascending: false });

    // Create a map of session_id -> latest message
    const latestMessageMap = new Map();
    latestMessages?.forEach((msg) => {
      if (!latestMessageMap.has(msg.session_id)) {
        latestMessageMap.set(msg.session_id, msg);
      }
    });

    // Merge archived sessions with their latest messages
    const enrichedArchivedSessions = archivedSessions.map((session) => {
      const latestMessage = latestMessageMap.get(session.id);
      return {
        ...session,
        latest_message_id: latestMessage?.id || null,
        latest_message_role: latestMessage?.role || null,
        latest_message_content: latestMessage?.content || null,
        latest_message_timestamp: latestMessage?.timestamp || null,
      };
    });

    setArchivedSessions(enrichedArchivedSessions);
    setArchivedLoading(false);
  }, [setArchivedSessions, archivedLoaded]);

  useEffect(() => {
    if (archiveLoading) return; // already fetching
    if (archivedLoaded) return; // already fetched
    if (viewMode !== "archived") return; // no need for (time) expensive fetch

    fetchArchivedSessions();
  }, [viewMode, archivedLoaded, fetchArchivedSessions]);

  // Fetch plans data
  // const { plansBySession, refetch: refetchPlans } =
  //   usePlansSnapshot(sessionIds);
  const plansBySession = {};

  const fetchAcsSessions: () => Promise<any[]> = useCallback(async () => {
    if (isLoading) return [];
    setIsLoading(true);

    try {
      // Get current workspace filter to determine if we need to filter by repository
      const { workspaceFilter } = useMissionControlStore.getState();
      let query = supabase
        .from("chat_sessions")
        .select("*")
        .is("archived_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);

      // If workspace filter is active, filter sessions by repository
      if (workspaceFilter) {
        const workspace = useWorkspaceStore.getState().getWorkspace(workspaceFilter);
        if (workspace) {
          console.log(`[MissionControl] Filtering sessions by workspace: ${workspace.repoFullName}`);
          
          // Filter sessions that belong to this repository
          // Check multiple fields to identify repository association
          const repoName = workspace.repoFullName;
          const repoNameParts = repoName.split('/');
          const repoShortName = repoNameParts[repoNameParts.length - 1]; // Get just the repo name without org
          
          // Since Supabase .or() has limitations, we'll use a simpler approach
          // Filter by the most common field first (base_dir or agent_cwd)
          query = query.or(`base_dir.ilike.%${repoName}%,agent_cwd.ilike.%${repoName}%`);
        }
      }

      const { data: sessions } = await query;

      if (!sessions?.length) {
        setIsLoading(false);
        return [];
      }

      // Get latest message for each session
      const sessionIds = sessions.map((s) => s.id);
      const { data: latestMessages } = await supabase
        .from("chat_messages")
        .select("id, session_id, role, content, timestamp")
        .in("session_id", sessionIds)
        .order("timestamp", { ascending: false });

      // Create a map of session_id -> latest message
      const latestMessageMap = new Map();
      latestMessages?.forEach((msg) => {
        if (!latestMessageMap.has(msg.session_id)) {
          latestMessageMap.set(msg.session_id, msg);
        }
      });

      // Merge sessions with their latest messages
      const enrichedSessions = sessions.map((session) => {
        const latestMessage = latestMessageMap.get(session.id);
        return {
          ...session,
          latest_message_id: latestMessage?.id || null,
          latest_message_role: latestMessage?.role || null,
          latest_message_content: latestMessage?.content || null,
          latest_message_timestamp: latestMessage?.timestamp || null,
        };
      });

      console.log(`[MissionControl] Fetched ${enrichedSessions.length} sessions${workspaceFilter ? ' (filtered by workspace)' : ''}`, enrichedSessions);
      setIsLoading(false);
      return enrichedSessions;
    } catch (error: any) {
      console.error(
        "[MissionControl][fetchAcsSessions] Failed to fetch sessions from Supabase:",
        error.message,
        error.stack || error || "Unknown Error"
      );
    } finally {
      setIsLoading(false);
    }

    return [];
  }, [isLoading]);

  const refetchSessions = useCallback(async () => {
    try {
      const fetched = await fetchAcsSessions();

      // merge the fetched sessions with the local sessions (optimistic UI handling)
      const local = useMissionControlStore.getState().activeSessions;
      const fetchedIds = new Set(fetched.map((s) => s.id));
      const merged = [
        // Keep local optimistic sessions that ACS doesn't know yet (e.g. just created)
        ...local.filter((s) => !fetchedIds.has(s.id)),
        // Append fetched sessions
        ...fetched,
      ];
      useMissionControlStore.getState().setSessions(merged);
    } catch (error: any) {
      console.error(
        "[MissionControl][refetchSessions] Failed to fetch sessions from ACS:",
        error.message,
        error.stack || error || "Unknown Error"
      );
    }
  }, []);

  // Initial fetch and refetch when workspace filter changes
  useEffect(() => {
    if (booted && user?.id) refetchSessions();
  }, [booted, user?.id, refetchSessions]);

  // Refetch sessions when workspace filter changes
  const { workspaceFilter } = useMissionControlStore();
  useEffect(() => {
    if (booted && user?.id && workspaceFilter) {
      console.log(`[MissionControl] Workspace filter changed to: ${workspaceFilter}, refetching sessions`);
      refetchSessions();
    }
  }, [booted, user?.id, workspaceFilter, refetchSessions]);

  // Registration
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    const { sessionRefetchCallback } = useMissionControlStore.getState();
    if (sessionRefetchCallback !== refetchSessions) {
      setSessionRefetchCallback(refetchSessions);
    }
  }, [refetchSessions, setSessionRefetchCallback]);

  useEffect(() => {
    refetchSessions();
  }, [refetchSessions]);

  // Inject navigate into store
  useEffect(() => {
    setRouterNavigate(navigate);
    return () => setRouterNavigate(null);
  }, [navigate, setRouterNavigate]);

  // Initialize workspace_key (use user_infrastructure.workspace_path)
  useEffect(() => {
    async function fetchWorkspaceKey() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("user_infrastructure")
          .select("workspace_path")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          console.warn(
            "[MissionControl] workspace fetch error:",
            error.message
          );
          return;
        }
        const wk = (data?.workspace_path as string) || "/workspace";
        await setWorkspaceKey(wk, user.id);
      } catch (e) {
        console.warn("[MissionControl] workspace fetch exception:", e);
      }
    }
    fetchWorkspaceKey();
  }, [user?.id, setWorkspaceKey]);

  // Read sessionId from /project/:hashed_workspace_id/:sessionId path and set selection
  const params = useParams() as {
    hashed_workspace_id?: string;
    sessionId?: string;
    workspace_id?: string;
  };

  // Handle workspace_id parameter for filtering sessions by workspace
  const workspaceId = params?.workspace_id;

  useEffect(() => {
    if (workspaceId) {
      // Set the workspace filter in the store
      useMissionControlStore.getState().setWorkspaceFilter(workspaceId);
    } else {
      // Clear the workspace filter when no workspace is selected
      useMissionControlStore.getState().setWorkspaceFilter(null);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (params?.sessionId) {
      // only set selection; navigateToSession would push URL again unnecessarily
      setSelectedSession(params.sessionId);
    }
  }, [params?.sessionId, setSelectedSession]);

  // Set up real-time updates and hotkeys
  useMissionControlFirehose();
  // useMissionControlHotkeys();

  // Update store when plans change
  useEffect(() => {
    const plansArray: Plan[] = Object.values(plansBySession);
    const currentPlans = useMissionControlStore.getState().plans;
    const sameLen = Object.keys(currentPlans).length === plansArray.length;
    const sameKeys =
      sameLen && plansArray.every((p) => currentPlans[p.session_id]);
    if (!sameKeys) {
      setPlans(plansArray);
    }
  }, [plansBySession, setPlans]);

  // Handle new session creation from draft modal (supports optimistic UI)
  const handleSessionCreated = useCallback(
    (sessionId: string, sessionData: Partial<MissionControlAgent>) => {
      console.log("[MissionControl] Session created/updated:", {
        sessionId,
        sessionData,
      });

      // Check if this is an update to an existing session (temp ID replacement or status update)
      const existingSessionIndex = currentSessions.findIndex(
        (s) => s.id === sessionId
      );
      const isUpdate = existingSessionIndex !== -1;

      // Check if this is a pending session replacement (sessionId is real, but we have a pending session)
      const pendingSessionIndex = currentSessions.findIndex((s) => s.isPending);
      const isPendingReplacement =
        !isUpdate && pendingSessionIndex !== -1 && !sessionData.isPending;

      if (isPendingReplacement) {
        // Replace pending session with confirmed session
        console.log(
          "[MissionControl] Replacing pending session with confirmed session:",
          {
            pendingId: currentSessions[pendingSessionIndex].id,
            confirmedId: sessionId,
          }
        );

        const updatedSession: MissionControlAgent = {
          ...currentSessions[pendingSessionIndex], // Keep existing data
          ...sessionData, // Apply updates
          id: sessionId, // Use real session ID
          isPending: false, // Mark as confirmed
        };

        const newSessions = [...currentSessions];
        newSessions[pendingSessionIndex] = updatedSession;
        setSessions(newSessions);
      } else if (isUpdate) {
        // Update existing session
        console.log("[MissionControl] Updating existing session:", sessionId);

        const updatedSession: MissionControlAgent = {
          ...currentSessions[existingSessionIndex],
          ...sessionData,
        };

        const newSessions = [...currentSessions];
        newSessions[existingSessionIndex] = updatedSession;
        setSessions(newSessions);
      } else {
        // Create new session (skeleton or regular)
        console.log("[MissionControl] Creating new session:", sessionId);

        const newSession: MissionControlAgent = {
          id: sessionId,
          mission_title: sessionData.mission_title || "New Session",
          status: sessionData.status || "active",
          last_message_at:
            sessionData.last_message_at || new Date().toISOString(),
          created_at: sessionData.created_at || new Date().toISOString(),
          agent_config_name: sessionData.agent_config_name || null,
          model_id: sessionData.model_id || null,
          latest_message_id: sessionData.latest_message_id || null,
          latest_message_role: sessionData.latest_message_role || null,
          latest_message_content: sessionData.latest_message_content || null,
          latest_message_timestamp:
            sessionData.latest_message_timestamp || null,
          agent_cwd: sessionData.agent_cwd || null,
          base_dir: sessionData.base_dir || null,
          archived_at: sessionData.archived_at || null,
        };

        // Add the new session to the beginning of the list
        setSessions([newSession, ...currentSessions]);
      }

      console.log("[MissionControl] Session operation complete");
    },
    [setSessions, currentSessions]
  );

  if (!booted) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-white/40 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/70 mb-4">
            Please sign in to use Mission Control
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-white/40 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="
              px-4 py-2
              bg-white/10 hover:bg-white/20
              text-white/70
              rounded-lg
              font-normal
              transition-all duration-200
              border border-white/10 hover:border-white/20
            "
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatUIProvider>
      <SelectionProvider>
        <div className="min-h-full w-full bg-black flex flex-col overflow-hidden min-h-0">
          {/* Subtle background */}
          <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-gray-950 via-black to-gray-950" />
          <div className="fixed inset-0 pointer-events-none">
            {/* Very subtle floating orbs */}
            <div
              className="absolute top-0 left-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl"
              style={{ animation: "float 30s ease-in-out infinite" }}
            />
            <div
              className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl"
              style={{ animation: "float 35s ease-in-out infinite reverse" }}
            />
          </div>

          {/* Main Content with staggered animation */}
          <motion.div
            className="relative z-10 flex flex-col h-full min-h-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header */}

            <Header
              workspaceStatus={workspaceStatus}
              progressText={progressText}
              workspaceError={workspaceError}
              onProvisionWorkspace={() => {}}
            />

            {/* GitHub Connection Card Section */}
            {/* <motion.div variants={itemVariants} className="px-8 py-4">
          <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-white/90">GitHub Integration</h3>
                <p className="text-sm text-white/60">Connect your GitHub repository to enable code collaboration</p>
              </div>
            </div>
            <div className="max-w-md">
              <GitHubConnectPanel />
            </div>
          </div>
        </motion.div> */}

            {/* Layout Split */}
            <LayoutSplit />
          </motion.div>

          {/* New Task Modal */}
          {showNewDraftModal && (
            <NewTaskModal
              initialCodePath={initialDraftCodePath || undefined}
              onClose={() => {
                setShowNewDraftModal(false);
                setInitialDraftCodePath(null);
              }}
              onSessionCreated={handleSessionCreated}
            />
          )}

          {/* CSS animations */}
          <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
        </div>
      </SelectionProvider>
    </ChatUIProvider>
  );
};

export default MissionControl;
