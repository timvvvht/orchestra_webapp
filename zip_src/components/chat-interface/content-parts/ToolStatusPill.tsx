/**
 * ToolStatusPill - New version using useToolInteractions hook
 * 
 * This replaces the manual tool call passing with the new hook-based approach.
 * Supports both refined and unrefined modes automatically.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types/chatTypes';
import { getOptimizedToolCallsForResponse } from '@/utils/optimizedMessageFiltering';
import { getApprovalAPI } from '@/services/approval';

interface ToolStatusPillProps {
  message: ChatMessage;
  isStreaming?: boolean;
  refinedMode?: boolean;
  allMessages?: ChatMessage[];
  className?: string;
}

/**
 * Tool status pill that uses the new useToolInteractions hook.
 * Automatically handles refined vs unrefined mode.
 */
const ToolStatusPill: React.FC<ToolStatusPillProps> = ({
  message,
  isStreaming = false,
  refinedMode = false,
  allMessages = [],
  className
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<Set<string>>(new Set());
  const approvalAPI = getApprovalAPI();

  // Get tool calls - refined mode gets from conversation round, unrefined from message
  const toolUseParts = useMemo(() => {
    if (refinedMode && allMessages.length > 0) {
      try {
        // Refined mode: Get tool calls from entire conversation round
        const toolCalls = getOptimizedToolCallsForResponse(allMessages, message.id);
        // Convert to tool_use format
        return toolCalls.map(toolCall => ({
          type: 'tool_use' as const,
          id: toolCall.id,
          name: toolCall.name,
          input: toolCall.input || {}
        }));
      } catch (error) {
        console.warn('[ToolStatusPill] Refined mode failed, falling back:', error);
        // Fallback to unrefined mode
        return message.content.filter(p => p.type === 'tool_use');
      }
    } else {
      // Unrefined mode: Get tool calls from this message only
      return message.content.filter(p => p.type === 'tool_use');
    }
  }, [refinedMode, allMessages.length, message.id, message.content]);

  // Simple status - just show if we have tools
  const hasTools = toolUseParts.length > 0;

  // Get a meaningful summary of what's happening
  const getStatusMessage = () => {
    if (!hasTools) return '';
    
    // For a small number of tools, just say how many
    if (toolUseParts.length === 1) {
      const toolName = getToolDisplayName(toolUseParts[0].name);
      return toolName;
    }
    
    if (toolUseParts.length <= 3) {
      return `Used ${toolUseParts.length} tools`;
    }
    
    // For many tools, give a count
    return `Executed ${toolUseParts.length} operations`;
  };

  // Helper function to get display name for tools
  const getToolDisplayName = (toolName: string): string => {
    const displayNames: Record<string, string> = {
      'str_replace_editor': 'File Editor',
      'search_files': 'File Search',
      'execute_in_runner_session': 'Terminal',
      'think': 'Thinking',
      'agentic_search_files_persistent': 'Code Search',
      'read_files': 'Read Files',
      'spawn_agent_sync': 'Sub-Agent',
      // Add more mappings as needed
    };
    
    return displayNames[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get status icon - simple approach
  const getStatusIcon = () => {
    if (!hasTools) return null;

    if (isStreaming) {
      return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
    }
    
    return <CheckCircle2 className="w-3 h-3 text-green-400" />;
  };

  // Cycle through tools if streaming
  useEffect(() => {
    if (!isStreaming || toolUseParts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % toolUseParts.length);
    }, 1500);
    
    return () => clearInterval(interval);
  }, [toolUseParts.length, isStreaming]);

  if (!hasTools) return null;

  const statusMessage = getStatusMessage();
  const showExpandable = toolUseParts.length > 1 && !isStreaming;

  return (
    <div className={className}>
      {showExpandable ? (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-colors mb-2"
        >
          {getStatusIcon()}
          <span>{statusMessage}</span>
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
          {getStatusIcon()}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Expanded tool list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pl-5 mb-2">
              {toolUseParts.map((toolCall, index) => (
                <div key={toolCall.id} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isStreaming ? "bg-blue-400 animate-pulse" : "bg-green-400"
                  )} />
                  <span className="text-white/60">
                    {getToolDisplayName(toolCall.name)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolStatusPill;

/**
 * USAGE EXAMPLE:
 * 
 * // Before (manual tool call passing):
 * const allToolCalls = refinedMode && isFinal
 *   ? getOptimizedToolCallsForResponse(messages, message.id)
 *   : [];
 * 
 * <DynamicToolStatusPill 
 *   toolCalls={allToolCalls} 
 *   isStreaming={isStreaming} 
 * />
 * 
 * // After (hook-based):
 * <ToolStatusPill 
 *   message={message}
 *   isStreaming={isStreaming}
 *   refinedMode={refinedMode}
 *   allMessages={messages}
 * />
 */