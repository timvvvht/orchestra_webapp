import React from 'react';
import { cn } from '@/lib/utils';
import { Terminal, ExternalLink } from 'lucide-react';
import { ToolCall } from '@/components/chat/types';

interface ToolCallBadgeProps {
  toolCall: ToolCall;
}

const ToolCallBadge: React.FC<ToolCallBadgeProps> = ({ toolCall }) => {
  // Parse the arguments to display them nicely
  const getDisplayArguments = () => {
    try {
      const args = JSON.parse(toolCall.arguments);
      // If it's a simple object with a query property, just show that
      if (args.query) {
        return args.query;
      }
      // Otherwise return a simplified string representation
      return Object.entries(args)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch (e) {
      return toolCall.arguments;
    }
  };

  // Get icon based on tool name
  const getToolIcon = () => {
    if (toolCall.name.includes('search')) {
      return <ExternalLink className="h-3.5 w-3.5 text-[#0B84FE]" />;
    }
    return <Terminal className="h-3.5 w-3.5 text-[#0B84FE]" />;
  };

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-13",
      "bg-[#E9E9EB] text-neutral-800",
      "border border-neutral-200"
    )}>
      {getToolIcon()}
      <span className="font-medium">{toolCall.name}</span>
      <span className="text-neutral-500 truncate max-w-[200px]">
        {getDisplayArguments()}
      </span>
    </div>
  );
};

export default ToolCallBadge;