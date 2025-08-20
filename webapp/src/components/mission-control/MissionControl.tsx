import React, { useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
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

/**
 * Returns the (non-archived) sessions from the ACS
 * @returns (MissionControlAgent[]) a list of the active sessions
 */
export const fetchAcsSessions = async (): Promise<MissionControlAgent[]> => {
  const acs = getDefaultACSClient();

  const resp = await acs.sessions.listSessions({
    limit: 100,
    includeMessageCount: true,
  });
  const list: SessionSummary[] = resp.data.sessions || [];
  const nonArchivedSessions = list.filter(
    (session) => session.archived_at == null
  );
  return nonArchivedSessions.map(mapACSSessionsToMCAgent);
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
  const isLoading = false; // still stubbed
  const error = null;

  const fetchArchivedSessions = useCallback(async () => {
    if (archiveLoading) return;
    if (archivedLoaded) return;
    // Optionally set a loading flag in store if you want
    setArchivedLoading(true);

    const { data } = await supabase
      .from("sessions")
      .select("*")
      .not("archived_at", "is", null);
    setArchivedSessions(data ?? []);
    setArchivedLoading(false);
    setArchivedLoaded(true);
  }, [setArchivedSessions, archiveLoading, archivedLoaded]);

  useEffect(() => {
    if (viewMode === "archived" && !archivedLoaded) {
      fetchArchivedSessions();
    }
  }, [viewMode, archivedLoaded, fetchArchivedSessions]);

  // Fetch plans data
  // const { plansBySession, refetch: refetchPlans } =
  //   usePlansSnapshot(sessionIds);
  const plansBySession = {};

  useEffect(() => {
    if (booted && user?.id) refetchSessions();
  }, [booted, user?.id]);

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
