import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, X, Clock, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useEnqueueMessage } from '@/hooks/useEnqueueMessage';
import { useCurrentSessionId } from '@/hooks/useCurrentSessionId';
import { cancelConversation } from '@/utils/cancelConversation';

interface MobileChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isTyping?: boolean;
}

/**
 * Mobile-optimized chat input with bottom sheet pattern
 * Expands from a simple tap target to full input interface
 */
export function MobileChatInput({ 
  onSubmit, 
  disabled = false, 
  placeholder = "Type a message...",
  isTyping = false
}: MobileChatInputProps) {
  // Get sessionId from URL params or context (for Mission Control)
  const sessionId = useCurrentSessionId();
  
  // Queue functionality
  const { enqueue, queuedCount, list, remove } = useEnqueueMessage(sessionId || '');
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  // Queue mode state
  const [queueMode, setQueueMode] = useState(false);
  const [showQueueList, setShowQueueList] = useState(false);
  
  // Auto-reset queue-mode when assistant is no longer busy
  useEffect(() => {
    if (!isTyping) setQueueMode(false);
  }, [isTyping]);

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
    onSubmit(message);
    setMessage('');
    setIsExpanded(false);
  };

  // QUEUE action
  const queueDraft = () => {
    if (!message.trim()) return;
    enqueue(message.trim());
    setMessage('');
    console.log('📥 [Queue] Enqueued message for session:', sessionId);
  };

  // CANCEL conversation handler
  const handleCancelConversation = async () => {
    if (!sessionId) {
      console.warn('🚫 [MobileChatInput] No session ID available for cancellation');
      return;
    }
    
    try {
      console.log('🚫 [MobileChatInput] User clicked cancel button, calling utility function...');
      await cancelConversation(sessionId);
      console.log('🚫 [MobileChatInput] ✅ Conversation cancelled successfully!');
    } catch (error) {
      console.error('🚫 [MobileChatInput] ❌ Failed to cancel conversation:', error);
      // You could show a toast notification here if you have one
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (queueMode) {
        queueDraft();
      } else {
        handleSubmit();
      }
    }
  };

  // Animation variants - disabled if user prefers reduced motion
  const containerVariants = prefersReducedMotion ? {} : {
    collapsed: { height: 60 },
    expanded: { height: 200 }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      {/* Safe area padding for devices with home indicator */}
      <div className="pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <motion.div
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          variants={containerVariants}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gray-900/95 backdrop-blur-lg border-t border-gray-800"
        >
          {!isExpanded ? (
            // Collapsed state: Simple tap target
            <button
              onClick={() => setIsExpanded(true)}
              disabled={disabled}
              className={cn(
                "w-full h-full px-4 flex items-center justify-between",
                "hover:bg-white/5 transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-gray-400 text-left">{placeholder}</span>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-white/5">
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </button>
          ) : (
            // Expanded state: Full input interface
            <div className="flex flex-col h-full p-4">
              {/* Input area */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  className={cn(
                    "w-full h-full bg-gray-800 rounded-lg p-3 resize-none",
                    "text-white placeholder:text-gray-400",
                    "border border-gray-700 focus:border-blue-500 focus:outline-none",
                    "transition-colors",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  placeholder={placeholder}
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800">
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    setMessage('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {/* Character count for long messages */}
                  {message.length > 100 && (
                    <span className="text-xs text-gray-500">
                      {message.length}
                    </span>
                  )}

                  {/* Stop button - visible when typing */}
                  {isTyping && (
                    <button
                      onClick={handleCancelConversation}
                      className="px-4 py-2 rounded-lg font-medium transition-all bg-red-500 text-white hover:bg-red-600 shadow-lg flex items-center gap-2"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop
                    </button>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || disabled}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium transition-all",
                      "flex items-center gap-2",
                      message.trim() && !disabled
                        ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}