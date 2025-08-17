import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Paperclip, Send, Image, X, Clock, StopCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEnqueueMessage } from '@/hooks/useEnqueueMessage';
import { useCurrentSessionId } from '@/hooks/useCurrentSessionId';
import { cancelConversation } from '@/utils/cancelConversation';
import { LexicalPillEditor } from '@/components/drafts/LexicalPillEditor';
import { FancyFileSelector } from '@/components/ui/fancy-file-selector';
import { useFileSearch } from '@/hooks/useFileSearch';
import { useChatUI } from '@/context/ChatUIContext';
import type { SearchMatch } from '@/lib/tauri/fileSelector';
import './LexicalChatInput.css';

interface LexicalChatInputProps {
  onSubmit: (message: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isTyping?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function LexicalChatInput({
  onSubmit,
  onKeyDown,
  isTyping = false,
  isLoading = false,
  disabled = false,
  placeholder = "Message"
}: LexicalChatInputProps) {
  // Get sessionId from URL params or context (for Mission Control)
  const sessionId = useCurrentSessionId();
  
  // Get chat UI context for current session's working directory
  const chatUI = useChatUI();
  const currentSession = chatUI.currentSession;
  const codePath = currentSession?.agent_cwd || undefined;
  
  // Queue functionality
  const { enqueue, queuedCount, list, remove } = useEnqueueMessage(sessionId || '');
  
  // ✅ PERFORMANCE FIX: Move input state into this component to prevent parent re-renders
  const [inputMessage, setInputMessage] = useState('');
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  
  // Queue mode state - becomes TRUE when user clicks queue toggle while assistant busy
  const [queueMode, setQueueMode] = useState(false);
  const [showQueueList, setShowQueueList] = useState(false);
  
  // File selector state (mirror NewDraftModal approach)
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  // File search hook - scoped to current session's working directory
  const { results: fileResults, isLoading: isSearchingFiles } = useFileSearch(fileSearchQuery, {
    debounceMs: 200,
    limit: 15,
    minQueryLength: 0,
    codePath: codePath?.trim() || undefined
  });
  
  // Auto-reset queue-mode when assistant is no longer busy
  useEffect(() => {
    if (!isTyping) setQueueMode(false);
  }, [isTyping]);
  
  // Check if editor has content (more than just whitespace)
  const hasContent = inputMessage.trim().length > 0;
  
  // Check if editor is expanded (has newlines or is long)
  const isEditorExpanded = inputMessage.includes('\n') || inputMessage.length > 50;

  // SUBMIT: always "send immediately"
  const handleSubmit = useCallback(() => {
    if (!hasContent) return;
    const message = inputMessage.trim();
    setInputMessage(''); // Clear input immediately
    onSubmit(message); // Pass message to parent
  }, [hasContent, inputMessage, onSubmit]);

  // QUEUE action – used in queueMode or explicit button
  const queueDraft = useCallback(() => {
    if (!hasContent) return;
    enqueue(inputMessage.trim());
    setInputMessage('');
    console.log('📥 [Queue] Enqueued message for session:', sessionId);
  }, [hasContent, inputMessage, enqueue, sessionId]);

  // CANCEL conversation handler
  const handleCancelConversation = async () => {
    if (!sessionId) {
      console.warn('🚫 [LexicalChatInput] No session ID available for cancellation');
      return;
    }
    
    try {
      console.log('🚫 [LexicalChatInput] User clicked cancel button, calling utility function...');
      await cancelConversation(sessionId);
      console.log('🚫 [LexicalChatInput] ✅ Conversation cancelled successfully!');
    } catch (error) {
      console.error('🚫 [LexicalChatInput] ❌ Failed to cancel conversation:', error);
      // You could show a toast notification here if you have one
    }
  };

  // File selector handlers (mirror NewDraftModal approach)
  const handleFileSelect = useCallback((file: SearchMatch) => {
    // Insert the file reference as a markdown link with absolute path
    const fileReference = `[@${file.display}](@file:${file.full_path})`;
    
    // For Lexical editor, we'll append to the current content
    // The Lexical editor will handle parsing the markdown into pills
    const newContent = inputMessage + (inputMessage.trim() ? ' ' : '') + fileReference;
    setInputMessage(newContent);
    
    setShowFileSelector(false);
    setFileSearchQuery('');
    setSelectedFileIndex(0);
  }, [inputMessage]);

  const handleFileSelectorClose = useCallback(() => {
    setShowFileSelector(false);
    setFileSearchQuery('');
    setSelectedFileIndex(0);
  }, []);

  // Handle content changes from Lexical editor
  const handleContentChange = useCallback((newValue: string) => {
    setInputMessage(newValue);
  }, []);

  // Handle keyboard shortcuts
  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + K to open file selector
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowFileSelector(true);
      return;
    }

    // Handle file selector navigation when open
    if (showFileSelector) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFileIndex(prev => Math.min(prev + 1, fileResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFileIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (fileResults.length > 0) {
          handleFileSelect(fileResults[selectedFileIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleFileSelectorClose();
      }
      return;
    }

    // Normal input handling
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (queueMode) {
        queueDraft();
      } else {
        handleSubmit();
      }
      return;
    }
    
    // Call parent onKeyDown if provided
    onKeyDown?.(e);
  }, [queueMode, queueDraft, handleSubmit, onKeyDown, showFileSelector, fileResults, selectedFileIndex, handleFileSelect, handleFileSelectorClose]);

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
            
            {/* Lexical Editor Container */}
            <div 
              className={cn(
                "relative min-h-12 pr-24",
                queueMode && "ring-2 ring-violet-500/50 rounded-xl"
              )}
              onKeyDown={handleEditorKeyDown}
            >
              <LexicalPillEditor
                value={inputMessage}
                onChange={handleContentChange}
                codePath={codePath}
                placeholder={isTyping || isLoading ? "AI is thinking..." : placeholder}
                className="lexical-chat-input"
                disabled={isTyping || isLoading || disabled}
              />
            </div>

            {/* Input actions - Refined Apple style */}
            <div className={cn(
              "absolute right-2 flex items-center gap-2",
              isEditorExpanded ? "bottom-2" : "top-1/2 -translate-y-1/2"
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
                      disabled={!hasContent || isLoading || disabled}
                      onClick={queueMode ? queueDraft : handleSubmit}
                      className={cn(
                        "relative p-2 rounded-xl transition-all",
                        hasContent && !isLoading && !disabled
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
                          hasContent && !isLoading && !disabled ? "text-white" : "text-white/30"
                        )} />
                      ) : (
                        <Send className={cn(
                          "h-4 w-4 transition-colors",
                          hasContent && !isLoading && !disabled ? "text-white" : "text-white/30"
                        )} />
                      )}
                    </motion.button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* File Selector Overlay */}
        {showFileSelector && (
          <div className="absolute inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl" onClick={handleFileSelectorClose} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <FancyFileSelector
                isOpen={showFileSelector}
                query={fileSearchQuery}
                onQueryChange={setFileSearchQuery}
                results={fileResults}
                selectedIndex={selectedFileIndex}
                onFileSelect={handleFileSelect}
                onClose={handleFileSelectorClose}
                isSearching={isSearchingFiles}
                className="w-[500px] max-w-[90vw]"
              />
            </div>
          </div>
        )}

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
      </motion.div>
    </div>
  );
}