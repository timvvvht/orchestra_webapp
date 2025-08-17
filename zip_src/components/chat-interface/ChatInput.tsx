import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Paperclip, Send, Image, X, Clock, StopCircle, File, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoResize } from '@/hooks/useAutoResize';
import { useEnqueueMessage } from '@/hooks/useEnqueueMessage';
import { useCurrentSessionId } from '@/hooks/useCurrentSessionId';
import { cancelConversation } from '@/utils/cancelConversation';
import { useFileSearch } from '@/hooks/useFileSearch';
import { SearchMatch } from '@/lib/tauri/fileSelector';
import { FancyFileSelector } from '@/components/ui/fancy-file-selector';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isTyping?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  onKeyDown,
  isTyping = false,
  isLoading = false,
  disabled = false,
  placeholder = "Message"
}: ChatInputProps) {
  // Get sessionId from URL params or context (for Mission Control)
  const sessionId = useCurrentSessionId();
  
  // Queue functionality
  const { enqueue, queuedCount, list, remove } = useEnqueueMessage(sessionId || '');
  
  // ✅ PERFORMANCE FIX: Move input state into this component to prevent parent re-renders
  const [inputMessage, setInputMessage] = useState('');
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  
  // Queue mode state - becomes TRUE when user clicks queue toggle while assistant busy
  const [queueMode, setQueueMode] = useState(false);
  const [showQueueList, setShowQueueList] = useState(false);
  
  // File selector state
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [atTriggerPosition, setAtTriggerPosition] = useState<{ start: number; end: number } | null>(null);
  
  // Auto-reset queue-mode when assistant is no longer busy
  useEffect(() => {
    if (!isTyping) setQueueMode(false);
  }, [isTyping]);
  
  // File search hook
  const { results: fileResults, isLoading: isSearchingFiles } = useFileSearch(fileQuery, {
    debounceMs: 200,
    limit: 10,
    minQueryLength: 1
  });
  
  // Reset selected file index when results change
  useEffect(() => {
    setSelectedFileIndex(0);
  }, [fileResults]);
  
  // Auto-resize textarea hook
  const textareaRef = useAutoResize({ 
    minHeight: 48, // h-12 equivalent
    maxLines: 8, // Max lines before scrolling (roughly 200px)
    value: inputMessage 
  });
  
  // Check if textarea is expanded (more than one line)
  const isTextareaExpanded = inputMessage.includes('\n') || inputMessage.length > 50;
  
  // Detect @ trigger and extract file query
  const detectAtTrigger = useCallback((text: string, cursorPosition: number) => {
    // Look for @ followed by word characters, starting from cursor position backwards
    const beforeCursor = text.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      const start = beforeCursor.length - atMatch[0].length;
      const end = cursorPosition;
      const query = atMatch[1] || '';
      
      return {
        found: true,
        start,
        end,
        query
      };
    }
    
    return { found: false, start: 0, end: 0, query: '' };
  }, []);
  
  // Handle input change with @ detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setInputMessage(newValue);
    
    // Detect @ trigger
    const atDetection = detectAtTrigger(newValue, cursorPosition);
    
    if (atDetection.found) {
      setShowFilePicker(true);
      setFileQuery(atDetection.query);
      setAtTriggerPosition({ start: atDetection.start, end: atDetection.end });
      setSelectedFileIndex(0);
    } else {
      setShowFilePicker(false);
      setFileQuery('');
      setAtTriggerPosition(null);
    }
  }, [detectAtTrigger]);

  // SUBMIT: always "send immediately"
  const handleSubmit = () => {
    if (!inputMessage.trim()) return;
    const message = inputMessage.trim();
    setInputMessage(''); // Clear input immediately
    onSubmit(message); // Pass message to parent
  };

  // QUEUE action – used in queueMode or explicit button
  const queueDraft = () => {
    if (!inputMessage.trim()) return;
    enqueue(inputMessage.trim());
    setInputMessage('');
    console.log('📥 [Queue] Enqueued message for session:', sessionId);
  };

  // CANCEL conversation handler
  const handleCancelConversation = async () => {
    if (!sessionId) {
      console.warn('🚫 [ChatInput] No session ID available for cancellation');
      return;
    }
    
    try {
      console.log('🚫 [ChatInput] User clicked cancel button, calling utility function...');
      await cancelConversation(sessionId);
      console.log('🚫 [ChatInput] ✅ Conversation cancelled successfully!');
    } catch (error) {
      console.error('🚫 [ChatInput] ❌ Failed to cancel conversation:', error);
      // You could show a toast notification here if you have one
    }
  };

  // Insert file link at @ trigger position
  const insertFileLink = useCallback((file: SearchMatch) => {
    if (!atTriggerPosition) return;
    
    const beforeAt = inputMessage.slice(0, atTriggerPosition.start);
    const afterQuery = inputMessage.slice(atTriggerPosition.end);
    const fileLink = `[@${file.display}](@file:${file.full_path})`;
    
    const newMessage = beforeAt + fileLink + afterQuery;
    setInputMessage(newMessage);
    
    // Close file picker
    setShowFilePicker(false);
    setFileQuery('');
    setAtTriggerPosition(null);
    
    // Focus back to textarea and position cursor after the inserted link
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = beforeAt.length + fileLink.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, [inputMessage, atTriggerPosition, textareaRef]);
  
  // KEYDOWN logic
  // • Shift+Enter → newline (do nothing; <textarea> default)
  // • Enter w/o Shift:
  //     – showFilePicker && fileResults.length > 0 ? insertFileLink() : (queueMode ? queueDraft() : handleSubmit())
  // • Arrow keys when file picker is open → navigate file list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle file picker navigation
    if (showFilePicker && fileResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFileIndex(prev => Math.min(prev + 1, fileResults.length - 1));
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFileIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertFileLink(fileResults[selectedFileIndex]);
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowFilePicker(false);
        setFileQuery('');
        setAtTriggerPosition(null);
        return;
      }
    }
    
    // Normal input handling
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (queueMode) {
        queueDraft();
      } else {
        handleSubmit();
      }
    }
    
    // Call parent onKeyDown if provided
    onKeyDown?.(e);
  };

  return (
    <div className="relative z-20">
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="absolute bottom-0 left-0 right-0 px-6 md:px-12 py-6"
      >
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
          <div className="relative bg-white/[0.06] backdrop-blur-2xl rounded-2xl border border-white/10 p-1.5 shadow-2xl">
            <Input
              ref={textareaRef}
              as="textarea"
              placeholder={isTyping || isLoading ? "AI is thinking..." : placeholder}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isTyping || isLoading || disabled}
              className={cn(
                "w-full min-h-12 bg-transparent border-0 px-5 pr-24 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed resize-none",
                queueMode && "ring-2 ring-violet-500/50"
              )}
            />

            {/* Input actions - Refined Apple style */}
            <div className={cn(
              "absolute right-2 flex items-center gap-2",
              isTextareaExpanded ? "bottom-2" : "top-1/2 -translate-y-1/2"
            )}>
              <AnimatePresence>
                {showAttachmentOptions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="flex items-center gap-1 mr-2"
                  >
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="relative group p-2"
                    >
                      <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Image className="relative h-4 w-4 text-white/60 group-hover:text-white" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowAttachmentOptions(false)}
                      className="relative group p-1"
                    >
                      <X className="h-3 w-3 text-white/40 group-hover:text-white/60" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAttachmentOptions(!showAttachmentOptions)}
                className="relative group p-2"
              >
                <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <Paperclip className="relative h-4 w-4 text-white/40 group-hover:text-white/60" />
              </motion.button>

              {/* QUEUE-MODE TOGGLE – visible only while assistant busy && NOT in queueMode */}
              {isTyping && !queueMode && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQueueMode(true)}
                  className="relative p-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all shadow-lg"
                  title="Switch to queue mode"
                >
                  <Clock className="h-4 w-4 text-white" />
                </motion.button>
              )}

              {/* STOP BUTTON – visible when session is not idle (typing or loading) */}
              {(isTyping || isLoading) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancelConversation}
                  className="relative p-2 rounded-xl bg-red-600 hover:bg-red-500 transition-all shadow-lg"
                  title="Stop generation"
                >
                  <StopCircle className="h-4 w-4 text-white" />
                </motion.button>
              )}

              {/* QUEUE BADGE (also toggles pop-over) */}
              {queuedCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowQueueList(!showQueueList)}
                  className="relative px-2 py-1 text-xs rounded-full bg-violet-800 text-white/90 hover:bg-violet-700 transition-all"
                  title="Queued drafts"
                >
                  {queuedCount}
                </motion.button>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!inputMessage.trim() || isLoading || disabled}
                      onClick={queueMode ? queueDraft : handleSubmit}
                      className={cn(
                        "relative p-2 rounded-xl transition-all",
                        inputMessage.trim() && !isLoading && !disabled
                          ? queueMode 
                            ? "bg-violet-600 shadow-lg" 
                            : "bg-[#007AFF] shadow-lg"
                          : "bg-white/10"
                      )}
                      title={queueMode ? 'Queue draft (Enter)' : 'Send (Enter)'}
                    >
                      {queueMode ? (
                        <Clock className={cn(
                          "h-4 w-4 transition-colors",
                          inputMessage.trim() && !isLoading && !disabled ? "text-white" : "text-white/30"
                        )} />
                      ) : (
                        <Send className={cn(
                          "h-4 w-4 transition-colors",
                          inputMessage.trim() && !isLoading && !disabled ? "text-white" : "text-white/30"
                        )} />
                      )}
                    </motion.button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* QUEUE LIST POPOVER */}
        <AnimatePresence>
          {showQueueList && queuedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-20 right-0 w-80 max-w-[90vw] bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-2xl z-50"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Queued Messages ({queuedCount})</h3>
                <button
                  onClick={() => setShowQueueList(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {list().map((message, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1 text-sm text-white/80 break-words">
                      {message.length > 100 ? `${message.slice(0, 100)}...` : message}
                    </div>
                    <button
                      onClick={() => remove(index)}
                      className="flex-shrink-0 p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                      title="Remove from queue"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
                Messages will be sent automatically when the assistant finishes responding
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FILE PICKER DROPDOWN */}
        <FancyFileSelector
          isOpen={showFilePicker}
          query={fileQuery}
          results={fileResults}
          selectedIndex={selectedFileIndex}
          onFileSelect={insertFileLink}
          onClose={() => {
            setShowFilePicker(false);
            setFileQuery('');
            setAtTriggerPosition(null);
          }}
          isSearching={isSearchingFiles}
          className="absolute bottom-20 left-0"
        />
      </motion.div>
    </div>
  );
}