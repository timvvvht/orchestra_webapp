import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
// Removed heavy D3 import - using lightweight CSS animations instead

interface TypingIndicatorProps {
  className?: string;
  agentName?: string;
  showThinkingState?: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  className, 
  agentName,
  showThinkingState = false 
}) => {
  // Lightweight CSS-based animation instead of heavy D3
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
      className={cn("flex items-center gap-3", className)}
    >
      {/* Avatar placeholder */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10" />
      
      {/* Lightweight animation container */}
      <div className="flex flex-col gap-2">
        <div className={cn(
          "inline-flex items-center",
          "bg-white/[0.02] backdrop-blur-2xl backdrop-saturate-200",
          "border border-white/[0.04]",
          "rounded-[20px] rounded-bl-[8px]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
          "px-4 py-3",
          "overflow-hidden"
        )}>
          {/* Simple CSS-based orb animation */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full",
                  showThinkingState 
                    ? "bg-gradient-to-r from-purple-400 to-purple-600" 
                    : "bg-gradient-to-r from-blue-400 to-blue-600",
                  "animate-pulse"
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: showThinkingState ? '1.5s' : '1s'
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Status text */}
        {agentName && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-white/30 ml-3"
          >
            {showThinkingState ? `${agentName} is thinking...` : `${agentName} is typing...`}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

export default TypingIndicator;