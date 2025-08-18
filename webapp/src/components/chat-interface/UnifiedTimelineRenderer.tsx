// 🎨 UNIFIED TIMELINE EVENT RENDERER
// ACTUALLY copied from ChatDebugRefined for integration with ChatMain
// Handles tool calls, tool results, and file operations display

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from 'cn-utility';
import ChatMessage from './ChatMessage';
import MarkdownRenderer from './content-parts/MarkdownRenderer';
import CombinedToolInteraction from './content-parts/CombinedToolInteraction';
import {
  User,
  Bot,
  Brain,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { extractFileOperation } from '@/utils/timelineParser';

// Custom ThinkBlockDisplay component with consistent design (from ChatDebugRefined)
interface ThinkBlockProps {
  content: string;
  timestamp: string | number;
  id: string;
  defaultExpanded?: boolean;
}

// Combined Think Block Display for refined mode - combines multiple consecutive think blocks
interface CombinedThinkBlockProps {
  thinkTools: UnifiedToolCall[];
}

// Assistant Message with File Operations - combines assistant message and file operations
interface AssistantMessageWithFileOpsProps {
  message: any; // ChatMessage type
  fileOperations?: FileOperation[]; // Make optional to prevent undefined errors
  isLastMessage?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onFork?: () => void;
  shouldUseUnifiedRendering?: boolean;
  refinedMode?: boolean;
  isStreaming?: boolean;
}

function AssistantMessageWithFileOps({
  message,
  fileOperations = [], // Default to empty array
  isLastMessage = false,
  isFirstInGroup = false,
  isLastInGroup = false,
  showAvatar = false,
  showTimestamp = false,
  onFork,
  shouldUseUnifiedRendering = false,
  refinedMode = false,
  isStreaming = false
}: AssistantMessageWithFileOpsProps) {
  // Use the existing ChatMessage component for proper Markdown rendering
  // and append file operations below it
  return (
    <div className="space-y-2">
      {/* Use the original ChatMessage component with all its Markdown capabilities */}
      <ChatMessage
        message={message}
        onFork={onFork || (() => { })}
        isLastMessage={isLastMessage}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
        showAvatar={showAvatar}
        showTimestamp={showTimestamp}
      />

      {/* File Operations as a subtle addition below the message */}
      {false && fileOperations && fileOperations.length > 0 && (
        <div className={cn(
          "ml-11", // Align with message content (avatar width + gap)
          showAvatar ? "ml-11" : "ml-0"
        )}>
          <FileOperationsSummaryCompact operations={fileOperations} />
        </div>
      )}
    </div>
  );
}

import { useSessionStatusStore } from '@/stores/sessionStatusStore';
import { useCurrentSessionId } from '@/hooks/useCurrentSessionId';

function CombinedThinkBlockDisplay({ thinkTools }: CombinedThinkBlockProps) {
  const sessionId = useCurrentSessionId();
  const isIdle = useSessionStatusStore(s => (sessionId ? s.getStatus(sessionId) === 'idle' : true));
  const [expanded, setExpanded] = useState(!isIdle);


  if (thinkTools.length === 0) return null;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={design.animation.smooth}
    >
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          expanded ? "w-full text-left group" : "inline-flex items-center gap-2 text-left group",
          design.spacing.card,
          design.radius.xl,
          design.glass.bg.colored.purple,
          "border border-purple-500/20",
          "backdrop-blur-xl",
          "transition-all duration-200",
          design.hover.glow,
          "hover:bg-purple-500/[0.12] hover:border-purple-500/30",
          expanded && "rounded-b-none"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {expanded ? (
          <div className="flex items-center justify-between">
            <span className={cn(design.text.sm, "text-purple-300 font-medium")}>
              Thought Process
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 text-purple-400/60 transition-transform duration-200",
              expanded && "rotate-180"
            )} />
          </div>
        ) : (
          <>
            <span className={cn(design.text.sm, "text-purple-300 font-medium")}>
              Thoughts
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 text-purple-400/60 transition-transform duration-200",
              !expanded && "-rotate-90"
            )} />
          </>
        )}
      </motion.button>

      {/* <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={design.animation.smooth}
            className={cn(
              "overflow-hidden w-full",
              design.glass.bg.subtle,
              "border border-t-0 border-purple-500/20",
              "rounded-b-xl"
            )}
          >
            <div className={design.spacing.card}>
              <div className="space-y-3">
                {thinkTools.map((thinkTool, index) => (
                  <div key={thinkTool.id}>
                    {index > 0 && <div className="border-t border-purple-500/10 my-3" />}
                    <MarkdownRenderer
                      content={thinkTool.parameters?.thought || 'Processing...'}
                      variant="assistant"
                      className="text-purple-200/90"
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence> */}
    </motion.div>
  );
}

function ThinkBlockDisplay({ content, timestamp, defaultExpanded = false }: ThinkBlockProps) {
  const sessionId = useCurrentSessionId();
  const isIdle = useSessionStatusStore(s => (sessionId ? s.getStatus(sessionId) === 'idle' : true));
  const [expanded, setExpanded] = useState(defaultExpanded ? defaultExpanded : !isIdle);

  // Debug timestamp issues
  if (timestamp && isNaN(new Date(timestamp).getTime())) {
    console.warn('Invalid timestamp in ThinkBlockDisplay:', timestamp, typeof timestamp);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={design.animation.smooth}
      className="relative w-fit max-w-[85%]"
    >
      {/* Ethereal glow effect */}
      <motion.div
        className="absolute -inset-4 bg-gradient-to-r from-purple-500/[0.03] to-blue-500/[0.03] blur-2xl"
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <div className="relative flex gap-4">
        {/* Mystical avatar orb */}
        <div className="flex-shrink-0">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={design.animation.smooth}
            className="relative"
          >
            {/* The orb itself */}
            <div className={cn(
              'relative w-10 h-10 flex items-center justify-center',
              design.radius.full,
              design.glass.bg.subtle,
              'backdrop-blur-2xl border',
              design.glass.border.subtle,
              'transition-all duration-500',
              'group-hover:scale-110'
            )}>
              <Brain className={cn(
                "w-5 h-5 transition-all duration-300",
                "text-purple-400/70"
              )} />
            </div>
          </motion.div>
        </div>

        {/* Content area */}
        <div className="flex-1">
          <motion.div
            className={cn(
              "group relative overflow-hidden",
              design.radius.xl,
              expanded ? design.glass.bg.medium : design.glass.bg.subtle,
              'backdrop-blur-xl border',
              design.glass.border.subtle,
              'transition-all duration-300',
              !expanded && design.hover.brightness
            )}
          >
            {/* Header - click to expand/collapse */}
            <div 
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "cursor-pointer",
                design.spacing.card,
                "transition-all duration-200"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className={cn(
                      design.text.base,
                      "transition-colors duration-200"
                    )}>
                      Thoughts
                    </h3>
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
            
            {/* Expanded content */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={design.animation.smooth}
                >
                  {/* Divider */}
                  <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className={cn(design.spacing.card)}>
                    <MarkdownRenderer
                      content={content}
                      variant="assistant"
                      className="text-purple-200/90"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}


import type {
  UnifiedTimelineEvent,
  UnifiedMessage,
  UnifiedToolCall,
  UnifiedToolResult,
  FileOperation,
  ActiveTool,
  ThinkGroupTimelineEvent,
  ToolInteractionTimelineEvent
} from '@/types/unifiedTimeline';

// 🎨 DESIGN SYSTEM - Cohesive and polished (copied from ChatDebugRefined)
const design = {
  // Border radius system - limited to 4 values for consistency
  radius: {
    full: 'rounded-full',     // Pills, avatars, dots
    '2xl': 'rounded-2xl',     // Messages, primary containers
    xl: 'rounded-xl',         // Cards, secondary containers  
    lg: 'rounded-lg'          // Buttons, small elements
  },

  // Glass morphism system - consistent opacity
  glass: {
    bg: {
      subtle: 'bg-white/[0.03]',      // Very subtle, for large areas
      light: 'bg-white/[0.06]',       // Light glass effect
      medium: 'bg-white/[0.08]',      // Medium glass effect
      strong: 'bg-black/80',          // Strong, for overlays
      colored: {
        purple: 'bg-purple-500/[0.08]',
        emerald: 'bg-emerald-500/[0.08]',
        blue: 'bg-blue-500/[0.08]'
      }
    },
    border: {
      subtle: 'border-white/[0.06]',  // Barely visible
      light: 'border-white/[0.08]',   // Light borders
      medium: 'border-white/10',      // Standard borders
      strong: 'border-white/20'       // Emphasized borders
    }
  },

  // Standardized spacing
  spacing: {
    message: 'px-6 py-4',       // Large content areas
    card: 'px-5 py-3',          // Cards and containers
    pill: 'px-4 py-2',          // Pills and badges
    button: 'px-3 py-1.5',      // Buttons
    tiny: 'px-2 py-1'           // Tags and small elements
  },

  // Typography system
  text: {
    xs: 'text-xs font-medium',      // 12px - labels, meta
    sm: 'text-sm font-normal',      // 14px - body text
    base: 'text-base font-normal',  // 16px - emphasis
    lg: 'text-lg font-medium'       // 18px - headings
  },

  // Animation presets
  animation: {
    spring: { type: "spring", stiffness: 260, damping: 20 },
    smooth: { duration: 0.3, ease: "easeOut" },
    water: { duration: 0.4, ease: "easeOut" }
  },

  // Hover states
  hover: {
    scale: 'hover:scale-[1.02] active:scale-[0.98]',
    glow: 'hover:shadow-lg hover:shadow-white/[0.05]',
    brightness: 'hover:brightness-110'
  }
};

// Human-readable tool name mapping (ACTUAL from ChatDebugRefined)
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Web search and scraping
  'exa_search': 'Searching the web',
  'exa_get_contents': 'Reading web content',
  'exa_find_similar': 'Finding similar pages',
  'agentic_web_search': 'Searching the web',
  'scrape_url': 'Reading web content',

  // File operations
  'str_replace_editor': 'Editing files',
  'read_file': 'Reading files',
  'read_files': 'Reading files',
  'search_files': 'Searching files',
  'agentic_search_files_persistent': 'Searching files',
  'create_file': 'Creating files',
  'write_file': 'Writing files',
  'cat': 'Reading files',
  'grep': 'Searching files',
  'find': 'Finding files',
  'tree': 'Exploring files',

  // File system operations
  'mv': 'Managing files',
  'cp': 'Managing files',
  'mkdir': 'Managing files',
  'touch': 'Managing files',
  'pwd': 'Navigating filesystem',

  // Shell session management
  'initiate_runner_session': 'Setting up environment',
  'execute_in_runner_session': 'Running commands',
  'terminate_runner_session': 'Cleaning up environment',
  'execute_bash': 'Running commands',
  'execute_remote_command': 'Running commands',
  'set_runner_session_cwd': 'Running commands',
  'set_runner_session_env_var': 'Configuring environment',
  'unset_runner_session_env_var': 'Configuring environment',
  'get_runner_session_state': 'Checking environment',

  // Background process management
  'start_background_os_job_in_session': 'Starting background task',
  'get_background_os_job_status': 'Monitoring background task',
  'send_signal_to_os_job': 'Managing background task',

  // Git operations
  'git_clone': 'Managing code',
  'git_init': 'Managing code',
  'git_status': 'Managing code',
  'git_add': 'Managing code',
  'git_commit': 'Managing code',
  'git_push': 'Managing code',
  'git_pull': 'Managing code',
  'git_branch': 'Managing code',
  'git_checkout': 'Managing code',
  'git_log': 'Managing code',
  'git_diff': 'Managing code',
  'git_diff_advanced': 'Managing code',
  'git_show_files_at_commit': 'Managing code',
  'git_pr': 'Managing code',
  'git_list_prs': 'Managing code',
  'git_submit_pr': 'Managing code',

  // AWS operations
  'aws_cli': 'Managing cloud resources',

  // Supabase operations
  'supabase_list_projects': 'Managing database',
  'supabase_get_project_details': 'Managing database',
  'supabase_create_project': 'Managing database',
  'supabase_pause_project': 'Managing database',
  'supabase_restore_project': 'Managing database',
  'supabase_list_organizations': 'Managing database',
  'supabase_get_organization_details': 'Managing database',
  'supabase_list_tables': 'Managing database',
  'supabase_list_extensions': 'Managing database',
  'supabase_list_migrations': 'Managing database',
  'supabase_apply_migration': 'Managing database',
  'supabase_execute_sql': 'Managing database',
  'supabase_get_logs': 'Managing database',
  'supabase_execute_sql_with_json_files': 'Managing database',

  // Jupyter operations
  'create_jupyter_agent_instance': 'Setting up analysis environment',
  'start_jupyter_kernel': 'Setting up analysis environment',
  'execute_code_in_jupyter_kernel': 'Running analysis',
  'shutdown_jupyter_kernel': 'Cleaning up analysis environment',
  'cleanup_jupyter_agent_instance': 'Cleaning up analysis environment',
  'upload_file_to_jupyter_kernel': 'Managing analysis files',
  'upload_files_to_jupyter_kernel': 'Managing analysis files',
  'download_url_to_jupyter_kernel': 'Managing analysis files',
  'list_jupyter_kernel_files': 'Managing analysis files',
  'delete_jupyter_kernel_file': 'Managing analysis files',

  // Analysis and reasoning
  'think': 'Thought Process',
  'decompose_problem_recursively': 'Analyzing problem',
  'log_hypothesis_test_cycle': 'Testing approach',
  'analyze_root_cause': 'Investigating issue',
  'agentic_debug': 'Debugging issue',
  'ask_oracle': 'Consulting experts',

  // Document processing
  'pdf_extract_text': 'Processing documents',

  // Development tools
  'run_command': 'Running commands',
  'bun': 'Running build tools',
  'bunx': 'Running build tools',
  'spawn_agent_sync': 'Running specialized task',

  'plan_create_structure': 'Creating plan outline',
  'plan_finalize': 'Planning',
  'plan_add_tasks': 'Planning',
  'plan_mark_todo': 'Checking off plan'
};

// Get human-readable tool name
function getToolDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName.replace(/_/g, ' ');
}





// 🎨 UNIFIED TIMELINE EVENT RENDERER (ACTUAL from ChatDebugRefined)
export function renderUnifiedTimelineEvent(event: UnifiedTimelineEvent, eventIndex: number, allEvents: UnifiedTimelineEvent[], isCurrentReplayEvent?: boolean, refinedMode = false): React.ReactNode {
  const key = `unified-${event.id}-${eventIndex}`;
  

  switch (event.type) {
    case 'tool_call':
      const toolCall = event.data as UnifiedToolCall;

      // Defensive check for missing name
      if (!toolCall || !toolCall.name) {
        console.warn('[UnifiedTimelineRenderer] Tool call missing name:', toolCall);
        return null;
      }

      // Special handling for think blocks - the only tool we show prominently
      if (toolCall.name === 'think') {
        return (
          <motion.div 
            key={key} 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 0.4,
              ease: [0.19, 1, 0.22, 1] // Water-like easing
            }}
            className="flex"
          >
            <div className="flex-1 max-w-[85%]">
              <ThinkBlockDisplay
                content={toolCall.parameters?.thought || 'Processing...'}
                timestamp={toolCall.timestamp}
                id={toolCall.id}
                defaultExpanded={true}
              />
            </div>
          </motion.div>
        );
      }

      // For non-think tools, use the detailed display
      return null;
      // return (
      //   <DetailedToolCallDisplay
      //     key={key}
      //     toolCall={toolCall}
      //     eventIndex={eventIndex}
      // />
      // );

    case 'tool_interaction':
      const interaction = event.data as ToolInteractionTimelineEvent;

      return (
        <>
          <CombinedToolInteraction
            key={key}
            interaction={interaction}
            refinedMode={refinedMode}
          />
        </>
      );

    default:
      return null;
  }
}

// Group events intelligently for better UX (ACTUAL from ChatDebugRefined)
export function renderGroupedEvents(events: UnifiedTimelineEvent[], currentReplayEventId?: string): React.ReactNode {
  const groups: React.ReactNode[] = [];
  let i = 0;

  while (i < events.length) {
    const event = events[i];

    if (event.type === 'message') {
      const message = event.data as UnifiedMessage;

      // Collect everything that happens after this message until the next message
      const activityAfterMessage: React.ReactNode[] = [];
      let j = i + 1;

      while (j < events.length && events[j].type !== 'message') {
        const activityEvent = events[j];

        if (activityEvent.type === 'tool_call') {
          const toolCall = activityEvent.data as UnifiedToolCall;

          if (toolCall && toolCall.name === 'think') {
            // Render think blocks
            activityAfterMessage.push(
              <div key={`think-${j}`}>
                {renderUnifiedTimelineEvent(activityEvent, j, events, currentReplayEventId === activityEvent.id, false)}
              </div>
            );
          }
          // Tool indicators are now shown in the floating pill
        }
        j++;
      }

      // Check if this is the final assistant message
      let isFinalAssistantMessage = false;
      if (message.role === 'assistant') {
        let hasMoreAssistantMessages = false;
        for (let k = j; k < events.length; k++) {
          if (events[k].type === 'message' && (events[k].data as UnifiedMessage).role === 'assistant') {
            hasMoreAssistantMessages = true;
            break;
          }
        }
        isFinalAssistantMessage = !hasMoreAssistantMessages;
      }

      // Skip intermediate assistant messages
      const shouldShowMessage = message.role === 'user' || isFinalAssistantMessage;

      if (shouldShowMessage) {
        // Collect all tool calls for the pill (excluding think)
        const allToolCalls = events
          .filter(e => e.type === 'tool_call')
          .map(e => e.data as UnifiedToolCall)
          .filter(tc => tc.name !== 'think');

        groups.push(
          <div key={`group-${i}`}>
            {/* Show tool status pill before final assistant message */}
            {isFinalAssistantMessage && allToolCalls.length > 0 && (
              <DynamicToolStatusPill toolCalls={allToolCalls} />
            )}
            {renderUnifiedTimelineEvent(event, i, events, currentReplayEventId === event.id, false)}
            {activityAfterMessage}
          </div>
        );
      } else {
        // For intermediate messages, just show the activity
        groups.push(
          <div key={`activity-${i}`} className="space-y-1">
            {activityAfterMessage}
          </div>
        );
      }

      i = j;
    } else {
      i++;
    }
  }

  // Add file operations summary at the end
  const fileOps: FileOperation[] = [];
  events.forEach(event => {
    if (event.type === 'tool_call') {
      const toolCall = event.data as UnifiedToolCall;
      const toolResult = events.find(e =>
        e.type === 'tool_result' &&
        (e.data as UnifiedToolResult).toolCallId === toolCall.id
      );
      const op = extractFileOperation(toolCall, toolResult?.data as UnifiedToolResult);
      if (op) fileOps.push(op);
    }
  });

  if (false && fileOps.length > 0) {
    groups.push(<FileOperationsSummary key="file-ops" operations={fileOps} />);
  }

  return <>{groups}</>;
}



// Detailed Tool Call Display - shows full tool information in unrefined mode
interface DetailedToolCallDisplayProps {
  toolCall: UnifiedToolCall;
  eventIndex: number;
}

function DetailedToolCallDisplay({ toolCall, eventIndex }: DetailedToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract key parameters for display
  const getToolParameters = () => {
    const params = toolCall.parameters || {};
    const keyParams: { [key: string]: any } = {};

    // Extract the most relevant parameters based on tool type
    switch ((toolCall.name || '').toLowerCase()) {
      case 'str_replace_editor':
        if (params.path) keyParams.file = params.path;
        if (params.command) keyParams.action = params.command;
        if (params.old_str) keyParams.replacing = params.old_str.substring(0, 100) + (params.old_str.length > 100 ? '...' : '');
        break;
      case 'read_files':
        if (params.files) keyParams.files = Array.isArray(params.files) ? params.files.slice(0, 3) : [params.files];
        break;
      case 'search_files':
        if (params.pattern) keyParams.pattern = params.pattern;
        if (params.content) keyParams.content = params.content;
        break;
      case 'exa_search':
        if (params.query) keyParams.query = params.query;
        if (params.num_results) keyParams.results = params.num_results;
        break;
      default:
        // For other tools, show first few parameters
        Object.keys(params).slice(0, 3).forEach(key => {
          keyParams[key] = typeof params[key] === 'string' && params[key].length > 50
            ? params[key].substring(0, 50) + '...'
            : params[key];
        });
    }

    return keyParams;
  };

  const keyParams = getToolParameters();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.19, 1, 0.22, 1] // Water-like easing
      }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0">
        <motion.div
          className="relative w-8 h-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1
          }}
        >
          {/* Subtle pulsing glow */}
          <motion.div
            className={cn("absolute inset-0", design.radius.full, "bg-blue-500/20")}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.2, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <div className={cn(
            "relative w-8 h-8 flex items-center justify-center",
            design.radius.full,
            design.glass.bg.colored.blue,
            "border border-blue-500/20",
            "backdrop-blur-xl"
          )}>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
        </motion.div>
      </div>
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "cursor-pointer",
            design.radius.xl,
            design.glass.bg.colored.blue,
            "border border-blue-500/20",
            "backdrop-blur-xl p-4",
            "hover:bg-blue-500/[0.12] transition-colors duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className={cn(design.text.sm, "text-blue-200 font-medium")}>
                {getToolDisplayName(toolCall.name || 'unknown')}
              </span>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-blue-400/60"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>

          {/* Key parameters preview */}
          <div className="space-y-1">
            {Object.entries(keyParams).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2">
                <span className={cn(design.text.xs, "text-blue-300/60 min-w-0 capitalize")}>
                  {key}:
                </span>
                <span className={cn(design.text.xs, "text-blue-200/80 font-mono break-all")}>
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="mt-3 pt-3 border-t border-blue-500/20"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(design.text.xs, "text-blue-300/60")}>Tool ID:</span>
                    <span className={cn(design.text.xs, "text-blue-200/80 font-mono")}>{toolCall.id}</span>
                  </div>

                  {toolCall.parameters && Object.keys(toolCall.parameters).length > 0 && (
                    <div>
                      <span className={cn(design.text.xs, "text-blue-300/60 block mb-1")}>Full Parameters:</span>
                      <pre className={cn(
                        design.text.xs,
                        "text-blue-200/70 font-mono bg-blue-500/[0.05] p-2 rounded border border-blue-500/10 overflow-x-auto max-h-32"
                      )}>
                        {JSON.stringify(toolCall.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Detailed Tool Result Display - shows full result information in unrefined mode
interface DetailedToolResultDisplayProps {
  toolResult: UnifiedToolResult;
  eventIndex: number;
}

function DetailedToolResultDisplay({ toolResult, eventIndex }: DetailedToolResultDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract preview of the result
  const getResultPreview = () => {
    if (toolResult.result === undefined || toolResult.result === null) return 'No content';

    const content = typeof toolResult.result === 'string'
      ? toolResult.result
      : JSON.stringify(toolResult.result);

    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  };

  const isSuccess = toolResult.ok !== false;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.19, 1, 0.22, 1] // Water-like easing
      }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0">
        <motion.div
          className="relative w-8 h-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1
          }}
        >
          <div className={cn(
            "relative w-8 h-8 flex items-center justify-center",
            design.radius.full,
            isSuccess ? design.glass.bg.colored.emerald : "bg-red-500/[0.08]",
            "border",
            isSuccess ? "border-emerald-500/20" : "border-red-500/20",
            "backdrop-blur-xl"
          )}>
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
          </div>
        </motion.div>
      </div>
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "cursor-pointer",
            design.radius.xl,
            isSuccess ? design.glass.bg.colored.emerald : "bg-red-500/[0.08]",
            "border",
            isSuccess ? "border-emerald-500/20" : "border-red-500/20",
            "backdrop-blur-xl p-4",
            isSuccess ? "hover:bg-emerald-500/[0.12]" : "hover:bg-red-500/[0.12]",
            "transition-colors duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={cn(design.text.sm, isSuccess ? "text-emerald-200 font-medium" : "text-red-200 font-medium")}>
                {isSuccess ? 'Completed' : 'Failed'}: {getToolDisplayName(toolResult.toolName || 'Unknown')}
              </span>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className={isSuccess ? "text-emerald-400/60" : "text-red-400/60"}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>

          {/* Result preview */}
          <div className="mb-2">
            <span className={cn(design.text.xs, isSuccess ? "text-emerald-200/80" : "text-red-200/80")}>
              {getResultPreview()}
            </span>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "mt-3 pt-3 border-t",
                  isSuccess ? "border-emerald-500/20" : "border-red-500/20"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(design.text.xs, isSuccess ? "text-emerald-300/60" : "text-red-300/60")}>
                      Tool Call ID:
                    </span>
                    <span className={cn(design.text.xs, isSuccess ? "text-emerald-200/80" : "text-red-200/80", "font-mono")}>
                      {toolResult.toolCallId}
                    </span>
                  </div>

                  {toolResult.result && (
                    <div>
                      <span className={cn(design.text.xs, isSuccess ? "text-emerald-300/60" : "text-red-300/60", "block mb-1")}>
                        Full Result:
                      </span>
                      <pre className={cn(
                        design.text.xs,
                        isSuccess ? "text-emerald-200/70" : "text-red-200/70",
                        "font-mono p-2 rounded border overflow-x-auto max-h-48",
                        isSuccess ? "bg-emerald-500/[0.05] border-emerald-500/10" : "bg-red-500/[0.05] border-red-500/10"
                      )}>
                        {typeof toolResult.result === 'string'
                          ? toolResult.result
                          : JSON.stringify(toolResult.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!isSuccess && toolResult.error && (
                    <div>
                      <span className={cn(design.text.xs, "text-red-300/60 block mb-1")}>Error Details:</span>
                      <pre className={cn(
                        design.text.xs,
                        "text-red-200/70 font-mono bg-red-500/[0.05] p-2 rounded border border-red-500/10 overflow-x-auto max-h-32"
                      )}>
                        {toolResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Dynamic Tool Status Pill - shows current tool being executed (ACTUAL from ChatDebugRefined)
interface DynamicToolStatusPillProps {
  toolCalls: UnifiedToolCall[];
}

function DynamicToolStatusPill({ toolCalls }: DynamicToolStatusPillProps) {
  const sessionId = useCurrentSessionId();
  const isAwaiting = useSessionStatusStore(s => (sessionId ? s.getStatus(sessionId) === 'awaiting' : false));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get a meaningful summary of what's happening
  const getStatusMessage = () => {
    if (toolCalls.length === 0) return '';

    // For a small number of tools, just say how many
    if (toolCalls.length === 1) {
      const toolName = getToolDisplayName(toolCalls[0].name);
      return toolName;
    }

    if (toolCalls.length <= 3) {
      return `Used ${toolCalls.length} tools`;
    }

    // For many tools, give a count
    return `Executed ${toolCalls.length} operations`;
  };

  // Cycle through tools if awaiting
  useEffect(() => {
    if (!isAwaiting || toolCalls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % toolCalls.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [toolCalls.length, isAwaiting]);

  if (toolCalls.length === 0) return null;

  const statusMessage = getStatusMessage();
  const showExpandable = toolCalls.length > 1 && !isAwaiting;

  return (
    <div>
      {showExpandable ? (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-colors mb-2"
        >
          <Activity className="w-3 h-3" />
          <span>{statusMessage}</span>
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
          {isAwaiting ? (
            <>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full bg-white/40"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
              <span>{toolCalls.length > 0 ?
                `Running: ${getToolDisplayName(toolCalls[currentIndex].name)}` :
                "Processing request..."}</span>
            </>
          ) : (
            <>
              <Activity className="w-3 h-3" />
              <span>{statusMessage}</span>
            </>
          )}
        </div>
      )}

      {/* Expandable tool list - stays in place */}
      <AnimatePresence>
        {isExpanded && showExpandable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-5 space-y-1 max-h-32 overflow-y-auto mb-2">
              {toolCalls.map((toolCall, index) => (
                <div key={toolCall.id} className="flex items-center gap-2 text-xs text-white/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span>{getToolDisplayName(toolCall.name || 'unknown')}</span>
                  {toolCall.parameters?.query && (
                    <span className="text-white/30 truncate max-w-xs">
                      "{toolCall.parameters.query}"
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact file operations summary for refined mode
function FileOperationsSummaryCompact({ operations }: { operations: FileOperation[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (operations.length === 0) return null;

  // Group operations by file
  const fileGroups = operations.reduce((acc, op) => {
    if (!acc[op.path]) acc[op.path] = [];
    acc[op.path].push(op);
    return acc;
  }, {} as Record<string, FileOperation[]>);

  const fileCount = Object.keys(fileGroups).length;
  const createdCount = Object.entries(fileGroups).filter(([_, ops]) =>
    ops.some(op => op.type === 'created')
  ).length;
  const modifiedCount = fileCount - createdCount;

  // Build summary message
  const parts = [];
  if (createdCount > 0) {
    parts.push(`${createdCount} file${createdCount > 1 ? 's' : ''} created`);
  }
  if (modifiedCount > 0) {
    parts.push(`${modifiedCount} file${modifiedCount > 1 ? 's' : ''} modified`);
  }
  const summaryMessage = parts.join(', ');

  // For just 1-2 files, show them directly
  if (fileCount <= 2) {
    return (
      <div className="space-y-1">
        {Object.entries(fileGroups).map(([path, ops]) => {
          const isNew = ops.some(op => op.type === 'created');
          return (
            <div key={path} className="flex items-center gap-2 text-xs text-white/50">
              <FileText className="w-3 h-3" />
              <span className="font-medium">
                {isNew ? 'Created' : 'Updated'}
              </span>
              <span className="font-mono text-white/40 truncate max-w-md">
                {path}
              </span>
              <CheckCircle2 className="w-3 h-3 text-emerald-500/50" />
            </div>
          );
        })}
      </div>
    );
  }

  // For many files, show expandable summary
  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-colors"
      >
        <FileText className="w-3 h-3" />
        <span>{summaryMessage}</span>
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-5 space-y-1 max-h-48 overflow-y-auto">
              {Object.entries(fileGroups).map(([path, ops]) => {
                const isNew = ops.some(op => op.type === 'created');
                const updateCount = ops.filter(op => op.type === 'modified').length;

                return (
                  <div key={path} className="flex items-center gap-2 text-xs text-white/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span className="font-mono truncate max-w-md">
                      {path}
                    </span>
                    <span className="text-white/30">
                      {isNew ? 'new' : updateCount > 1 ? `${updateCount}x` : 'modified'}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// File operation tracking component - elegant summary of AI's work (ACTUAL from ChatDebugRefined)
function FileOperationsSummary({ operations }: { operations: FileOperation[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (operations.length === 0) return null;

  // Group operations by file
  const fileGroups = operations.reduce((acc, op) => {
    if (!acc[op.path]) acc[op.path] = [];
    acc[op.path].push(op);
    return acc;
  }, {} as Record<string, FileOperation[]>);

  const fileCount = Object.keys(fileGroups).length;
  const createdFiles = Object.entries(fileGroups).filter(([_, ops]) =>
    ops.some(op => op.type === 'created')
  ).length;

  // Extract just the filename from path for cleaner display
  const getFileName = (path: string) => path.split('/').pop() || path;

  return (
    <div className="space-y-2">
      {Object.entries(fileGroups).map(([path, ops], index) => {
        const isNew = ops.some(op => op.type === 'created');
        const fileName = getFileName(path);

        return (
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]"
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
                <FileText className="w-4 h-4 text-white/50" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/90">
                  {isNew ? 'Created' : 'Updated'}
                </span>
                <span className="text-xs text-white/40">•</span>
                <span className="text-xs text-white/60 font-mono truncate">
                  {path}
                </span>
              </div>
              <div className="mt-1 text-xs text-white/50">
                {fileName}
              </div>
            </div>
            {ops[0].success !== false && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500/70 flex-shrink-0" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// Inline tool status pill component (ACTUAL from ChatDebugRefined)
function InlineToolPill({ tool }: { tool: ActiveTool }) {
  const duration = tool.endTime
    ? Math.floor((tool.endTime - tool.startTime) / 1000)
    : Math.floor((Date.now() - tool.startTime) / 1000);

  return (
    <div className={cn(
      "inline-flex items-center gap-2 transition-all duration-300",
      design.radius.full,
      design.spacing.pill,
      design.text.xs,
      "backdrop-blur-sm border",
      tool.status === 'running' && "bg-blue-500/[0.08] text-blue-300 border-blue-500/20",
      tool.status === 'completed' && "bg-emerald-500/[0.08] text-emerald-300 border-emerald-500/20",
      tool.status === 'failed' && "bg-red-500/[0.08] text-red-300 border-red-500/20"
    )}>
      {tool.status === 'running' && (
        <div className="relative">
          <Loader2 className="w-3 h-3 animate-spin" />
          <div className="absolute inset-0 w-3 h-3 animate-ping opacity-30">
            <Loader2 className="w-3 h-3" />
          </div>
        </div>
      )}
      {tool.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
      {tool.status === 'failed' && <XCircle className="w-3 h-3" />}
      <span>{getToolDisplayName(tool.name)}</span>
      {duration > 0 && (
        <span className="opacity-60">{duration}s</span>
      )}
    </div>
  );
}

// Inline Tool Activity Indicator - shows between messages (ACTUAL from ChatDebugRefined)
interface InlineToolActivityProps {
  toolCalls: UnifiedToolCall[];
  isActive: boolean;
}

function InlineToolActivity({ toolCalls, isActive }: InlineToolActivityProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (toolCalls.length === 0) return null;

  // Format tool names for display
  const formatToolName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Exa Search', 'Searching')
      .replace('Str Replace Editor', 'Editing Files')
      .replace('Read Files', 'Reading Files')
      .replace('Search Files', 'Searching Files');
  };

  // Get unique tools used
  const uniqueTools = Array.from(new Set(toolCalls.map(tc => tc.name)));
  const currentTool = toolCalls[toolCalls.length - 1]?.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
      className="flex gap-3 my-2"
    >
      <div className="flex-shrink-0 w-8" /> {/* Align with message avatars */}

      <div className="relative">
        <motion.button
          className={cn(
            "relative overflow-hidden",
            "inline-flex items-center gap-2 px-2.5 py-1 rounded-full",
            "bg-purple-500/[0.08] border border-purple-500/[0.15]",
            "hover:bg-purple-500/[0.12] hover:border-purple-500/[0.25]",
            "transition-all duration-200",
            "text-xs"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Subtle shimmer for active state */}
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/[0.1] to-transparent"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}

          {/* Content */}
          <div className="relative flex items-center gap-1.5">
            {isActive ? (
              <div className="flex items-center gap-0.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full bg-purple-400/80"
                    animate={{
                      y: [0, -3, 0]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
            )}

            <span className="text-purple-300/90 font-medium">
              {isActive && currentTool
                ? formatToolName(currentTool)
                : `${uniqueTools.length} ${uniqueTools.length === 1 ? 'tool' : 'tools'}`
              }
            </span>

            <ChevronRight className={cn(
              "w-2.5 h-2.5 text-purple-400/40 transition-transform",
              isExpanded && "rotate-90"
            )} />
          </div>
        </motion.button>

        {/* Expanded tool list */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute mt-1 left-0 bg-black/95 backdrop-blur-xl border border-white/[0.08] rounded-lg p-2.5 z-10 min-w-[160px]"
            >
              <div className="space-y-1.5">
                {uniqueTools.map((tool, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="w-1 h-1 rounded-full bg-purple-400/60" />
                    <span className="text-white/70">{formatToolName(tool)}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Export components for use in other files
export { InlineToolActivity, FileOperationsSummary, FileOperationsSummaryCompact, InlineToolPill, DynamicToolStatusPill, CombinedThinkBlockDisplay, ThinkBlockDisplay, AssistantMessageWithFileOps };
export { default as CombinedToolInteractionDisplay } from './content-parts/CombinedToolInteraction';