/**
 * Combined Tool Interaction Component
 * 
 * Displays tool calls and their results in a unified, collapsible card.
 * Shows live progress during streaming and final status when complete.
 * 
 * Design Philosophy: Apple-inspired clarity with water-themed continuity.
 * Progressive disclosure, intelligent information design, and delightful micro-interactions.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolInteractionTimelineEvent } from '@/types/unifiedTimeline';
import MarkdownRenderer from './MarkdownRenderer';
import { getToolDisplayName } from '@/utils/timelineHelpers';

// Design system constants matching UnifiedTimelineRenderer
const design = {
  radius: {
    full: 'rounded-full',
    '2xl': 'rounded-2xl',
    xl: 'rounded-xl',
    lg: 'rounded-lg'
  },
  glass: {
    bg: {
      subtle: 'bg-white/[0.03]',
      light: 'bg-white/[0.06]',
      medium: 'bg-white/[0.08]',
      strong: 'bg-black/80',
      colored: {
        purple: 'bg-purple-500/[0.08]',
        emerald: 'bg-emerald-500/[0.08]',
        blue: 'bg-blue-500/[0.08]',
        red: 'bg-red-500/[0.08]',
        amber: 'bg-amber-500/[0.08]'
      }
    },
    border: {
      subtle: 'border-white/[0.06]',
      light: 'border-white/[0.08]',
      medium: 'border-white/10',
      strong: 'border-white/20'
    }
  },
  spacing: {
    message: 'px-6 py-4',
    card: 'px-5 py-3',
    pill: 'px-4 py-2',
    button: 'px-3 py-1.5',
    tiny: 'px-2 py-1'
  },
  text: {
    xs: 'text-xs font-medium',
    sm: 'text-sm font-normal',
    base: 'text-base font-normal',
    lg: 'text-lg font-medium'
  },
  animation: {
    spring: { type: "spring", stiffness: 260, damping: 20 },
    smooth: { duration: 0.3, ease: "easeOut" },
    water: { duration: 0.4, ease: [0.19, 1, 0.22, 1] }
  },
  hover: {
    scale: 'hover:scale-[1.02] active:scale-[0.98]',
    glow: 'hover:shadow-lg hover:shadow-white/[0.05]',
    brightness: 'hover:brightness-110'
  }
};

// Tool icon mapping for better visual communication
const getToolIcon = (toolName: string) => {
  const name = toolName.toLowerCase();
  
  // Web & Search
  if (name.includes('search') && name.includes('web')) return Globe;
  if (name.includes('exa_search')) return Search;
  if (name.includes('scrape')) return FileSearch;
  
  // File operations
  if (name.includes('str_replace_editor')) return Edit3;
  if (name.includes('read_file')) return FileText;
  if (name.includes('search_file')) return FileSearch;
  if (name.includes('create_file') || name.includes('write_file')) return FileCode;
  if (name.includes('tree') || name.includes('find')) return FolderOpen;
  
  // Development
  if (name.includes('execute') || name.includes('bash') || name.includes('command')) return Terminal;
  if (name.includes('git')) return GitBranch;
  if (name.includes('jupyter') || name.includes('analysis')) return Cpu;
  
  // Cloud & Database
  if (name.includes('aws') || name.includes('cloud')) return Cloud;
  if (name.includes('supabase') || name.includes('database')) return Database;
  
  // Analysis
  if (name.includes('think')) return Brain;
  if (name.includes('analyze') || name.includes('debug')) return Sparkles;
  
  // Default
  return Zap;
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
  refinedMode = false
}: CombinedToolInteractionProps) {
  // Defensive check for interaction structure
  if (!interaction) {
    console.warn('[CombinedToolInteraction] Missing interaction:', interaction);
    return null;
  }

  // The interaction object directly contains call and result, not wrapped in data
  const { call, result } = interaction;
  
  // Defensive check for call
  if (!call) {
    console.warn('[CombinedToolInteraction] Missing call in interaction:', interaction);
    return null;
  }

  const isPending = !result;
  const isSuccess = result?.success !== false;
  const isThinkTool = call.name === 'think';

  // In refined mode, non-think tools are handled by the status pill
  if (refinedMode && !isThinkTool) {
    return null;
  }

  // Special rendering for think tools
  if (isThinkTool) {
    return (
      <ThinkToolDisplay 
        call={call} 
        result={result} 
        isPending={isPending}
      />
    );
  }

  const ToolIcon = getToolIcon(call.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={design.animation.water}
      className="flex gap-3"
    >
      {/* Minimal avatar - consistent with system design */}
      <div className="flex-shrink-0">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={design.animation.spring}
          className="relative"
        >
          {/* Subtle pulse for pending state */}
          {isPending && (
            <motion.div 
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(255, 255, 255, 0.1)",
                  "0 0 0 8px rgba(255, 255, 255, 0)",
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
          
          <div className={cn(
            'relative w-8 h-8 flex items-center justify-center',
            design.radius.full,
            design.glass.bg.subtle,
            'backdrop-blur-xl border',
            design.glass.border.subtle,
            'transition-all duration-300'
          )}>
            <ToolIcon className={cn(
              "w-4 h-4 transition-opacity duration-300",
              isPending ? "text-white/60" : "text-white/40",
              !isSuccess && !isPending && "text-white/30"
            )} />
          </div>
        </motion.div>
      </div>

      {/* Clean, minimal body */}
      <ToolCardBody 
        call={call} 
        result={result} 
        isPending={isPending} 
        isSuccess={isSuccess} 
      />
    </motion.div>
  );
}

interface ThinkToolDisplayProps {
  call: any;
  result: any;
  isPending: boolean;
}

function ThinkToolDisplay({ call, result, isPending }: ThinkToolDisplayProps) {
  const [expanded, setExpanded] = useState(!isPending);
  const content = call.parameters?.thought || 'Processing...';

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={design.animation.smooth}
      className="flex gap-3"
    >
      {/* Minimal avatar matching system design */}
      <div className="flex-shrink-0">
        <motion.div 
          className="relative w-8 h-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={design.animation.spring}
        >
          {/* Very subtle pulse for thinking state */}
          {isPending && (
            <motion.div 
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(255, 255, 255, 0.05)",
                  "0 0 0 8px rgba(255, 255, 255, 0)",
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
          
          <div className={cn(
            "relative w-8 h-8 flex items-center justify-center",
            design.radius.full,
            design.glass.bg.subtle,
            "border",
            design.glass.border.subtle,
            "backdrop-blur-xl"
          )}>
            <Brain className="w-4 h-4 text-white/50" />
          </div>
        </motion.div>
      </div>
      
      <div className="flex-1 max-w-[85%]">
        <motion.div className="relative">
          <motion.button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              expanded ? "w-full text-left group" : "inline-flex items-center gap-2 text-left group",
              design.spacing.card,
              design.radius.xl,
              design.glass.bg.subtle,
              "border",
              design.glass.border.subtle,
              "backdrop-blur-xl",
              "transition-all duration-200",
              "hover:bg-white/[0.05]",
              expanded && "rounded-b-none"
            )}
          >
            {expanded ? (
              <div className="flex items-center justify-between">
                <span className={cn(design.text.sm, "text-white/70 font-medium")}>
                  Thought Process
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-white/30 transition-transform duration-200",
                  expanded && "rotate-180"
                )} />
              </div>
            ) : (
              <>
                <span className={cn(design.text.sm, "text-white/70 font-medium")}>
                  {isPending ? 'Thinking' : 'Thoughts'}
                </span>
                {isPending && (
                  <motion.div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 rounded-full bg-white/40"
                        animate={{
                          opacity: [0.2, 0.6, 0.2]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </motion.div>
                )}
                <ChevronDown className={cn(
                  "w-4 h-4 text-white/30 transition-transform duration-200",
                  !expanded && "-rotate-90"
                )} />
              </>
            )}
          </motion.button>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={design.animation.smooth}
                className={cn(
                  "overflow-hidden w-full",
                  design.glass.bg.subtle,
                  "border border-t-0",
                  design.glass.border.subtle,
                  "rounded-b-xl"
                )}
              >
                <div className={design.spacing.card}>
                  <MarkdownRenderer 
                    content={content} 
                    variant="assistant"
                    className="text-white/70 leading-relaxed"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

interface ToolCardBodyProps {
  call: any;
  result: any;
  isPending: boolean;
  isSuccess: boolean;
}

// Technical data display component for clean parameter display
function TechnicalDataDisplay({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <span className="font-mono text-white/60 text-xs break-all">{String(data)}</span>;
  }

  return (
    <div className="space-y-1">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2">
          <span className="text-white/40 text-xs flex-shrink-0 capitalize">{key}:</span>
          <span className="font-mono text-white/60 text-xs break-all">
            {typeof value === 'string' && value.length > 100 
              ? value.substring(0, 100) + '...' 
              : typeof value === 'object' 
                ? JSON.stringify(value, null, 2)
                : String(value)
            }
          </span>
        </div>
      ))}
    </div>
  );
}

// Semantic result display component - shows meaningful information about what happened
function SemanticResultDisplay({ toolName, result, isSuccess, call }: { 
  toolName: string, 
  result: any, 
  isSuccess: boolean,
  call?: any 
}) {
  if (!result) return null;
  
  const data = isSuccess ? result.result : result.error;
  const name = toolName?.toLowerCase() || '';
  
  // Handle errors with more detail
  if (!isSuccess) {
    const errorMessage = typeof data === 'string' ? data : 
                        data?.message || data?.error || 'Operation failed';
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-red-400/80 uppercase tracking-wide">Error</span>
        </div>
        <div className="text-sm text-white/60 bg-red-500/[0.05] border border-red-500/20 rounded-lg p-3">
          {errorMessage}
        </div>
      </div>
    );
  }
  
  // File operations - str_replace_editor
  if (name.includes('str_replace_editor')) {
    const params = call?.parameters || {};
    
    if (params.command === 'view' && typeof data === 'string') {
      const lines = data.split('\n');
      const contentLines = lines.filter(line => !line.includes('Result of reading'));
      const lineCount = contentLines.length;
      
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wide">File Content</span>
            <span className="text-xs text-white/40">{lineCount} lines</span>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 max-h-48 overflow-y-auto">
            <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap">
              {contentLines.slice(0, 50).join('\n')}
              {contentLines.length > 50 && '\n\n... (showing first 50 lines)'}
            </pre>
          </div>
        </div>
      );
    }
    
    if (params.command === 'str_replace') {
      return (
        <div className="space-y-2">
          <span className="text-xs font-medium text-emerald-400/80 uppercase tracking-wide">File Modified</span>
          <div className="text-sm text-white/70">
            Successfully replaced content in <span className="font-mono text-white/80">{params.path?.split('/').pop()}</span>
          </div>
          {params.old_str && (
            <details className="group/diff">
              <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60 select-none">
                View changes
              </summary>
              <div className="mt-2 space-y-2">
                <div className="bg-red-500/[0.05] border border-red-500/20 rounded-lg p-2">
                  <span className="text-xs text-red-400/60 block mb-1">Removed:</span>
                  <pre className="text-xs font-mono text-white/60 whitespace-pre-wrap overflow-x-auto">
                    {params.old_str.substring(0, 200)}{params.old_str.length > 200 ? '...' : ''}
                  </pre>
                </div>
                <div className="bg-emerald-500/[0.05] border border-emerald-500/20 rounded-lg p-2">
                  <span className="text-xs text-emerald-400/60 block mb-1">Added:</span>
                  <pre className="text-xs font-mono text-white/60 whitespace-pre-wrap overflow-x-auto">
                    {params.new_str?.substring(0, 200)}{params.new_str?.length > 200 ? '...' : ''}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </div>
      );
    }
    
    if (params.command === 'create') {
      return (
        <div className="space-y-2">
          <span className="text-xs font-medium text-blue-400/80 uppercase tracking-wide">File Created</span>
          <div className="text-sm text-white/70">
            Created new file: <span className="font-mono text-white/80">{params.path?.split('/').pop()}</span>
          </div>
        </div>
      );
    }
  }
  
  // File reading operations
  if (name.includes('read_files')) {
    if (typeof data === 'object' && data.files) {
      const fileCount = data.files.length;
      const totalBytes = data.stats?.total_bytes_read || 0;
      
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Files Read</span>
            <span className="text-xs text-white/40">{fileCount} files • {(totalBytes / 1024).toFixed(1)}KB</span>
          </div>
          <div className="space-y-2">
            {data.files.slice(0, 3).map((file: any, i: number) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                <div className="text-xs font-mono text-white/80 truncate mb-1">
                  {file.path?.split('/').pop() || file}
                </div>
                {file.content && (
                  <div className="text-xs text-white/50">
                    {file.content.substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
            {fileCount > 3 && (
              <div className="text-xs text-white/40">... and {fileCount - 3} more files</div>
            )}
          </div>
        </div>
      );
    }
  }
  
  // Search operations
  if (name.includes('search_files')) {
    if (typeof data === 'object' && data.files) {
      const matchCount = data.total_found || data.files.length;
      
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Search Results</span>
            <span className="text-xs text-white/40">{matchCount} matches</span>
          </div>
          <div className="space-y-2">
            {data.files.slice(0, 5).map((file: any, i: number) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                <div className="text-xs font-mono text-white/80 truncate">
                  {file.file || file.path || file}
                </div>
                {file.content_matches && file.content_matches[0] && (
                  <div className="text-xs text-white/50 mt-1">
                    Line {file.content_matches[0].line_number}: {file.content_matches[0].line.trim()}
                  </div>
                )}
              </div>
            ))}
            {matchCount > 5 && (
              <div className="text-xs text-white/40">... and {matchCount - 5} more matches</div>
            )}
          </div>
        </div>
      );
    }
  }
  
  // Web search
  if (name.includes('web') || name.includes('exa')) {
    if (typeof data === 'object' && data.results) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Web Results</span>
            <span className="text-xs text-white/40">{data.results.length} results</span>
          </div>
          <div className="space-y-2">
            {data.results.slice(0, 3).map((result: any, i: number) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                <div className="text-sm font-medium text-white/80 truncate mb-1">
                  {result.title}
                </div>
                <div className="text-xs text-white/50 truncate mb-1">
                  {result.url}
                </div>
                {result.snippet && (
                  <div className="text-xs text-white/40 line-clamp-2">
                    {result.snippet}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
  }
  
  // Tree/directory operations
  if (name.includes('tree')) {
    if (typeof data === 'object' && data.structure) {
      const nodeCount = JSON.stringify(data.structure).split('"name"').length - 1;
      
      return (
        <div className="space-y-2">
          <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Directory Structure</span>
          <div className="text-sm text-white/70">
            Mapped {nodeCount} items in directory tree
          </div>
        </div>
      );
    }
  }
  
  // Default: try to extract meaningful information
  if (typeof data === 'string') {
    // Check if it's a file path result
    if (data.includes('/') && data.length < 200) {
      return (
        <div className="space-y-2">
          <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Result</span>
          <div className="text-sm font-mono text-white/70">{data}</div>
        </div>
      );
    }
    
    // For longer strings, show a preview
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Output</span>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 max-h-32 overflow-y-auto">
          <pre className="text-xs text-white/70 whitespace-pre-wrap">
            {data.substring(0, 500)}
            {data.length > 500 && '\n\n... (truncated)'}
          </pre>
        </div>
      </div>
    );
  }
  
  // For objects, show a structured view
  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data).slice(0, 5);
    
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Result Data</span>
        <div className="space-y-1">
          {keys.map(key => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <span className="text-white/40 flex-shrink-0">{key}:</span>
              <span className="text-white/70 font-mono truncate">
                {typeof data[key] === 'object' ? JSON.stringify(data[key]).substring(0, 50) + '...' : String(data[key])}
              </span>
            </div>
          ))}
          {Object.keys(data).length > 5 && (
            <div className="text-xs text-white/40">... and {Object.keys(data).length - 5} more fields</div>
          )}
        </div>
      </div>
    );
  }
  
  // Fallback
  return (
    <div className="text-sm text-white/70">
      Operation completed successfully
    </div>
  );
}

function ToolCardBody({ call, result, isPending, isSuccess }: ToolCardBodyProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Simplified parameter extraction - just show the essence
  const getEssentialInfo = () => {
    const params = call.parameters || {};
    const toolName = (call.name || '').toLowerCase();
    
    
    // Extract the single most important piece of information
    if (toolName.includes('str_replace_editor') && params.path) {
      return params.path.split('/').pop();
    }
    if (toolName.includes('search') && params.query) {
      return `"${params.query}"`;
    }
    if (toolName.includes('read_files') && params.files) {
      const files = Array.isArray(params.files) ? params.files : [params.files];
      return files.length === 1 ? files[0].split('/').pop() : `${files.length} files`;
    }
    if (params.path) return params.path.split('/').pop();
    if (params.file) return params.file.split('/').pop();
    if (params.query) return params.query;
    if (params.name) return params.name;
    
    // Return first string parameter if any
    const firstString = Object.values(params).find(v => typeof v === 'string');
    return firstString ? (firstString.length > 30 ? firstString.substring(0, 30) + '...' : firstString) : null;
  };

  const essentialInfo = getEssentialInfo();
  const toolDisplayName = getToolDisplayName(call.name || 'unknown');

  return (
    <div className="flex-1 max-w-[85%]">
      <motion.div
        className={cn(
          design.radius.xl,
          design.glass.bg.subtle,
          'backdrop-blur-xl border',
          design.glass.border.subtle,
          'transition-all duration-200',
          'hover:bg-white/[0.05]'
        )}
      >
        {/* Simplified header */}
        <div 
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "cursor-pointer",
            design.spacing.card
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
              <h3 className={cn(
                design.text.sm,
                "font-medium",
                "text-white/80"
              )}>
                {toolDisplayName}
              </h3>
              
              {/* Essential info inline */}
              {essentialInfo && (
                <span className={cn(
                  design.text.xs,
                  "font-mono text-white/40 truncate"
                )}>
                  {essentialInfo}
                </span>
              )}
              
              {/* Minimal status */}
              {isPending && (
                <motion.div className="flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 rounded-full bg-white/40"
                      animate={{
                        opacity: [0.2, 0.6, 0.2]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </motion.div>
              )}
              
              {!isPending && !isSuccess && (
                <span className="text-xs text-white/30">Failed</span>
              )}
            </div>
          </div>
          
          {/* Expand indicator */}
          <ChevronDown className={cn(
            "w-4 h-4 text-white/30 transition-transform duration-200",
            expanded && "rotate-180"
          )} />
        </div>

        </div>
        
        {/* Expanded details - only show on demand */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Semantic Result Display - Always show when expanded */}
                <div className="pt-3 border-t border-white/[0.06]">
                  {result ? (
                    <SemanticResultDisplay 
                      toolName={call.name} 
                      result={result} 
                      isSuccess={isSuccess}
                      call={call}
                    />
                  ) : isPending ? (
                    <div className="text-sm text-white/50">
                      Operation in progress...
                    </div>
                  ) : (
                    <div className="text-sm text-white/50">
                      Waiting for result...
                    </div>
                  )}
                </div>

                {/* Technical Details (Collapsed by default) */}
                <details 
                  className="group/details"
                  onClick={(e) => e.stopPropagation()} // Prevent event bubbling
                >
                  <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60 transition-colors select-none">
                    Technical details
                  </summary>
                  <div className="mt-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden max-w-full">
                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-white/40 flex-shrink-0">Tool ID:</span>
                        <span className="font-mono text-white/60 break-all">{call.id}</span>
                      </div>
                      {call.parameters && Object.keys(call.parameters).length > 0 && (
                        <div>
                          <span className="text-white/40 block mb-1">Parameters:</span>
                          <div className="max-h-32 overflow-y-auto overflow-x-hidden">
                            <TechnicalDataDisplay data={call.parameters} />
                          </div>
                        </div>
                      )}
                      {result && (
                        <div>
                          <span className="text-white/40 block mb-1">Raw Output:</span>
                          <div className="max-h-32 overflow-y-auto overflow-x-hidden">
                            <TechnicalDataDisplay data={isSuccess ? result.result : result.error} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}