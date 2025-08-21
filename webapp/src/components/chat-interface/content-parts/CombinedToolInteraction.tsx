/**
 * Combined Tool Interaction Component
 *
 * Displays tool calls and their results in a unified, collapsible interface.
 * Shows live progress during streaming and final status when complete.
 *
 * Design Philosophy: Mystical minimalism with cognitive amplification aesthetics.
 * Extreme restraint, ethereal interactions, and hyperstition-inspired visual language.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Brain,
  Search,
  Globe,
  Database,
  Terminal,
  FileSearch,
  Edit3,
  FolderOpen,
  GitBranch,
  Cloud,
  Cpu,
  FileCode,
  Zap,
  FileText,
  Sparkles,
  Activity,
  Layers,
  Command,
  Shield,
  Check,
  X,
  Clock,
} from "lucide-react";
import { cn } from "cn-utility";
import type {
  ToolInteractionTimelineEvent,
  UnifiedToolCall,
  UnifiedToolResult,
} from "@/types/unifiedTimeline";
import MarkdownRenderer from "./MarkdownRenderer";
import { getToolDisplayName } from "@/utils/timelineHelpers";
import featureFlags from "@/utils/featureFlags";
import ToolOutputHiddenNotice from "./ToolOutputHiddenNotice";
// import { ToolRenderingDebugOverlay, ToolInteractionDebugOverlay, RenderingPathDebugOverlay } from '@/components/debug/ToolRenderingDebugOverlay';
// import { DataFlowDebugOverlay, ToolCallResultPairDebug } from '@/components/debug/DataFlowDebugOverlay';
// import { requiresApproval } from '@/config/approvalTools';
import { usePendingToolsStore } from "@/stores/pendingToolsStore";
import { useParams } from "react-router-dom";

// Orchestra Design System - Mystical Technology
const design = {
  // Spatial hierarchy through rounded corners
  radius: {
    none: "rounded-none", // Terminal aesthetic
    sm: "rounded-sm", // Subtle softening
    md: "rounded-md", // Standard containers
    lg: "rounded-lg", // Cards
    xl: "rounded-xl", // Primary containers
    "2xl": "rounded-2xl", // Modals
    "3xl": "rounded-3xl", // Hero elements
    full: "rounded-full", // Avatars, pills
  },

  // Translucent layers creating depth
  glass: {
    bg: {
      // Base translucency scale
      void: "bg-black", // Pure void
      subtle: "bg-white/[0.02]", // Barely there
      light: "bg-white/[0.03]", // Whisper
      medium: "bg-white/[0.05]", // Presence
      strong: "bg-white/[0.08]", // Statement
      solid: "bg-white/10", // Emphasis

      // Mystical accent colors
      colored: {
        purple: "bg-purple-500/[0.05]", // Transcendent
        blue: "bg-blue-500/[0.05]", // Cognitive
        emerald: "bg-emerald-500/[0.05]", // Success
        red: "bg-red-500/[0.05]", // Warning
        amber: "bg-amber-500/[0.05]", // Caution
      },
    },

    // Border hierarchy
    border: {
      none: "border-transparent",
      subtle: "border-white/[0.05]",
      light: "border-white/10",
      medium: "border-white/20",
      strong: "border-white/30",
    },
  },

  // Consistent spacing rhythm
  spacing: {
    xs: "px-2 py-1", // Micro elements
    sm: "px-3 py-1.5", // Compact buttons
    md: "px-4 py-2", // Standard elements
    lg: "px-5 py-3", // Cards
    xl: "px-6 py-4", // Sections
    "2xl": "px-8 py-6", // Hero sections
  },

  // Typography scale - Natural flow inspired by ChatMessage
  text: {
    // Size and weight combinations - more readable and natural
    micro: "text-[10px] font-normal tracking-wide uppercase",
    xs: "text-xs font-normal",
    sm: "text-sm font-normal",
    base: "text-base font-normal",
    lg: "text-lg font-medium",
    xl: "text-xl font-medium",

    // Semantic styles - flowing and approachable
    label: "text-xs font-medium text-white/50 uppercase tracking-wide",
    body: "text-sm font-normal text-white/80",
    heading: "text-base font-medium text-white/90",
  },

  // Smooth, considered animations
  animation: {
    instant: { duration: 0 },
    fast: { duration: 0.15, ease: "easeOut" },
    smooth: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
    gentle: { duration: 0.5, ease: [0.19, 1, 0.22, 1] },
    slow: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },

  // Interaction states
  hover: {
    glow: "hover:shadow-lg hover:shadow-white/[0.03]",
    lift: "hover:-translate-y-0.5",
    brighten: "hover:bg-white/[0.05]",
  },
};

// Tool icon mapping - Mystical technology aesthetic
const getToolIcon = (toolName: string) => {
  const name = toolName.toLowerCase();

  // Cognitive operations (think tools are handled by UnifiedTimelineRenderer)
  if (name.includes("analyze") || name.includes("debug")) return Activity;
  if (name.includes("decompose") || name.includes("plan")) return Layers;

  // Information retrieval
  if (name.includes("search") && name.includes("web")) return Globe;
  if (name.includes("exa_search")) return Search;
  if (name.includes("scrape")) return FileSearch;

  // File manipulation
  if (name.includes("str_replace_editor")) return Edit3;
  if (name.includes("read_file")) return FileText;
  if (name.includes("search_file")) return FileSearch;
  if (name.includes("create_file") || name.includes("write_file"))
    return FileCode;
  if (name.includes("tree") || name.includes("find")) return FolderOpen;

  // System operations
  if (
    name.includes("execute") ||
    name.includes("bash") ||
    name.includes("command")
  )
    return Terminal;
  if (name.includes("git")) return GitBranch;
  if (name.includes("jupyter") || name.includes("analysis")) return Cpu;

  // Infrastructure
  if (name.includes("aws") || name.includes("cloud")) return Cloud;
  if (name.includes("supabase") || name.includes("database")) return Database;

  // Default - command/action
  return Command;
};

interface CombinedToolInteractionProps {
  interaction: {
    call: UnifiedToolCall;
    result?: UnifiedToolResult;
  };
  refinedMode?: boolean;
}

export default function CombinedToolInteraction({
  interaction,
  refinedMode = false,
}: CombinedToolInteractionProps) {
  // Defensive check for interaction structure
  if (!interaction) {
    console.warn("[CombinedToolInteraction] Missing interaction:", interaction);
    return null;
  }

  // The interaction object directly contains call and result, not wrapped in data
  const { call, result } = interaction;

  // Defensive check for call
  if (!call) {
    console.warn(
      "[CombinedToolInteraction] Missing call in interaction:",
      interaction
    );
    return null;
  }

  const isPending = !result;
  const isSuccess = true; // Always show as success for now
  const isThinkTool = call.name === "think";

  // State for expansion - managed at the top level for width control
  const [expanded, setExpanded] = useState(false);

  // Get current session ID for proper job correlation
  const { sessionId } = useParams<{ sessionId: string }>();

  // Approval workflow integration
  const { jobs, approve, reject } = usePendingToolsStore();
  const isSensitive = false;

  // PROPER MATCHING: session ID + tool use ID (the only correct way)
  const pendingJob =
    isSensitive && sessionId
      ? Object.values(jobs).find((job) => {
          // Must match BOTH session ID and tool use ID for correct correlation
          return (
            job.sse?.session_id === sessionId &&
            job.sse?.ji?.tool_use_id === call.id &&
            job.status === "waiting"
          );
        })
      : null;

  const isAwaitingApproval = !!pendingJob;

  // // Debug logging for job correlation
  // if (isSensitive) {
  //   // console.log('🔍 [UI] Tool call requires approval (PROPER MATCHING):', {
  //   //   currentSessionId: sessionId,
  //   //   toolCallId: call.id,
  //   //   toolName: call.name,
  //   //   allJobs: Object.values(jobs).map(j => ({
  //   //     id: j.id,
  //   //     status: j.status,
  //   //     toolName: j.sse?.ji?.tool_name,
  //   //     sessionId: j.sse?.session_id,
  //   //     isTest: j.id.startsWith('test_'),
  //   //     matchesSession: j.sse?.session_id === sessionId,
  //   //     matchesToolUseId: j.sse?.ji?.tool_use_id === call.id,
  //   //     matchesBoth: j.sse?.session_id === sessionId && j.sse?.ji?.tool_use_id === call.id
  //   //   })),
  //   //   matchingJob: pendingJob ? {
  //   //     id: pendingJob.id,
  //   //     status: pendingJob.status,
  //   //     toolName: pendingJob.sse?.ji?.tool_name,
  //   //     sessionId: pendingJob.sse?.session_id,
  //   //     correctMatch: true
  //   //   } : null,
  //   //   isAwaitingApproval,
  //   //   matchingCriteria: {
  //   //     sessionIdRequired: sessionId,
  //   //     toolUseIdRequired: call.id,
  //   //     statusRequired: 'waiting',
  //   //     lookingFor: 'job.sse.session_id === sessionId && job.sse.ji.tool_use_id === call.id'
  //   //   }
  //   // });
  // }

  // // Skip think tools - they are handled by UnifiedTimelineRenderer
  // if (isThinkTool) {
  //   return null;
  // }

  const ToolIcon = getToolIcon(call.name);

  // // DEBUG: Log what we're rendering
  // console.log('[CombinedToolInteraction] Rendering:', {
  //   callId: call?.id,
  //   callName: call?.name,
  //   resultId: result?.tool_use_id,
  //   resultToolName: result?.tool_name,
  //   hasCall: !!call,
  //   hasResult: !!result,
  //   refinedMode
  // });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={design.animation.gentle}
      className={cn("relative", expanded ? "max-w-[85%]" : "w-fit")}
    >
      {/* Ethereal glow for active operations */}
      {isPending && (
        <motion.div
          className="absolute -inset-4 bg-gradient-to-r from-blue-500/[0.03] to-purple-500/[0.03] blur-2xl"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <div className="relative flex gap-4">
        {/* Mystical avatar orb */}
        <div className="flex-shrink-0">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={design.animation.smooth}
            className="relative"
          >
            {/* Energy field for pending state */}
            {isPending && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(147, 51, 234, 0.2)",
                    "0 0 0 12px rgba(147, 51, 234, 0)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            )}

            {/* The orb itself */}
            <div
              className={cn(
                "relative w-10 h-10 flex items-center justify-center",
                design.radius.full,
                isPending ? design.glass.bg.medium : design.glass.bg.subtle,
                "backdrop-blur-2xl border",
                isPending
                  ? design.glass.border.light
                  : design.glass.border.subtle,
                "transition-all duration-500",
                "group-hover:scale-110"
              )}
            >
              <ToolIcon
                className={cn(
                  "w-5 h-5 transition-all duration-300",
                  isPending ? "text-white/80" : "text-white/50",
                  !isSuccess && !isPending && "text-red-400/50"
                )}
              />
            </div>
          </motion.div>
        </div>

        {/* Refined body */}
        <ToolCardBody
          call={call}
          result={result}
          isPending={isPending}
          isSuccess={isSuccess}
          isAwaitingApproval={isAwaitingApproval}
          pendingJob={pendingJob}
          approve={approve}
          reject={reject}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      </div>
    </motion.div>
  );
}

interface ToolCardBodyProps {
  call: any;
  result: any;
  isPending: boolean;
  isSuccess: boolean;
  isAwaitingApproval: boolean;
  pendingJob: any;
  approve: (id: string) => void;
  reject: (id: string) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

// Technical data display - Natural flow with mystical accents
function TechnicalDataDisplay({ data }: { data: any }) {
  if (!data || typeof data !== "object") {
    return (
      <code className="font-mono text-xs text-white/60 break-all">
        {String(data)}
      </code>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-start gap-3">
          <span className="font-medium text-xs text-purple-400/60 flex-shrink-0 min-w-[80px] capitalize">
            {key}
          </span>
          <div className="flex-1 min-w-0 overflow-hidden">
            <code className="font-mono text-xs text-white/70 break-all block overflow-x-auto max-w-full">
              {typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </code>
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolCardBody({
  call,
  result,
  isPending,
  isSuccess,
  isAwaitingApproval,
  pendingJob,
  approve,
  reject,
  expanded,
  setExpanded,
}: ToolCardBodyProps) {
  // Auto-expand when awaiting approval
  useEffect(() => {
    if (isAwaitingApproval) {
      setExpanded(true);
    }
  }, [isAwaitingApproval, setExpanded]);

  // Extract essence of the operation
  const getEssentialInfo = () => {
    const params = call.parameters || {};
    const toolName = (call.name || "").toLowerCase();

    // Helper function to safely get the filename from a path
    const safeGetFilename = (path: any): string | null => {
      if (typeof path === "string" && path) {
        const parts = path.split("/");
        return parts[parts.length - 1] || path;
      }
      return typeof path === "string" ? path : null;
    };

    // Extract the single most important piece of information
    if (toolName.includes("str_replace_editor") && params.path) {
      return safeGetFilename(params.path);
    }
    if (toolName.includes("search") && params.query) {
      return typeof params.query === "string" ? `"${params.query}"` : null;
    }
    if (toolName.includes("read_files") && params.files) {
      if (typeof params.files === "string") {
        return safeGetFilename(params.files);
      } else if (Array.isArray(params.files)) {
        if (params.files.length === 0) return null;
        if (params.files.length === 1) return safeGetFilename(params.files[0]);
        return `${params.files.length} files`;
      }
      return null;
    }
    if (params.path) return safeGetFilename(params.path);
    if (params.file) return safeGetFilename(params.file);
    if (params.query)
      return typeof params.query === "string" ? params.query : null;
    if (params.name)
      return typeof params.name === "string" ? params.name : null;

    // Return first string parameter if any
    const firstString = Object.values(params).find(
      (v) => typeof v === "string"
    );
    return firstString || null;
  };

  const essentialInfo = getEssentialInfo();
  const toolDisplayName = getToolDisplayName(call.name || "unknown");

  return (
    <div className="flex-1">
      <motion.div
        className={cn(
          "group relative overflow-hidden",
          design.radius.xl,
          expanded ? design.glass.bg.medium : design.glass.bg.subtle,
          "backdrop-blur-xl border",
          design.glass.border.subtle,
          "transition-all duration-300",
          !expanded && design.hover.brighten
        )}
      >
        {/* Minimal header - the primary interface */}
        <div
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "cursor-pointer",
            design.spacing.lg,
            "transition-all duration-200"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3
                  className={cn(
                    design.text.heading,
                    "transition-colors duration-200"
                  )}
                >
                  {toolDisplayName}
                </h3>

                {/* Approval status indicator */}
                {isAwaitingApproval && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">
                      Awaiting Approval
                    </span>
                  </div>
                )}

                {/* Essential context */}
                {essentialInfo && (
                  <span
                    className={cn(
                      "font-mono text-xs text-white/30 truncate max-w-[200px]"
                    )}
                  >
                    {essentialInfo}
                  </span>
                )}

                {/* Live status indicator */}
                {isPending && (
                  <motion.div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 rounded-full bg-blue-400/60"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Failure indicator */}
                {!isPending && !isSuccess && (
                  <span className={cn(design.text.micro, "text-red-400/60")}>
                    FAILED
                  </span>
                )}
              </div>
            </div>

            {/* Expand/collapse indicator */}
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={design.animation.smooth}
            >
              <ChevronDown className="w-4 h-4 text-white/20" />
            </motion.div>
          </div>
        </div>

        {/* Expanded content - Progressive disclosure */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={design.animation.fast}
            >
              {/* Divider */}
              <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className={cn(design.spacing.lg, "space-y-4")}>
                {/* Technical details - Direct display */}
                {(result || call.parameters) && (
                  <div className="space-y-3">
                    {/* Tool ID */}
                    <div className="flex items-start gap-3">
                      <span className={cn(design.text.label, "min-w-[80px]")}>
                        ID
                      </span>
                      <code className="font-mono text-xs text-white/50 break-all">
                        {call.id}
                      </code>
                    </div>

                    {/* Parameters */}
                    {call.parameters &&
                      Object.keys(call.parameters).length > 0 && (
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(design.text.label, "min-w-[80px]")}
                          >
                            PARAMS
                          </span>
                          <div className="flex-1 max-h-32 overflow-y-auto">
                            <TechnicalDataDisplay data={call.parameters} />
                          </div>
                        </div>
                      )}

                    {/* Raw result (gated by feature flag) */}
                    {result && (
                      <div className="flex items-start gap-3">
                        <span className={cn(design.text.label, "min-w-[80px]")}>
                          OUTPUT
                        </span>
                        <div className="flex-1 max-h-32 overflow-y-auto">
                          {featureFlags.hideToolResults ? (
                            <ToolOutputHiddenNotice />
                          ) : (
                            <TechnicalDataDisplay
                              data={isSuccess ? result.result : result.error}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Approval controls for sensitive tools */}
                {isAwaitingApproval && pendingJob && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className={cn(design.text.label, "min-w-[80px]")}>
                        APPROVAL
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Shield className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-white/70">
                            This tool requires your approval to execute
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => approve(pendingJob.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-lg",
                              "bg-green-600/20 hover:bg-green-600/30",
                              "border border-green-500/30 hover:border-green-500/50",
                              "text-green-400 hover:text-green-300",
                              "transition-all duration-200",
                              "text-sm font-medium"
                            )}
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </motion.button>
                          <motion.button
                            onClick={() => reject(pendingJob.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-lg",
                              "bg-red-600/20 hover:bg-red-600/30",
                              "border border-red-500/30 hover:border-red-500/50",
                              "text-red-400 hover:text-red-300",
                              "transition-all duration-200",
                              "text-sm font-medium"
                            )}
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading state for pending operations */}
                {isPending && !call.parameters && (
                  <motion.div
                    className={cn(design.text.body, "text-center py-8")}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Executing operation...
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
