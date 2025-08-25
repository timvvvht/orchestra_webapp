import React, { useMemo, useCallback, useState } from "react";
import {
  ChevronRight,
  Archive,
  ArchiveRestore,
  Loader2,
  FileText,
  Lock,
  Clock,
  GitBranch,
} from "lucide-react";
import {
  MissionControlAgent,
  useMissionControlStore,
} from "@/stores/missionControlStore";
import { MergeWorktreeButton } from "./MergeWorktreeButton";
import { formatTimeAgo, getSessionTimestamp } from "@/utils/time";
import { baseDirFromCwd } from "@/utils/pathHelpers";
import { isWorktreePath, getWorktreeName } from "@/utils/worktreeUtils";

import PlanMarkdownModal from "@/components/modals/PlanMarkdownModal";
import { ProgressBar } from "./ProgressBar";
import GradientOrb from "@/components/ui/GradientOrb";
import { motion } from "framer-motion";
import { cn } from "cn-utility";

// Format code path for display
const formatCodePath = (path: string | null): string => {
  if (!path) return "No directory set";

  const basePath = baseDirFromCwd(path);
  if (!basePath) return "No directory set";

  const segments = basePath.split("/").filter(Boolean);

  if (segments.length <= 3) {
    return basePath;
  }

  const lastSegments = segments.slice(-2);
  return `.../${lastSegments.join("/")}`;
};

// Helper: extract text from various content formats
function extractTextFromContent(content: any): string {
  if (typeof content === "string") return content;
  if (!content) return "";
  // Handle Anthropic/OpenAI-like arrays
  if (Array.isArray(content)) {
    const parts = content
      .map((p) => (typeof p === "string" ? p : (p?.text ?? p?.content ?? "")))
      .filter(Boolean);
    return parts.join(" ");
  }
  // Handle objects with text/content
  if (typeof content === "object") {
    if (typeof (content as any).text === "string") return (content as any).text;
    if (typeof (content as any).content === "string")
      return (content as any).content;
    // Shallow stringify as last resort
    try {
      return JSON.stringify(content);
    } catch {
      return "";
    }
  }
  return "";
}

// Helper: strip common markdown noise for UI previews
function sanitizeMarkdownInline(input: string): string {
  let s = input;

  // Images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Headings: ## Title -> Title
  s = s.replace(/^#{1,6}\s+/gm, "");

  // Blockquotes: > text -> text
  s = s.replace(/^\s*>\s?/gm, "");

  // Unordered lists: - item / * item / + item -> item
  s = s.replace(/^\s*[-*+]\s+/gm, "");

  // Ordered lists: 1. item -> item
  s = s.replace(/^\s*\d+\.\s+/gm, "");

  // Inline code: `code` -> code
  s = s.replace(/`([^`]+)`/g, "$1");

  // Bold/italic: **text** or _text_ or ***text*** -> text
  s = s.replace(/(\*\*\*|\*\*|\*|___|__|_)([^*_]+)\1/g, "$2");

  // Tables: drop leading pipes/spaces
  s = s.replace(/^\s*\|/gm, "").replace(/\|\s*$/gm, "");

  // Collapse multiple hashes/symbol runs that might remain
  s = s.replace(/[>#*_]{2,}/g, " ");

  return s;
}

// Helper: make assistant previews tidy and short
function getAssistantPreview(raw: string): string {
  // Remove code fences to avoid giant blocks
  const noCode = raw.replace(/```[\s\S]*?```/g, "[code]");

  // Strip most markdown formatting
  const cleaned = sanitizeMarkdownInline(noCode);

  // Normalize whitespace
  const normalized = cleaned.replace(/\s+/g, " ").trim();

  // Prefer first meaningful line/sentence
  const firstLine = normalized.split("\n").find((l) => l.trim()) || normalized;
  const firstSentence =
    firstLine
      .split(/[.!?]/)
      .find((s) => s.trim())
      ?.trim() || firstLine;

  const text = firstSentence.length >= 8 ? firstSentence : normalized;
  return text.length > 120 ? text.slice(0, 117) + "…" : text;
}

// Human-friendly activity descriptions (no emojis)
const getHumanReadableActivity = (
  agent: MissionControlAgent
): {
  text: string;
  tone:
    | "exploring"
    | "creating"
    | "thinking"
    | "testing"
    | "reviewing"
    | "complete";
} => {
  const role = agent.latest_message_role;
  const content = agent.latest_message_content;

  // Special states
  if (agent.status === "creating") {
    return { text: "Preparing workspace…", tone: "creating" };
  }
  if (agent.status === "processing" && !content) {
    return { text: "Starting up…", tone: "thinking" };
  }

  // Tool-based activities → map by tool name
  if (role === "tool_call") {
    const toolName = (
      typeof content === "string"
        ? content
        : content?.name || content?.tool_name || ""
    ).toLowerCase();

    // Grouped mapping
    const exploringTools = ["search_files", "read_files", "cat"];
    const editingTools = [
      "apply_patch",
      "str_replace_editor",
      "write_file",
      "create_file",
      "delete_file",
    ];
    const runningTools = [
      "execute_in_runner_session",
      "run_command",
      "initiate_runner_session",
    ];
    const reviewingTools = ["git_diff"];
    const thinkingTools = ["think", "plan"];

    if (exploringTools.some((t) => toolName.includes(t))) {
      return { text: "Exploring codebase…", tone: "exploring" };
    }
    if (editingTools.some((t) => toolName.includes(t))) {
      return { text: "Editing files…", tone: "creating" }; // tone uses existing gradient key
    }
    if (runningTools.some((t) => toolName.includes(t))) {
      return { text: "Running commands…", tone: "testing" }; // maps to green gradient
    }
    if (reviewingTools.some((t) => toolName.includes(t))) {
      return { text: "Reviewing changes…", tone: "reviewing" };
    }
    if (thinkingTools.some((t) => toolName.includes(t))) {
      return {
        text: toolName.includes("plan") ? "Planning approach…" : "Thinking…",
        tone: "thinking",
      };
    }

    // Default for other tools
    return { text: "Working on task…", tone: "creating" };
  }

  // Tool results
  if (role === "tool_result") {
    return { text: "Step completed", tone: "complete" };
  }

  // Assistant → show a neat preview
  if (role === "assistant") {
    const text = extractTextFromContent(content);
    if (text.trim()) {
      return { text: getAssistantPreview(text), tone: "thinking" };
    }
    // Assistant with no usable text
    return { text: "Processing your request…", tone: "thinking" };
  }

  // User messages
  if (role === "user") {
    return { text: "Processing your request…", tone: "thinking" };
  }

  // Session end
  if (role === "session_end") {
    const text = extractTextFromContent(content);
    if (text.trim()) {
      return { text: getAssistantPreview(text), tone: "complete" };
    }
    return { text: "Session completed", tone: "complete" };
  }

  // Default fallbacks
  if (
    content == null ||
    (typeof content === "string" && content.trim() === "")
  ) {
    return { text: "Ready to start…", tone: "thinking" };
  }
  return { text: "In progress…", tone: "thinking" };
};

// Legacy message preview for fallback
const getLatestMessagePreview = (
  agent: MissionControlAgent,
  isInSplitScreen: boolean = false
) => {
  const activity = getHumanReadableActivity(agent);
  return activity.text;
};

interface AgentCardProps {
  agent: MissionControlAgent;
  group: "needs-review" | "processing" | "idle";
  showArchived?: boolean;
  isInSplitScreen?: boolean;
  onArchive?: (sessionId: string) => void;
  onUnarchive?: (sessionId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  group,
  showArchived = false,
  isInSplitScreen = false,
  onArchive,
  onUnarchive,
}) => {
  const {
    selectedSession,
    setSelectedSession,
    markSessionRead,
    isSessionUnread,
  } = useMissionControlStore();
  const isSelected = selectedSession === agent.id;
  const isUnread = isSessionUnread(agent.id);

  // Get plan data for this session using proper Zustand selectors
  const plan = useMissionControlStore((state) => state.plans[agent.id]);
  const progress = useMissionControlStore(
    (state) => state.planProgress[agent.id]
  );

  // Memoize expensive computations
  const activityInfo = useMemo(() => getHumanReadableActivity(agent), [agent]);
  const messagePreview = useMemo(
    () => getLatestMessagePreview(agent, isInSplitScreen),
    [agent, isInSplitScreen]
  );
  const timeAgo = useMemo(
    () => formatTimeAgo(getSessionTimestamp(agent)),
    [agent]
  );
  const codePath = useMemo(
    () => formatCodePath(agent.base_dir ?? agent.agent_cwd),
    [agent.base_dir, agent.agent_cwd]
  );

  // Worktree detection
  const isWorktree = useMemo(
    () => isWorktreePath(agent.agent_cwd || agent.base_dir),
    [agent.agent_cwd, agent.base_dir]
  );
  const worktreeName = useMemo(
    () => getWorktreeName(agent.agent_cwd || agent.base_dir),
    [agent.agent_cwd, agent.base_dir]
  );

  // Memoize click handlers
  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onArchive?.(agent.id);
    },
    [onArchive, agent.id]
  );

  const handleUnarchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUnarchive?.(agent.id);
    },
    [onUnarchive, agent.id]
  );

  const handleCardClick = useCallback(() => {
    useMissionControlStore.getState().navigateToSession(agent.id);
    markSessionRead(agent.id);
  }, [markSessionRead, agent.id]);

  // Enhanced glass morphism styles based on group
  const glowStyles = {
    "needs-review":
      "bg-white/[0.02] border-amber-400/[0.08] hover:border-amber-400/[0.16] hover:bg-white/[0.05]",
    processing:
      "bg-white/[0.02] border-blue-400/[0.08] hover:border-blue-400/[0.18] hover:bg-white/[0.05] hover:shadow-[0_0_32px_rgba(0,119,237,0.06)]",
    idle: isUnread
      ? "bg-white/[0.02] border-emerald-400/[0.12] hover:border-emerald-400/[0.18] hover:bg-white/[0.04]"
      : "bg-white/[0.01] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03]",
  };

  // Special styling for creating status, pending sessions, or background processing
  const getCardStyles = () => {
    if (
      agent.status === "creating" ||
      agent.isPending ||
      agent.backgroundProcessing
    ) {
      return "bg-white/[0.03] border-emerald-400/[0.12] hover:border-emerald-400/[0.18] hover:bg-white/[0.04]";
    }
    return glowStyles[group];
  };

  return (
    <motion.div
      onClick={handleCardClick}
      className="group relative cursor-pointer mb-4"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      data-session-id={agent.id}
      data-selected={isSelected ? "true" : "false"}
      data-worktree={isWorktree ? "true" : "false"}
    >
      <div
        className={cn(
          "relative rounded-2xl border backdrop-blur-xl transition-all duration-500",
          "shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
          "hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)]",
          isSelected
            ? [
                "bg-gradient-to-br from-white/[0.08] to-white/[0.04]",
                "border-white/30",
                "shadow-[0_0_60px_rgba(0,119,237,0.25)]",
                "ring-2 ring-white/20 ring-offset-4 ring-offset-black/50",
              ]
            : [
                "bg-gradient-to-br from-white/[0.03] to-transparent",
                "border-white/10 hover:border-white/20",
              ]
        )}
      >
        {/* Ambient glow layer */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "bg-gradient-to-br",
            agent.status === "processing"
              ? "from-blue-500/10 to-transparent"
              : agent.status === "creating"
                ? "from-emerald-500/10 to-transparent"
                : "from-white/5 to-transparent"
          )}
        />

        {/* Activity-based glow for active states */}
        {(agent.status === "creating" ||
          agent.isPending ||
          agent.backgroundProcessing) && (
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/[0.05] animate-pulse" />
        )}
        {group === "processing" &&
          agent.status !== "creating" &&
          !agent.isPending &&
          !agent.backgroundProcessing && (
            <div className="absolute inset-0 rounded-2xl bg-blue-500/[0.03] animate-pulse" />
          )}

        {/* Background processing spinner overlay */}
        {agent.backgroundProcessing && (
          <div className="absolute inset-0 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Setting up workspace...</span>
            </div>
          </div>
        )}

        <div className={`relative px-6 py-5`}>
          {/* Header row: Avatar (orb) + Title/CWD */}
          <div className="flex items-start gap-3">
            {/* Gradient orb and plan indicator */}
            <div className="flex items-center gap-2 mt-0.5">
              <GradientOrb seed={agent.agent_cwd} size="md" />
              {/* Unread indicator */}
              {isUnread && (
                <div
                  className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"
                  title="Unread"
                />
              )}
              {/* {plan && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlanModal(true);
                  }}
                  className="p-1 text-white/30 hover:text-white/60 hover:bg-white/10 rounded-md transition-all duration-200"
                  title="View plan markdown"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )} */}
            </div>

            {/* Title + cwd (code path) */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={cn(
                    "text-base font-medium leading-tight tracking-tight transition-all duration-500",
                    isSelected
                      ? [
                          "text-white",
                          "font-medium",
                          "drop-shadow-[0_0_8px_rgba(0,119,237,0.3)]",
                        ]
                      : "text-white/95"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {agent.mission_title}

                    {/* Workspace chip showing repo and branch */}
                    {(() => {
                      const workspace = (agent as any).workspace_key || (
                        (agent as any).repo_full_name && (agent as any).branch 
                          ? `${(agent as any).repo_full_name}#${(agent as any).branch}` 
                          : null
                      );
                      
                      if (workspace) {
                        const [repoName, branchName] = workspace.split('#');
                        const shortRepo = repoName?.split('/').pop() || repoName;
                        return (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300" 
                            data-testid="workspace-chip" 
                            title={`Workspace: ${workspace}`}
                          >
                            <GitBranch className="w-3 h-3" />
                            {shortRepo}#{branchName}
                          </span>
                        );
                      }
                      
                      return isWorktree ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300" data-testid="worktree-chip" title={worktreeName ? `Worktree: ${worktreeName}` : 'Worktree active'}>
                          <GitBranch className="w-3 h-3" />
                          Worktree{worktreeName ? `: ${worktreeName}` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60" data-testid="direct-repo-chip" title="Direct repo (no worktree)">
                          <GitBranch className="w-3 h-3 opacity-60" />
                          Repo
                        </span>
                      );
                    })()}
                    {agent.isFinalized && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] text-white/70"
                        title="Session finalized (worktree pruned)"
                      >
                        <Lock className="w-3 h-3" /> Finalized
                      </span>
                    )}
                  </span>
                </h3>
              </div>
              <div
                className="text-xs text-white/60 font-mono truncate"
                title={agent.agent_cwd || undefined}
              >
                {isWorktree && worktreeName
                  ? `${baseDirFromCwd(agent.agent_cwd || agent.base_dir) || ""} • ${worktreeName}`
                  : codePath}
              </div>
            </div>
          </div>

          {/* Full-width status/latest message + time */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <motion.div
                className={cn(
                  "relative px-3 py-1.5 rounded-lg overflow-hidden",
                  "bg-white/[0.04] backdrop-blur-md",
                  "border border-white/10",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                )}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative z-10">
                  <span className="text-sm font-medium text-white/85">
                    {activityInfo.text}
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/50">
              <div className="flex items-center gap-3">
                {agent.status === "processing" && (
                  <span className="flex items-center gap-1">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-blue-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    Active now
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Full-width plan progress */}
          {progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
                <span className="font-medium">Plan Progress</span>
                <span className="font-mono tabular-nums">
                  {progress.completed}/{progress.total} tasks
                </span>
              </div>
              <ProgressBar
                progress={progress.completed}
                total={progress.total}
                size="md"
                glowColor="rgba(16,185,129,0.7)"
              />
            </div>
          )}

          {/* Actions overlay (unchanged) */}
          <div
            className={`
              absolute right-4 top-1/2 -translate-y-1/2
              opacity-0 group-hover:opacity-100
              transition-opacity duration-150
              flex items-center gap-1
            `}
          >
            {!agent.isPending &&
              !agent.backgroundProcessing &&
              !agent.isFinalized &&
              isWorktree && (
                <div onClick={(e) => e.stopPropagation()}>
                  <MergeWorktreeButton
                    sessionId={agent.id}
                    sessionName={agent.mission_title}
                    workspacePath={agent.agent_cwd}
                    variant="ghost"
                    size="icon"
                    backgroundProcessing={agent.backgroundProcessing}
                    className="
                      w-7 h-7
                      text-white/40 hover:text-blue-400
                      hover:bg-blue-500/10
                      transition-colors duration-150
                    "
                  />
                </div>
              )}
            {!agent.isPending &&
              !agent.backgroundProcessing &&
              (showArchived ? (
                <button
                  onClick={handleUnarchiveClick}
                  className="
                    p-1.5
                    text-white/40 hover:text-emerald-400
                    hover:bg-emerald-500/10
                    rounded-md
                    transition-colors duration-150
                  "
                  title="Restore session"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleArchiveClick}
                  className="
                    p-1.5
                    text-white/40 hover:text-amber-400
                    hover:bg-amber-500/10
                    rounded-md
                    transition-colors duration-150
                  "
                  title="Archive session"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              ))}
            <ChevronRight
              className={`w-4 h-4 ml-1 transition-transform ${
                isSelected ? "rotate-90 text-white/40" : "text-white/20"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Plan Markdown Modal
      {showPlanModal && plan && (
        <PlanMarkdownModal
          planMarkdown={plan.markdown}
          sessionTitle={agent.mission_title}
          onClose={() => setShowPlanModal(false)}
        />
      )} */}
    </motion.div>
  );
};

export default AgentCard;
