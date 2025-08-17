/**
 * NewMessagesIndicator - Floating button to scroll to new messages
 * Appears when user has scrolled up and new messages arrive
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface NewMessagesIndicatorProps {
  show: boolean;
  messageCount?: number;
  onClick: () => void;
  variant?: 'new-messages' | 'back-to-latest';
}

export const NewMessagesIndicator: React.FC<NewMessagesIndicatorProps> = ({
  show,
  messageCount,
  onClick,
  variant = 'new-messages',
}) => {
  const getButtonText = () => {
    if (variant === 'back-to-latest') {
      return 'Back to latest';
    }
    
    if (messageCount && messageCount > 1) {
      return `${messageCount} new messages`;
    }
    
    return 'New message';
  };
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            duration: 0.2 
          }}
          onClick={onClick}
          className="fixed bottom-24 right-6 z-50 group"
          aria-label="Scroll to new messages"
        >
          {/* Glassmorphic button with our design system */}
          <div className="relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl px-4 py-3 transition-all duration-200 hover:bg-white/[0.12] hover:border-white/40 hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)]">
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-2xl" />
            
            {/* Content */}
            <div className="relative flex items-center gap-2">
              <span className="text-sm font-light text-white/90">
                {getButtonText()}
              </span>
              <ChevronDown 
                size={16} 
                className="text-white/70 group-hover:text-white/90 transition-colors duration-200" 
              />
            </div>
            
            {/* Subtle pulse animation */}
            <div className="absolute inset-0 rounded-2xl bg-white/[0.02] animate-pulse opacity-50" />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default NewMessagesIndicator;