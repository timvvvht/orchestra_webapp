import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, ChevronDown, Loader2, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, ToolInteraction } from '@/types/chatTypes';
import { useToolInteractions, useToolInteractionSummary } from '@/stores/hooks/useToolInteractions';

interface AggregatedToolDisplayProps {
  message: ChatMessage;
  isStreaming?: boolean;
  refinedMode?: boolean;
  allMessages?: ChatMessage[]; // Required for refined mode
}

const AggregatedToolDisplay: React.FC<AggregatedToolDisplayProps> = ({ 
  message, 
  isStreaming = false, 
  refinedMode = false, 
  allMessages = [] 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use the new hook to get tool interactions - single source of truth!
  const toolInteractions = useToolInteractions(message, { refinedMode, allMessages });
  const summary = useToolInteractionSummary(message, { refinedMode, allMessages });

  // Extract statistics from the summary
  const totalTools = summary.total;
  const completedTools = summary.completed;
  const failedTools = summary.failed;
  const successfulTools = completedTools - failedTools;
  const inProgressTools = summary.running;

  // Don't render if no tools
  if (totalTools === 0) return null;

  // Get the current/last tool being processed
  // During streaming, find the LAST tool without a result (most recent)
  const currentTool = isStreaming && inProgressTools > 0 
    ? toolInteractions.filter(interaction => interaction.status === 'running').pop() // Use pop() to get the last one
    : toolInteractions[toolInteractions.length - 1];

  // Debug logging
  useEffect(() => {
    console.log('[AggregatedToolDisplay] Tool stats:', {
      isStreaming,
      totalTools,
      completedTools,
      inProgressTools,
      failedTools,
      toolInteractions: toolInteractions.map(interaction => ({
        name: interaction.toolCall.name,
        status: interaction.status,
        hasResult: !!interaction.toolResult,
        isError: interaction.toolResult?.is_error
      }))
    });
    
    if (isStreaming && currentTool) {
      console.log('[AggregatedToolDisplay] Current tool:', {
        name: currentTool.toolCall.name,
        id: currentTool.toolCall.id,
        index: toolInteractions.indexOf(currentTool) + 1,
        total: totalTools,
        inProgress: inProgressTools
      });
    }
  }, [currentTool, isStreaming, toolInteractions, totalTools, inProgressTools, completedTools, failedTools]);

  // Determine overall status
  const getStatusIcon = () => {
    if (isStreaming && inProgressTools > 0) {
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />;
    }
    if (failedTools > 0) {
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    }
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
  };

  const getStatusColor = () => {
    if (isStreaming && inProgressTools > 0) {
      return 'bg-blue-500/5 border-blue-500/10 text-blue-200/80';
    }
    if (failedTools > 0) {
      return 'bg-red-500/5 border-red-500/10 text-red-200/80';
    }
    return 'bg-green-500/5 border-green-500/10 text-green-200/80';
  };

  return (
    <div className="my-3">
      {/* Collapsed/Summary View */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.3,
          ease: [0.19, 1, 0.22, 1] // Water-like easing
        }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all",
          "backdrop-blur-sm",
          "border",
          getStatusColor(),
          "hover:backdrop-blur-md",
          "group"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status Icon */}
        {getStatusIcon()}

        {/* Summary Text */}
        <div className="flex items-center gap-1.5 text-xs">
          {isStreaming && inProgressTools > 0 ? (
            <>
              <span className="font-medium">{currentTool?.toolCall.name}</span>
              <span className="text-white/50">
                ({currentTool ? toolInteractions.indexOf(currentTool) + 1 : totalTools}/{totalTools})
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">
                {totalTools} {totalTools === 1 ? 'tool' : 'tools'}
              </span>
              {failedTools > 0 && (
                <span className="text-red-400">
                  • {failedTools} failed
                </span>
              )}
            </>
          )}
        </div>

        {/* Expand/Collapse Icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="group-hover:text-white/60"
        >
          <ChevronDown className="w-3.5 h-3.5 text-white/40 transition-colors" />
        </motion.div>
      </motion.div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 pl-6">
              {/* Tool Summary Stats */}
              {!isStreaming && totalTools > 1 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex gap-4 text-xs text-white/50 pb-2 border-b border-white/5"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    {successfulTools} successful
                  </span>
                  {failedTools > 0 && (
                    <span className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      {failedTools} failed
                    </span>
                  )}
                  {inProgressTools > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      {inProgressTools} in progress
                    </span>
                  )}
                </motion.div>
              )}

              {/* Individual Tool List - Simple view without results */}
              <div className="space-y-1.5">
                {toolInteractions.map((interaction, index) => (
                  <motion.div
                    key={interaction.toolCall.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center",
                      interaction.status === 'failed'
                        ? "bg-red-500/20" 
                        : interaction.status === 'completed'
                          ? "bg-green-500/20" 
                          : "bg-blue-500/20"
                    )}>
                      {interaction.status === 'failed' ? (
                        <XCircle className="w-3 h-3 text-red-400" />
                      ) : interaction.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                      ) : (
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                      )}
                    </div>
                    <span className="text-white/70">{interaction.toolCall.name}</span>
                    {interaction.status === 'failed' && (
                      <span className="text-xs text-red-400">(failed)</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AggregatedToolDisplay;