import { useState } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Reply, Copy, Share, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface TouchMessageProps {
  children: React.ReactNode;
  onReply?: () => void;
  onCopy?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  className?: string;
}

/**
 * Touch-optimized message wrapper with swipe actions
 * Swipe left to reveal action buttons, swipe right to hide
 */
export function TouchMessage({ 
  children, 
  onReply, 
  onCopy, 
  onShare, 
  onMore,
  className 
}: TouchMessageProps) {
  const [actionsVisible, setActionsVisible] = useState(false);
  const controls = useAnimation();
  const prefersReducedMotion = useReducedMotion();

  const handleSwipe = (event: any, info: PanInfo) => {
    if (prefersReducedMotion) return; // Skip swipe animations if reduced motion

    const swipeThreshold = 50;
    
    if (info.offset.x < -swipeThreshold) {
      // Swipe left: Show actions
      setActionsVisible(true);
      controls.start({ x: -80 });
    } else if (info.offset.x > swipeThreshold) {
      // Swipe right: Hide actions
      setActionsVisible(false);
      controls.start({ x: 0 });
    } else {
      // Snap back to current state
      controls.start({ x: actionsVisible ? -80 : 0 });
    }
  };

  const hideActions = () => {
    setActionsVisible(false);
    controls.start({ x: 0 });
  };

  // If reduced motion is preferred, render without swipe functionality
  if (prefersReducedMotion) {
    return (
      <div className={cn("relative", className)}>
        {children}
        {/* Show actions as overlay on long press instead */}
        {actionsVisible && (
          <div className="absolute right-2 top-2 flex items-center gap-1 bg-gray-800/90 rounded-lg p-1">
            {onReply && (
              <button 
                onClick={onReply}
                className="p-2 rounded-lg bg-blue-500/20 active:bg-blue-500/30"
              >
                <Reply className="w-4 h-4 text-blue-500" />
              </button>
            )}
            {onCopy && (
              <button 
                onClick={onCopy}
                className="p-2 rounded-lg bg-gray-500/20 active:bg-gray-500/30"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            )}
            {onMore && (
              <button 
                onClick={onMore}
                className="p-2 rounded-lg bg-gray-500/20 active:bg-gray-500/30"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Quick actions revealed on swipe */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 px-4 bg-gray-900">
        {onReply && (
          <button 
            onClick={() => {
              onReply();
              hideActions();
            }}
            className="p-2 rounded-lg bg-blue-500/20 active:bg-blue-500/30 transition-colors"
          >
            <Reply className="w-4 h-4 text-blue-500" />
          </button>
        )}
        {onCopy && (
          <button 
            onClick={() => {
              onCopy();
              hideActions();
            }}
            className="p-2 rounded-lg bg-gray-500/20 active:bg-gray-500/30 transition-colors"
          >
            <Copy className="w-4 h-4 text-gray-500" />
          </button>
        )}
        {onShare && (
          <button 
            onClick={() => {
              onShare();
              hideActions();
            }}
            className="p-2 rounded-lg bg-green-500/20 active:bg-green-500/30 transition-colors"
          >
            <Share className="w-4 h-4 text-green-500" />
          </button>
        )}
        {onMore && (
          <button 
            onClick={() => {
              onMore();
              hideActions();
            }}
            className="p-2 rounded-lg bg-gray-500/20 active:bg-gray-500/30 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Message content with swipe gesture */}
      <motion.div
        className="relative bg-black z-10"
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        onDragEnd={handleSwipe}
        animate={controls}
        dragElastic={0.1}
        dragMomentum={false}
      >
        {children}
      </motion.div>

      {/* Tap outside to hide actions */}
      {actionsVisible && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={hideActions}
        />
      )}
    </div>
  );
}