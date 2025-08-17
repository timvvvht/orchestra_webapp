/**
 * SimpleToolDisplay - Example of using the new useToolInteractions hook
 * 
 * This demonstrates the simplified architecture where:
 * 1. The eventStore is the single source of truth for tool state
 * 2. useToolInteractions hook handles all pairing logic
 * 3. UI components are "dumb" renderers of the hook's output
 */

import React from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ChatMessage, ToolInteraction } from '@/types/chatTypes';
import { useToolInteractions, useToolInteractionSummary } from '@/stores/hooks/useToolInteractions';
import { cn } from '@/lib/utils';

interface SimpleToolDisplayProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

/**
 * Simple tool display component that demonstrates the new architecture.
 * All the complex pairing logic is handled by the useToolInteractions hook.
 */
const SimpleToolDisplay: React.FC<SimpleToolDisplayProps> = ({ message, isStreaming = false }) => {
  // Single source of truth - the hook handles all the complexity
  const toolInteractions = useToolInteractions(message);
  const summary = useToolInteractionSummary(message);

  // Early return if no tools
  if (summary.total === 0) return null;

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="text-sm text-white/60">
        {summary.total} {summary.total === 1 ? 'tool' : 'tools'} 
        {summary.running > 0 && ` (${summary.running} running)`}
        {summary.failed > 0 && ` (${summary.failed} failed)`}
      </div>

      {/* Individual tool interactions */}
      <div className="space-y-1">
        {toolInteractions.map((interaction) => (
          <ToolInteractionItem 
            key={interaction.toolCall.id} 
            interaction={interaction} 
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual tool interaction item - pure presentation component
 */
interface ToolInteractionItemProps {
  interaction: ToolInteraction;
}

const ToolInteractionItem: React.FC<ToolInteractionItemProps> = ({ interaction }) => {
  const getStatusIcon = () => {
    switch (interaction.status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (interaction.status) {
      case 'completed':
        return 'bg-green-500/10 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 border-red-500/20';
      case 'running':
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border",
      getStatusColor()
    )}>
      {getStatusIcon()}
      <span className="text-sm text-white/80">{interaction.toolCall.name}</span>
      {interaction.status === 'failed' && (
        <span className="text-xs text-red-400">(failed)</span>
      )}
      {interaction.startTime && interaction.endTime && (
        <span className="text-xs text-white/40 ml-auto">
          {interaction.endTime - interaction.startTime}ms
        </span>
      )}
    </div>
  );
};

export default SimpleToolDisplay;

/**
 * USAGE EXAMPLE:
 * 
 * // Before (complex pairing logic in component):
 * const toolPairs = useMemo(() => {
 *   const pairs = [];
 *   const toolUses = content.filter(p => p.type === 'tool_use');
 *   const toolResults = content.filter(p => p.type === 'tool_result');
 *   toolUses.forEach(toolUse => {
 *     const result = toolResults.find(r => r.tool_use_id === toolUse.id);
 *     pairs.push({ toolUse, toolResult: result });
 *   });
 *   return pairs;
 * }, [content]);
 * 
 * // After (single source of truth):
 * const toolInteractions = useToolInteractions(message);
 * 
 * // The hook handles all the pairing logic using the eventStore's toolIx index
 * // The component just renders what the hook provides
 */