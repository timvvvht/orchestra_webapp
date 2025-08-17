import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface ChatScrollToBottomButtonProps {
  isVisible: boolean;
  onScrollToBottom: () => void;
}

export function ChatScrollToBottomButton({
  isVisible,
  onScrollToBottom
}: ChatScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute bottom-28 right-8 z-20"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onScrollToBottom}
            className="relative group"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-lg">
              <ChevronDown className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white">Jump to bottom</span>
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ChatScrollToBottomButton;