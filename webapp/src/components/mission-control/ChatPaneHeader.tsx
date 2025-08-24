import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  FileText,
  MoreVertical,
  GitBranch,
  Archive,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MergeWorktreeButton } from "./MergeWorktreeButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { getDiffStatsFromUnifiedDiff } from "@/utils/gitDiffStats";
import { type DiffStats } from "@/types/gitTypes";
import { type MissionControlAgent } from "@/stores/missionControlStore";
import { supabase } from "@/auth/SupabaseClient";
import { SCMManager } from "@/services/scm/SCMManager";
import { getDefaultACSClient } from "@/services/acs";
import { useMissionControlArchive } from "@/hooks/useMissionControlArchive";
import SubmitGitHubPRButton from "../chat-interface/SubmitGitHubPRButton";
import { GitHubPRModal } from "../modals/PullRequestModal";

interface ChatPaneHeaderProps {
  sessionId: string;
  agent: MissionControlAgent;
  activeView: "chat" | "plan" | "checkpoints";
  onViewChange: (view: "chat" | "plan" | "checkpoints") => void;
  hasPlan: boolean;
}

interface ExtendedDiffStats extends DiffStats {
  latestHash?: string;
}

const ChatPaneHeader: React.FC<ChatPaneHeaderProps> = ({
  sessionId,
  agent,
  activeView,
  onViewChange,
  hasPlan,
}) => {
  const [diffStats, setDiffStats] = useState<ExtendedDiffStats | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [checkpointCount, setCheckpointCount] = useState(0);
  const [showPRModal, setShowPRModal] = useState<boolean>(false);
  const { archiveSession } = useMissionControlArchive();

  // Auto-load diff stats when session is complete
  useEffect(() => {
    if (agent.status === "complete" && agent.agent_cwd && !diffStats) {
      loadDiffStats();
    }
  }, [agent.status, agent.agent_cwd]);

  const loadDiffStats = async () => {
    if (!sessionId || isLoadingDiff) return;

    setIsLoadingDiff(true);

    try {
      // Get checkpoints from Supabase
      const { data: checkpointData, error } = await supabase
        .from("chat_checkpoints")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);

      const checkpoints = checkpointData || [];
      setCheckpointCount(checkpoints.length);

      // Calculate diff stats if we have at least 2 checkpoints
      if (checkpoints.length >= 2 && agent.agent_cwd) {
        const earliestCheckpoint = checkpoints[0];
        const latestCheckpoint = checkpoints[checkpoints.length - 1];

        const scmManager = new SCMManager({
          forceBackend: "rust",
          allowMockFallback: false,
        });

        const diffString = await scmManager.diff(
          agent.agent_cwd,
          earliestCheckpoint.commit_hash,
          latestCheckpoint.commit_hash
        );

        const { filesChanged, additions, deletions } =
          getDiffStatsFromUnifiedDiff(diffString);

        setDiffStats({
          filesChanged,
          additions,
          deletions,
          earliestHash: earliestCheckpoint.commit_hash,
          latestHash: latestCheckpoint.commit_hash,
        });
      }
    } catch (err) {
      console.error("[ChatPaneHeader] Failed to load diff stats:", err);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  const handleGitHubPRButtonPress = () => {
    console.log("[ChatPaneHeader] Opening PR Creation Modal");
    setShowPRModal(true);
  };

  const handleArchive = async () => {
    try {
      await archiveSession(sessionId);
    } catch (err) {
      console.error("Failed to archive session:", err);
    }
  };

  const isComplete = agent.status === "complete";
  const canMerge = isComplete && agent.agent_cwd && !agent.isFinalized;

  return (
    <div
      className="flex-shrink-0 border-b border-white/[0.06] bg-black/50 backdrop-blur-sm"
      id="ChatPaneHeader"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Session Info + Status */}
          <div className="flex items-center gap-4">
            {/* Session Title */}
            <h2
              className="text-sm font-medium text-white/90 max-w-[500px]"
              title={agent.mission_title}
            >
              {agent.mission_title}
            </h2>

            {/* Status Badge */}
            <AnimatePresence mode="wait">
              {isComplete && diffStats && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />

                  {/* Diff Stats - Inline when complete */}
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>{diffStats.filesChanged} files</span>
                    <span className="text-green-400">
                      +{diffStats.additions}
                    </span>
                    <span className="text-red-400">-{diffStats.deletions}</span>
                  </div>
                </motion.div>
              )}

              {agent.isFinalized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1 text-xs text-amber-400/60"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Finalized</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: View Controls + Actions */}
          <div className="flex items-center gap-3">
            {/* View Toggle - Chat/Plan/Checkpoints - All at same hierarchy */}
            <div className="flex items-center bg-white/[0.02] backdrop-blur-sm rounded-lg p-0.5 border border-white/[0.06]">
              <button
                onClick={() => onViewChange("chat")}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                  ${
                    activeView === "chat"
                      ? "bg-white/[0.08] text-white/90 shadow-sm"
                      : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
                  }
                `}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => onViewChange("plan")}
                disabled={!hasPlan}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                  ${
                    activeView === "plan"
                      ? "bg-white/[0.08] text-white/90 shadow-sm"
                      : hasPlan
                        ? "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
                        : "text-white/30 cursor-not-allowed opacity-50"
                  }
                `}
                title={
                  !hasPlan ? "No plan available for this session" : undefined
                }
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Plan</span>
              </button>

              <button
                onClick={() => {
                  if (agent.agent_cwd) loadDiffStats();
                  onViewChange("checkpoints");
                }}
                disabled={isLoadingDiff}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                  ${
                    activeView === "checkpoints"
                      ? "bg-white/[0.08] text-white/90 shadow-sm"
                      : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
                  }
                  ${isLoadingDiff ? "opacity-50 cursor-wait" : ""}
                `}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Checkpoints</span>
                {checkpointCount > 0 && (
                  <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                    {checkpointCount}
                  </span>
                )}
              </button>
            </div>

            {/* Submit PR Button (Stub) */}
            {sessionId && (
              <SubmitGitHubPRButton
                sessionId={sessionId}
                onClick={handleGitHubPRButtonPress}
              />
            )}

            {/* Merge Button - Prominent when ready */}
            <AnimatePresence>
              {canMerge && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <MergeWorktreeButton
                    sessionId={sessionId}
                    sessionName={agent.mission_title}
                    workspacePath={agent.agent_cwd}
                    variant="primary"
                    size="sm"
                    className="
                      px-4 py-2
                      bg-green-500/10 hover:bg-green-500/20
                      text-green-400
                      border border-green-500/20
                      rounded-lg
                      font-medium text-sm
                      transition-all duration-150
                      flex items-center gap-2
                    "
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/10 rounded-md transition-all duration-150">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-black/95 backdrop-blur-xl border-white/10"
              >
                {agent.agent_cwd && (
                  <DropdownMenuItem
                    onClick={() =>
                      navigator.clipboard.writeText(agent.agent_cwd!)
                    }
                    className="text-white/70 hover:text-white focus:text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Copy workspace path
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={handleArchive}
                  className="text-white/70 hover:text-white focus:text-white"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {showPRModal && (
        <GitHubPRModal
          sessionId={sessionId}
          onClose={() => {
            setShowPRModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatPaneHeader;
