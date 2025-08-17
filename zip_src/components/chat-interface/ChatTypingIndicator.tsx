import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuantumWaveIndicator from './QuantumWaveIndicator';

interface ChatTypingIndicatorProps {
  isVisible: boolean;
  agentName?: string;
  showThinkingState: boolean;
}

export function ChatTypingIndicator({
  isVisible,
  agentName = 'AI Assistant',
  showThinkingState
}: ChatTypingIndicatorProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <QuantumWaveIndicator 
            agentName={agentName} 
            showThinkingState={showThinkingState}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ChatTypingIndicator;