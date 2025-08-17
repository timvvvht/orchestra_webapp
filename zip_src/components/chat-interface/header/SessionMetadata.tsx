import React from 'react';
import { Clock, MessageSquare, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionMetadataProps {
  // Session data
  sessionName?: string;
  messageCount?: number;
  duration?: string;
  cwd?: string;

  // Display options
  showDuration?: boolean;
  showMessageCount?: boolean;
  showCwd?: boolean;
  showName?: boolean;

  // Styling
  className?: string;
}

/**
 * SessionMetadata - Displays session information like name, duration, message count
 * 
 * Features:
 * - Session name display
 * - Duration tracking
 * - Message count
 * - Configurable visibility
 * - Clean, minimal design
 */
export const SessionMetadata: React.FC<SessionMetadataProps> = ({
  sessionName,
  messageCount = 0,
  duration,
  cwd,
  showDuration = true,
  showMessageCount = true,
  showCwd = true,
  showName = true,
  className
}) => {
  const formatPath = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 2) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return path;
  };
  // Helper function to determine if an item is the last visible one
  const isLastVisibleItem = (index: number): boolean => {
    const visibilityConditions = [
      showCwd && cwd,
      showName && sessionName,
      showDuration && duration,
      showMessageCount && messageCount > 0
    ];
    
    const visibleItemsAfter = visibilityConditions.slice(index + 1).filter(Boolean).length;
    return visibleItemsAfter === 0;
  };

  return (
    <div className={cn("flex items-center", className)}>
      {/* CWD */}

      {/* Session Name */}
      {showName && sessionName && (
        <>
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="text-sm font-medium text-white/90 truncate max-w-[800px]">
              {sessionName}
            </div>
          </div>
          {!isLastVisibleItem(0) && <div className="h-4 w-px bg-white/10" />}
        </>
      )}
      {showCwd && cwd && (
        <>
          <div className="flex items-center gap-1.5 px-3 py-1">
            <Folder className="w-3.5 h-3.5 text-white/50" />
            <span
              className="text-[13px] text-white/70 font-mono"
              title={cwd}
            >
              {formatPath(cwd)}
            </span>
          </div>
          {!isLastVisibleItem(1) && <div className="h-4 w-px bg-white/10" />}
        </>
      )}


      {/* Duration */}
      {showDuration && duration && (
        <>
          <div className="flex items-center gap-1.5 px-3 py-1">
            <Clock className="w-3.5 h-3.5 text-white/50" />
            <span className="text-[13px] text-white/70 font-mono">
              {duration}
            </span>
          </div>
          {!isLastVisibleItem(2) && <div className="h-4 w-px bg-white/10" />}
        </>
      )}

      {/* Message Count */}
      {showMessageCount && messageCount > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1">
          <MessageSquare className="w-3.5 h-3.5 text-white/50" />
          <span className="text-[13px] text-white/70 tabular-nums">
            {messageCount}
          </span>
        </div>
      )}
    </div>
  );
};

export default SessionMetadata;