import React, { useCallback, useState } from "react";

import { useMissionControlStore } from "@/stores/missionControlStore";

import { SessionIdContext } from "@/context/SessionIdContext";
import ChatMain from "../chat-interface/ChatMain";
import { sendChatMessage } from "@/utils/sendChatMessage";
import { getDefaultACSClient } from "@/services/acs";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { isTauri } from "@/utils/environment";

import PlanPane from "./PlanPane";
import ChatPaneHeader from "./ChatPaneHeader";
import CheckpointsPane from "./CheckpointsPane";

// Simple Error Boundary for debugging
class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ChatMainCanonicalLegacy Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-start justify-center min-h-[100vh] bg-red-500/10 border border-red-500/20">
          <div className="text-center p-4 mt-10">
            <p className="text-red-400 mb-2">Chat Component Error</p>
            <p className="text-white/60 text-sm">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-3 py-1 bg-red-500/20 text-red-300 rounded text-xs"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ChatPane: React.FC = () => {
  const auth = useAuth();
  const {
    selectedSession,
    sessions,
    setShowNewDraftModal,
    setInitialDraftCodePath,
    updateSession,
    ensureInProcessingOrder,
    markSessionUnread,
    markSessionRead,
  } = useMissionControlStore();
  const [activeView, setActiveView] = useState<"chat" | "plan" | "checkpoints">(
    "chat"
  );
  const [isOpeningModal, setIsOpeningModal] = useState(false);

  const selectedAgent = sessions.find((agent) => agent.id === selectedSession);
  const hasPlan = useMissionControlStore((state) =>
    selectedSession ? !!state.plans[selectedSession] : false
  );

  // Custom submit handler for Mission Control chat messages
  const handleSubmit = useCallback(
    async (message: string) => {
      if (!selectedSession || !auth.user?.id || !selectedAgent) {
        toast.error("Please sign in and select a session to send messages");
        return;
      }

      // Prevent sending messages to a finalized (pruned) session
      if (selectedAgent.isFinalized) {
        toast.error("This session is finalized", {
          description:
            "The worktree was pruned. Create a new task to continue.",
        });
        return;
      }

      try {
        // 🚀 OPTIMISTIC UPDATE: Immediately move session to processing for better UX
        console.log(
          "[UI] Optimistic update: Moving session to processing on message send:",
          selectedSession
        );

        // Update session to processing state immediately
        updateSession(selectedSession, {
          status: "working",
          latest_message_content: "Processing your request…",
          latest_message_role: "user",
          latest_message_timestamp: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        });

        // Move to processing bucket and mark as read (since user is actively using it)
        ensureInProcessingOrder(selectedSession);
        markSessionRead(selectedSession);
        console.log(
          "[UI] Optimistic update complete: Session moved to processing bucket and marked as read"
        );

        const acsClient = getDefaultACSClient();

        // Build overrides object first
        const overrides = selectedAgent.agent_cwd
          ? {
              agent_cwd_override: selectedAgent.agent_cwd,
            }
          : undefined;

        console.log(
          "[ChatPane] Sending message with Mission Control overrides:",
          {
            sessionId: selectedSession.slice(0, 8) + "...",
            agentConfigName: selectedAgent.agent_config_name,
            agentCwd: selectedAgent.agent_cwd,
            autoMode: true,
            modelAutoMode: true,
          }
        );

        await sendChatMessage({
          sessionId: selectedSession,
          message,
          userId: auth.user.id,
          agentConfigName: selectedAgent.agent_config_name || "general",
          acsClient,
          autoMode: true, // Enable automatic agent config selection
          modelAutoMode: true, // Enable automatic model switching
          ...(overrides && { acsOverrides: overrides }),
        });

        console.log(
          `[ChatPane] ✅ Message sent successfully with Mission Control overrides: ${selectedSession.slice(0, 8) + "..."}`
        );
      } catch (error) {
        console.error("[ChatPane] Failed to send message:", error);
        toast.error("Failed to send message", {
          description: "Please try again",
        });
      }
    },
    [selectedSession, selectedAgent, auth.user?.id]
  );

  if (!selectedSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/60">
            Start a Task or Open a Project to begin
          </p>
          {!auth?.isAuthenticated && (
            <p className="text-xs text-white/40">Sign in to start</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!auth?.isAuthenticated) {
                  auth?.setShowModal(true);
                  return;
                }
                if (isOpeningModal) return;
                setIsOpeningModal(true);
                setInitialDraftCodePath(null);
                setShowNewDraftModal(true);
                setTimeout(() => setIsOpeningModal(false), 300);
              }}
              className="px-3 py-1.5 rounded bg-white text-black text-xs font-medium"
            >
              Start a Task
            </button>
            <button
              onClick={async () => {
                if (isTauri()) {
                  try {
                    const { open } = await import("@tauri-apps/plugin-dialog");
                    const folder = await open({
                      directory: true,
                      multiple: false,
                      title: "Select project",
                    });
                    if (folder && typeof folder === "string") {
                      setInitialDraftCodePath(folder);
                      setShowNewDraftModal(true);
                    }
                  } catch (e) {
                    console.warn("Folder picker failed:", e);
                  }
                } else {
                  const input = window.prompt("Enter absolute project path");
                  const value = (input || "").trim();
                  if (value) {
                    const isAbsolute =
                      value.startsWith("/") ||
                      /^([A-Za-z]:\\\\|\\\\\\\\)/.test(value);
                    if (!isAbsolute) return;
                    setInitialDraftCodePath(value);
                    setShowNewDraftModal(true);
                  }
                }
              }}
              className="px-3 py-1.5 rounded bg-white/10 border border-white/20 text-white/80 text-xs"
              title="Choose a project folder (CMD+K to search in modal)"
            >
              Open Project…
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAgent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50">Agent not found</p>
      </div>
    );
  }

  return (
    <div
      className="
      mission-control-split
      flex flex-col
      h-full
      overflow-hidden
    "
      data-testid="chat-pane"
    >
      {/* Enhanced header with session-specific actions */}
      <ChatPaneHeader
        sessionId={selectedSession}
        agent={selectedAgent}
        activeView={activeView}
        onViewChange={setActiveView}
        hasPlan={hasPlan}
      />

      {/* Finalized banner */}
      {selectedAgent.isFinalized && (
        <div className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300">
          This session is finalized (worktree pruned). Create a new task to
          continue.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 h-full overflow-hidden">
        {activeView === "chat" ? (
          <ChatErrorBoundary>
            <div className="h-full max-h-full overflow-hidden flex flex-col">
              <SessionIdContext.Provider value={selectedSession}>
                <ChatMain
                  sessionId={selectedSession}
                  sidebarCollapsed={true}
                  onSubmit={handleSubmit}
                  hideHeader={true}
                />
              </SessionIdContext.Provider>
            </div>
          </ChatErrorBoundary>
        ) : activeView === "plan" ? (
          <PlanPane sessionId={selectedSession} />
        ) : (
          <CheckpointsPane sessionId={selectedSession} agent={selectedAgent} />
        )}
      </div>
    </div>
  );
};

export default ChatPane;
