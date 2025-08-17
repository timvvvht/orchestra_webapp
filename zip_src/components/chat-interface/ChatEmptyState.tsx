import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import NewChatModal from './NewChatModal';
import type { UseACSChatUIReturn } from '@/hooks/acs-chat';

interface ChatEmptyStateProps {
  onNewChatClick: () => void;
  isNewChatModalOpen: boolean;
  onCloseNewChatModal: () => void;
  chatUI: UseACSChatUIReturn;
}

export function ChatEmptyState({
  onNewChatClick,
  isNewChatModalOpen,
  onCloseNewChatModal,
  chatUI
}: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-black w-full h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="text-center space-y-8 max-w-md mx-auto px-4"
      >
        <motion.div 
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          className="relative mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF] to-[#5856D6] blur-3xl opacity-20" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-2xl">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
        </motion.div>
        
        <div className="space-y-3">
          <h3 className="font-semibold text-3xl text-white tracking-tight">Start a conversation</h3>
          <p className="text-white/60 text-lg">Choose a chat or create something new</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewChatClick}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-2xl text-white font-medium shadow-lg">
            <Plus className="h-5 w-5" />
            <span className="text-lg">New Conversation</span>
          </div>
        </motion.button>
      </motion.div>
      
      {/* New Chat Modal for empty state */}
      <NewChatModal
        isVisible={isNewChatModalOpen}
        onClose={onCloseNewChatModal}
        chat={chatUI}
      />
    </div>
  );
}

export default ChatEmptyState;