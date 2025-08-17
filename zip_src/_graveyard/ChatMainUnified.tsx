/**
 * ChatMainUnified - Combines the polished Apple-style UI from ChatMainLegacy 
 * with the modern timeline logic from ChatMainWithBoundaries
 * 
 * This component unifies the best of both worlds:
 * - Beautiful, polished Apple-style UI from ChatMainLegacy
 * - Modern timeline/refined-mode logic from useACSChatUIRefactored
 * - Proper tool event rendering via TimelineEventRenderer
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Paperclip, Send, Image, Info, MessageSquare,
  ThumbsUp, ThumbsDown, Plus, Sparkles, X,
  ChevronDown, MoreHorizontal, Clock, AlertCircle,
  FileText
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// New imports for timeline system
import { useACSChatUIRefactored } from '@/hooks/acs-chat/useACSChatUIRefactored';
import { useCanonicalChatUI } from '@/hooks/useCanonicalChatUI';
import { useCanonicalStoreEnabled } from '@/hooks/useCanonicalStoreEnabled';
import { TimelineEventRenderer } from './timeline/TimelineEventRenderer';
import { hasStreamingEvents, consolidateChunks } from '@/types/unifiedTimeline';
import type { 
  UnifiedTimelineEvent, 
  TextTimelineEvent, 
  ToolCallTimelineEvent, 
  ToolResultTimelineEvent 
} from '@/types/unifiedTimeline';

// Existing imports from ChatMainLegacy
import { SSEEventDebugPanel } from '@/components/debug/SSEEventDebugPanel';
// Import SSE Event types for debug panel
import type { SSEEvent } from '@/services/acs';
import type {
  ChatMessage as ChatMessageType,
  ChatSession as ChatSessionType,
} from '@/types/chatTypes';
import { ChatRole } from '@/types/chatTypes';
import ChatMessage from './ChatMessage';
import AgentProfile from './AgentProfile';
import ChatHeader from './header/ChatHeader';
import NewChatModal from './NewChatModal';
import AgentSelectorModal from './AgentSelectorModal';
import QuantumWaveIndicator from './QuantumWaveIndicator';
import { TimelineRenderer, shouldUseUnifiedRendering } from './TimelineRenderer';
import { DynamicToolStatusPill, FileOperationsSummary, renderUnifiedTimelineEvent, CombinedThinkBlockDisplay, AssistantMessageWithFileOps } from './UnifiedTimelineRenderer';

// Dual Render View Component
interface DualRenderViewProps {
  legacyChat: any;
  canonicalChat: any;
  refinedMode: boolean;
  onFork: (messageId: string) => void;
}

const DualRenderView: React.FC<DualRenderViewProps> = ({ 
  legacyChat, 
  canonicalChat, 
  refinedMode, 
  onFork 
}) => {
  // Process legacy timeline
  const legacyTimeline = consolidateChunks(legacyChat.timeline || []);
  const legacyMessages = legacyTimeline
    .filter(ev => ev.type === 'text')
    .map(ev => ({
      id: ev.id,
      content: [{ type: 'text', text: ev.text }],
      role: ev.role,
      createdAt: ev.createdAt,
      isStreaming: ev.isStreaming || false,
      sessionId: ev.sessionId,
      thinking: false
    }));

  // Process canonical timeline
  const canonicalTimeline = consolidateChunks(canonicalChat.timeline || []);
  const canonicalMessages = canonicalTimeline
    .filter(ev => ev.type === 'text')
    .map(ev => ({
      id: ev.id,
      content: [{ type: 'text', text: ev.text }],
      role: ev.role,
      createdAt: ev.createdAt,
      isStreaming: ev.isStreaming || false,
      sessionId: ev.sessionId,
      thinking: false
    }));

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Legacy Column */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <h3 className="text-lg font-semibold text-white">Legacy System</h3>
          <div className="text-xs text-white/50 ml-auto">
            {legacyMessages.length} messages, {legacyTimeline.length} events
          </div>
        </div>
        
        {legacyMessages.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No legacy messages
          </div>
        ) : (
          <div className="space-y-4">
            {legacyMessages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLastMessage={index === legacyMessages.length - 1}
                isFirstInGroup={true}
                isLastInGroup={true}
                showAvatar={true}
                showTimestamp={true}
                onFork={() => onFork(message.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Canonical Column */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <h3 className="text-lg font-semibold text-white">Canonical Store</h3>
          <div className="text-xs text-white/50 ml-auto">
            {canonicalMessages.length} messages, {canonicalTimeline.length} events
          </div>
        </div>
        
        {canonicalMessages.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No canonical messages
          </div>
        ) : (
          <div className="space-y-4">
            {canonicalMessages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLastMessage={index === canonicalMessages.length - 1}
                isFirstInGroup={true}
                isLastInGroup={true}
                showAvatar={true}
                showTimestamp={true}
                onFork={() => onFork(message.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ChatMainUnifiedProps {
  sidebarCollapsed: boolean;
  isCodingMode?: boolean;
  onToggleCodingMode?: () => void;
  codingModePath?: string;
  onCodingModePathChange?: (path: string) => void;
}

/**
 * ChatMainUnified - The unified chat interface component
 * 
 * Displays messages using timeline logic with Apple-style UI
 */
const ChatMainUnified: React.FC<ChatMainUnifiedProps> = ({ 
  sidebarCollapsed, 
  isCodingMode, 
  onToggleCodingMode,
  codingModePath,
  onCodingModePathChange 
}) => {
  // State from ChatMainLegacy
  const [inputMessage, setInputMessage] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [refinedMode, setRefinedMode] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(true); // 🔍 DEBUG: Auto-show overlay
  const [showDualRender, setShowDualRender] = useState(false); // 🔄 DUAL: Dual render mode
  
  // Refs from ChatMainLegacy
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  // URL parameters for initial message handling
  const [searchParams, setSearchParams] = useSearchParams();

  // Feature flag check
  const isCanonicalEnabled = useCanonicalStoreEnabled();

  // Select the active chat interface based on the feature flag
  const useChatHook = isCanonicalEnabled ? useCanonicalChatUI : useACSChatUIRefactored;
  const chat = useChatHook({ 
    autoInitialize: true, 
  });

  // Process timeline data
  const timeline = consolidateChunks(chat.timeline || []);
  
  // 🔍 DEBUG: Log timeline data
  console.log('🔍 [ChatMainUnified] Timeline data:', {
    rawTimelineLength: chat.timeline?.length || 0,
    consolidatedTimelineLength: timeline.length,
    timelineTypes: timeline.map(e => e.type),
    toolCallsInTimeline: timeline.filter(e => e.type === 'tool_call').length,
    toolResultsInTimeline: timeline.filter(e => e.type === 'tool_result').length,
    rawTimeline: chat.timeline,
    consolidatedTimeline: timeline
  });
  
  // Derive datasets for rendering
  const visibleMessages = useMemo(() => {
    const messages = timeline
      .filter(ev => ev.type === 'text')
      .map(ev => {
        const textEvent = ev as TextTimelineEvent;
        // Convert timeline text event to ChatMessage format for compatibility
        return {
          id: textEvent.id,
          content: [{ type: 'text', text: textEvent.text }],
          role: textEvent.role as ChatRole,
          createdAt: textEvent.createdAt,
          isStreaming: textEvent.isStreaming || false,
          sessionId: textEvent.sessionId,
          thinking: false // Add default value
        } as ChatMessageType;
      });
    
    // 🔍 DEBUG: Log visible message IDs
    console.log('🔍 [ChatMainUnified] Visible message IDs:', {
      messageIds: messages.map(m => m.id),
      messageCount: messages.length
    });
    
    return messages;
  }, [timeline]);

  const toolEvents = useMemo(() => {
    const filtered = timeline.filter(ev => ev.type === 'tool_call' || ev.type === 'tool_result');
    console.log('🔍 [ChatMainUnified] Tool events filtered:', {
      totalTimelineEvents: timeline.length,
      toolEventsFound: filtered.length,
      toolEvents: filtered
    });
    return filtered;
  }, [timeline]);

  // Current agent info
  const currentAgent = chat.currentAgentConfig ? {
    id: chat.currentAgentConfig.id,
    name: chat.currentAgentConfig.agent?.name || chat.currentSession?.name || 'Assistant',
    avatar: chat.currentAgentConfig.agent?.avatar || 'assets/robots/robot1.png',
    agent_config_id: chat.currentAgentConfig.id
  } : null;

  // Check if we're waiting for AI response
  const isWaitingForAI = useMemo(() => {
    return hasStreamingEvents(timeline) || chat.isLoading;
  }, [timeline, chat.isLoading]);

  // Focus the input and auto-scroll to bottom whenever the active chat session changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    setAutoScroll(true);

    const viewport = scrollViewportRef.current;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [chat.currentSessionId]);

  // Handle ACS errors globally
  useEffect(() => {
    if (chat.error) {
      toast.error('Chat Error', {
        description: chat.error,
        duration: 5000,
        action: {
          label: 'Dismiss',
          onClick: () => chat.clearError(),
        },
      });
    }
  }, [chat.error, chat.clearError]);

  // Handle initial message from URL parameter
  useEffect(() => {
    const initialMessage = searchParams.get('initialMessage');
    if (initialMessage && chat.currentSessionId && !chat.isLoading && chat.currentAgentConfig) {

      // Clear the URL parameter after processing
      setSearchParams({}, { replace: true });

      // Send the initial message
      chat.sendMessage(initialMessage)
        .then(() => {
          toast.success('Message sent!');
        })
        .catch(() => {
          toast.error('Failed to send message.');
        });
    }
  }, [searchParams, chat.currentSessionId, chat.isLoading, chat.currentAgentConfig, chat.sendMessage, setSearchParams]);

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollViewportRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      setHasScrolledUp(!isAtBottom);
      setAutoScroll(isAtBottom);
    };

    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll);
      return () => viewport.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Scroll to bottom when messages change if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [visibleMessages, autoScroll]);

  // Store viewport ref when ScrollArea renders
  const handleScrollAreaViewport = (node: HTMLDivElement | null) => {
    scrollViewportRef.current = node;
  };

  // Format date for message groups in WhatsApp style (from ChatMainLegacy)
  const formatMessageDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if date is within the current year
    const isCurrentYear = date.getFullYear() === today.getFullYear();

    if (date.getTime() === today.getTime()) {
      return 'Today';
    }

    if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    // For dates within the current year, don't show the year (WhatsApp style)
    if (isCurrentYear) {
      return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short'
      });
    }

    // For older dates, include the year (WhatsApp style)
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Check if messages should be grouped
  const shouldGroupMessages = (msg1: ChatMessageType, msg2: ChatMessageType) => {
    const time1 = msg1.createdAt || 0;
    const time2 = msg2.createdAt || 0;
    const timeDiff = Math.abs(time1 - time2);
    const twoMinutes = 2 * 60 * 1000;

    return msg1.role === msg2.role && timeDiff < twoMinutes;
  };

  // Apply refined mode filtering to timeline
  const processedTimeline = useMemo(() => {
    if (!refinedMode) {
      return timeline; // Show all events in normal mode
    }
    
    // In refined mode, filter out intermediate chunks but keep final tool summary
    return timeline.filter(ev => ev.type !== 'chunk' || !ev.isStreaming);
  }, [timeline, refinedMode]);

  // Group messages by date (from ChatMainLegacy)
  const messageGroups = useMemo(() => {
    if (!visibleMessages.length) return [];

    const groups: { date: Date; messages: ChatMessageType[] }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: ChatMessageType[] = [];

    visibleMessages.forEach((message) => {
      const messageTime = message.createdAt || Date.now();
      const messageDate = new Date(messageTime);
      messageDate.setHours(0, 0, 0, 0); // Normalize to start of day

      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate!, messages: [...currentGroup] });
          currentGroup = [];
        }
        currentDate = messageDate;
      }

      currentGroup.push(message);
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [visibleMessages]);

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (isWaitingForAI && autoScroll) {
      scrollToBottom();
    }
  }, [isWaitingForAI, autoScroll]);

  // Handle message submission
  const handleSubmit = async () => {
    if (!inputMessage.trim()) return;
    
    // We need a current session
    if (!chat.currentSessionId) return;

    const trimmedMessage = inputMessage.trim();

    try {
      await chat.sendMessage(trimmedMessage);
      
      setInputMessage('');
      setAutoScroll(true);
    } catch (error) {
      console.error(`Error sending message:`, error);
      
      if (chat.error) {
        chat.clearError();
      }
      
      toast.error('Failed to send message', {
        description: chat.error || 'Please try again.',
        duration: 3000,
      });
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle message forking
  const handleFork = async (messageId: string) => {
    try {
      // For now, create a new session and navigate to it
      const newSessionId = await chat.createSession();
      if (newSessionId) {
        await chat.navigateToSession(newSessionId);
        toast.success('Conversation forked', {
          description: 'Created a new conversation branch.',
          duration: 3000,
        });
      }
    } catch (_) {
      toast.error('Failed to fork conversation', {
        description: 'Please try again.',
        duration: 3000,
      });
    }
  };

  // Scroll to bottom button handler
  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setAutoScroll(true);
    }
  };

  // Empty state - Apple style (from ChatMainLegacy)
  if (!chat.currentSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center space-y-8 max-w-md"
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
            onClick={() => setIsNewChatModalOpen(true)}
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
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative bg-black">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none" />

      <ChatHeader 
        sessionId={chat.currentSessionId}
        onOpenAgentSelector={() => {}}
        // Pass down coding mode props
        isCodingMode={isCodingMode || false}
        onToggleCodingMode={onToggleCodingMode || (() => {})}
        directoryContext={codingModePath || ''}
        onDirectoryContextChange={onCodingModePathChange || (() => {})}
      />

      {/* Mode Toggles */}
      {visibleMessages.length > 0 && (
        <div className="px-6 md:px-12 py-2 border-b border-white/10">
          <div className="flex items-center gap-6">
            {/* Refined Mode Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="refined-mode"
                checked={refinedMode}
                onCheckedChange={setRefinedMode}
              />
              <Label htmlFor="refined-mode" className="text-sm text-white/70">
                Refined Mode
              </Label>
            </div>

            {/* Dual Render Toggle (only show when canonical is enabled) */}
            {isCanonicalEnabled && (
              <div className="flex items-center gap-2">
                <Switch
                  id="dual-render"
                  checked={showDualRender}
                  onCheckedChange={setShowDualRender}
                />
                <Label htmlFor="dual-render" className="text-sm text-white/70">
                  Compare Legacy vs Canonical
                </Label>
              </div>
            )}

            {/* Event Count */}
            <div className="ml-auto text-xs text-white/50">
              {isCanonicalEnabled && <span className="text-green-400">📊 Canonical: </span>}
              {refinedMode ? `${visibleMessages.length}/${timeline.length} events` : `${timeline.length} events`}
            </div>
          </div>
        </div>
      )}

      {/* Message Display Area - Apple style with generous spacing */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto relative z-10"
        viewportRef={handleScrollAreaViewport}
      >
        <div className="px-6 md:px-12 py-8 min-h-full">
          {/* Dual Render Mode */}
          {isCanonicalEnabled && showDualRender ? (
            <DualRenderView 
              legacyChat={legacyChat}
              canonicalChat={canonicalChat}
              refinedMode={refinedMode}
              onFork={handleFork}
            />
          ) : (
            /* Single Render Mode */
            <>
            {visibleMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center justify-center h-64 my-12"
            >
              <div className="text-center space-y-6 max-w-sm">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative mx-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#5856D6] to-[#007AFF] blur-2xl opacity-30" />
                  <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#5856D6] to-[#007AFF] flex items-center justify-center shadow-xl">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                </motion.div>
                <div className="space-y-3">
                  <p className="font-semibold text-2xl text-white">
                    {chat.currentSession?.name || 'AI Assistant'}
                  </p>
                  <p className="text-base text-white/60 leading-relaxed">
                    Ready to help. Send a message to begin.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {messageGroups.map((group, groupIndex) => (
                <motion.div 
                  key={`group-${groupIndex}`} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: groupIndex * 0.1 }}
                  className="space-y-6"
                >
                  {/* Date separator - Apple style */}
                  <div className="flex justify-center my-6">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10"
                    >
                      <span className="text-xs font-medium text-white/60">
                        {formatMessageDate(group.date)}
                      </span>
                    </motion.div>
                  </div>

                  {group.messages.map((message, messageIndex) => {
                    const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                    const nextMessage = messageIndex < group.messages.length - 1 ? group.messages[messageIndex + 1] : null;

                    const isFirstInGroup = !prevMessage || !shouldGroupMessages(message, prevMessage);
                    const isLastInGroup = !nextMessage || !shouldGroupMessages(message, nextMessage);
                    const isLastMessage = groupIndex === messageGroups.length - 1 && messageIndex === group.messages.length - 1;

                    // 🔧 FIX: Use messageId from timeline event, not the derived text event ID
                    const messageTimelineEvent = timeline.find(ev => ev.id === message.id);
                    const originalMessageId = messageTimelineEvent?.messageId || message.id;

                    // 🔍 DEBUG: Log message ID and tool event messageIds for comparison
                    console.log('🔍 [ChatMainUnified] Message ID comparison:', {
                      messageId: message.id,
                      originalMessageId,
                      messageIndex,
                      toolEventMessageIds: toolEvents.map(te => te.messageId),
                      toolEventsCount: toolEvents.length
                    });
                    const associatedToolEvents = toolEvents.filter(toolEvent => toolEvent.messageId === originalMessageId);
                    const useUnified = shouldUseUnifiedRendering(message);
                    
                    // 🔍 DEBUG: Log tool event association
                    if (associatedToolEvents.length > 0) {
                      console.log('🔍 [ChatMainUnified] Found associated tool events:', {
                        messageId: message.id,
                        associatedCount: associatedToolEvents.length,
                        toolEventTypes: associatedToolEvents.map(e => e.type),
                        toolEvents: associatedToolEvents,
                        message
                      });
                    }

                    return (
                      <div key={message.id}>
                        {/* Render tool events before the message if any */}
                        {associatedToolEvents
                          .filter(ev => ev.type === 'tool_call')
                          .map(toolEvent => (
                            <div key={toolEvent.id} className="flex gap-3 mb-2">
                              <div className="w-8 flex-shrink-0" /> {/* Spacer for avatar alignment */}
                              <TimelineEventRenderer
                                event={toolEvent}
                                onFork={() => handleFork(message.id)}
                              />
                            </div>
                          ))}

                        {/* Render the main message */}
                        {useUnified ? (
                          <TimelineRenderer
                            message={message}
                            onFork={() => handleFork(message.id)}
                            isLastMessage={isLastMessage}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                            showAvatar={isFirstInGroup}
                            showTimestamp={isLastInGroup}
                            isStreaming={message.isStreaming || false}
                            refinedMode={refinedMode}
                          />
                        ) : (
                          <ChatMessage
                            message={message}
                            isLastMessage={isLastMessage}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                            showAvatar={isFirstInGroup}
                            showTimestamp={isLastInGroup}
                            onFork={() => handleFork(message.id)}
                          />
                        )}

                        {/* Render tool results after the message if any */}
                        {associatedToolEvents
                          .filter(ev => ev.type === 'tool_result')
                          .map(toolEvent => (
                            <div key={toolEvent.id} className="flex gap-3 mt-2">
                              <div className="w-8 flex-shrink-0" /> {/* Spacer for avatar alignment */}
                              <TimelineEventRenderer
                                event={toolEvent}
                                onFork={() => handleFork(message.id)}
                              />
                            </div>
                          ))}
                      </div>
                    );
                  })}
                </motion.div>
              ))}
              
              {/* Typing indicator when waiting for AI */}
              <AnimatePresence>
                {isWaitingForAI && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <QuantumWaveIndicator 
                      agentName={chat.currentSession?.name || 'AI Assistant'} 
                      showThinkingState={false}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          </>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button - Apple style floating action */}
      <AnimatePresence>
        {hasScrolledUp && (
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
              onClick={scrollToBottom}
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

      {/* Message Input - Apple style floating input */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-20"
      >
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        <div className="relative px-6 md:px-12 py-6">
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
            <div className="relative bg-white/[0.06] backdrop-blur-2xl rounded-2xl border border-white/10 p-1.5 shadow-2xl">
              <Input
                ref={inputRef}
                type="text"
                placeholder={isWaitingForAI || chat.hasStreamingMessage ? "AI is thinking..." : "Message"}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isWaitingForAI || chat.hasStreamingMessage}
                className="w-full h-12 bg-transparent border-0 px-5 pr-24 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              {/* Input actions - Refined Apple style */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
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

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={!inputMessage.trim() || isWaitingForAI || chat.hasStreamingMessage}
                        onClick={handleSubmit}
                        className={cn(
                          "relative p-2 rounded-xl transition-all",
                          inputMessage.trim() && !isWaitingForAI && !chat.hasStreamingMessage
                            ? "bg-[#007AFF] shadow-lg"
                            : "bg-white/10"
                        )}
                      >
                        <Send className={cn(
                          "h-4 w-4 transition-colors",
                          inputMessage.trim() && !isWaitingForAI && !chat.hasStreamingMessage ? "text-white" : "text-white/30"
                        )} />
                      </motion.button>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agent Profile Drawer */}
      <AnimatePresence>
        {isProfileOpen && chat.currentSession && (
          <AgentProfile
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            agentId={chat.currentSession.id}
          />
        )}
      </AnimatePresence>
      
      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />

      {/* SSE Debug Panel (dev only) */}
      {process.env.NODE_ENV !== 'production' && (
        <SSEEventDebugPanel 
          events={chat.sseEvents || []} 
          currentSessionId={chat.currentSessionId}
          isConnected={chat.isConnected}
        />
      )}

      {/* 🔍 TOOL CALL DEBUG OVERLAY */}
      {showDebugOverlay && (
        <div className="fixed top-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg max-w-lg max-h-[80vh] overflow-y-auto text-xs font-mono border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-yellow-400">🔍 Tool Call Debug</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const debugData = {
                    timeline: timeline,
                    toolEvents: toolEvents,
                    visibleMessages: visibleMessages,
                    messages: chat.messages,
                    currentSessionId: chat.currentSessionId
                  };
                  navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
                }}
                className="text-white/60 hover:text-white text-xs px-2 py-1 bg-white/10 rounded"
                title="Copy debug data to clipboard"
              >
                📋
              </button>
              <button 
                onClick={() => setShowDebugOverlay(false)}
                className="text-white/60 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {/* Timeline Summary */}
            <div className="border-b border-white/20 pb-2">
              <div className="text-yellow-300 font-semibold">Timeline Data:</div>
              <div>Raw: {chat.timeline?.length || 0} events</div>
              <div>Consolidated: {timeline.length} events</div>
              <div className="text-green-400">Tool Calls: {timeline.filter(e => e.type === 'tool_call').length}</div>
              <div className="text-blue-400">Tool Results: {timeline.filter(e => e.type === 'tool_result').length}</div>
              <div>Text Events: {timeline.filter(e => e.type === 'text').length}</div>
              <div>Other: {timeline.filter(e => !['tool_call', 'tool_result', 'text'].includes(e.type)).length}</div>
            </div>

            {/* Tool Events Detail */}
            <div className="border-b border-white/20 pb-2">
              <div className="text-yellow-300 font-semibold">Tool Events Found:</div>
              {toolEvents.length === 0 ? (
                <div className="text-red-400">❌ No tool events found!</div>
              ) : (
                <div className="space-y-1">
                  {toolEvents.slice(0, 6).map((event, i) => (
                    <div key={i} className="text-xs">
                      <span className={event.type === 'tool_call' ? 'text-green-400' : 'text-blue-400'}>
                        {event.type}
                      </span>
                      {': '}
                      {event.type === 'tool_call' ? 
                        (event as ToolCallTimelineEvent).toolCall?.name || 'unknown' :
                        'result'
                      }
                      <span className="text-white/60"> (msg: {event.messageId})</span>
                    </div>
                  ))}
                  {toolEvents.length > 6 && (
                    <div className="text-white/60">... and {toolEvents.length - 6} more</div>
                  )}
                </div>
              )}
              
              {/* Show visible vs tool event message ID comparison */}
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="text-yellow-300 font-semibold text-xs">Message ID Comparison:</div>
                <div className="text-xs space-y-1">
                  <div className="text-green-400">Visible: {visibleMessages.map(m => m.id.replace('-text-0', '')).join(', ')}</div>
                  <div className="text-blue-400">Tool Results: {toolEvents.filter(e => e.type === 'tool_result').map(e => e.messageId).join(', ')}</div>
                  <div className="text-green-400">Tool Calls: {toolEvents.filter(e => e.type === 'tool_call').map(e => e.messageId).join(', ')}</div>
                  
                  {/* Show tool call ID mapping */}
                  <div className="mt-2 pt-1 border-t border-white/5">
                    <div className="text-yellow-300 font-semibold">Tool Call ID Mapping:</div>
                    {toolEvents.filter(e => e.type === 'tool_call').map((toolCall, i) => {
                      const tc = toolCall as any;
                      return (
                        <div key={i} className="text-xs text-green-400">
                          Call {i + 1}: ID={tc.toolCall?.id || 'none'} → msg={tc.messageId}
                          <div className="ml-2 text-white/40 text-xs">
                            Raw: {JSON.stringify(tc.toolCall, null, 0).substring(0, 100)}...
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Show association status */}
                  <div className="mt-2 pt-1 border-t border-white/5">
                    <div className="text-yellow-300 font-semibold">Association Status:</div>
                    {toolEvents.filter(e => e.type === 'tool_result').map((toolResult, i) => {
                      const tr = toolResult as any;
                      const toolCallId = tr.toolResult?.toolCallId;
                      const isAssociated = visibleMessages.some(m => m.id.replace('-text-0', '') === toolResult.messageId);
                      
                      // Find matching tool call
                      const matchingToolCall = toolEvents.find(e => e.type === 'tool_call' && (e as any).toolCall?.id === toolCallId);
                      
                      // Determine extraction source for debugging
                      const extractionSource = toolCallId ? 
                        (toolCallId.startsWith('tool_') ? 'Supabase extraction ✅' : 
                         toolCallId.startsWith('call_') ? 'Content extraction ✅' : 
                         'Unknown source ⚠️') : 
                        'Not extracted ❌';
                      
                      return (
                        <div key={i} className={`text-xs ${isAssociated ? 'text-green-400' : 'text-red-400'}`}>
                          Result {i + 1}: {isAssociated ? '✅ Associated' : '❌ Not Associated'} (msg: {toolResult.messageId})
                          <div className="ml-2 text-white/60">
                            toolCallId: {toolCallId || 'none'} {matchingToolCall ? '✅ found' : '❌ not found'}
                          </div>
                          <div className="ml-2 text-cyan-400 text-xs">
                            Extraction: {extractionSource}
                          </div>
                          <div className="ml-2 text-white/40 text-xs">
                            Raw toolResult (FULL): {JSON.stringify(tr.toolResult, null, 2)}
                          </div>
                          <div className="ml-2 text-white/40 text-xs">
                            Full event (FULL): {JSON.stringify(tr, null, 2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Show rendering status */}
                  <div className="mt-2 pt-1 border-t border-white/5">
                    <div className="text-yellow-300 font-semibold">Rendering Status:</div>
                    {visibleMessages.map((message, i) => {
                      const originalMessageId = message.id.replace('-text-0', '');
                      const associatedToolEvents = toolEvents.filter(toolEvent => toolEvent.messageId === originalMessageId);
                      const toolCalls = associatedToolEvents.filter(e => e.type === 'tool_call');
                      const toolResults = associatedToolEvents.filter(e => e.type === 'tool_result');
                      
                      if (associatedToolEvents.length > 0) {
                        return (
                          <div key={i} className="text-xs">
                            <span className="text-white">Msg {i + 1}:</span>
                            {toolCalls.length > 0 && <span className="text-green-400"> {toolCalls.length} call(s)</span>}
                            {toolResults.length > 0 && <span className="text-blue-400"> {toolResults.length} result(s)</span>}
                            <span className="text-white/60"> → Should render {associatedToolEvents.length} tool events</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Raw Supabase Data for ALL Messages */}
            <div className="border-b border-white/20 pb-2">
              <div className="text-yellow-300 font-semibold">Raw Supabase Messages (All):</div>
              {chat.messages?.slice(0, 8).map((msg, i) => (
                <div key={i} className="text-xs mt-2 p-2 bg-white/5 rounded">
                  <div className="text-cyan-400">Message {i + 1}:</div>
                  <div className="text-white/60">ID: {msg.id}</div>
                  <div className="text-white/60">Role: {msg.role}</div>
                  <div className="text-white/60">tool_call_id: {(msg as any).tool_call_id || 'none'}</div>
                  <div className="text-white/60">Content Type: {Array.isArray(msg.content) ? 'array' : typeof msg.content}</div>
                  {Array.isArray(msg.content) && (
                    <div className="text-white/60">Content Parts: {msg.content.map(c => c.type).join(', ')}</div>
                  )}
                  <div className="text-white/60">Full Message (NO TRUNCATION):</div>
                  <div className="ml-2 text-white/40 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(msg, null, 2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Messages Summary */}
            <div className="border-b border-white/20 pb-2">
              <div className="text-yellow-300 font-semibold">Messages Store:</div>
              <div>Total Messages: {chat.messages?.length || 0}</div>
              <div>Visible Messages: {visibleMessages.length}</div>
              <div>Session: {chat.currentSessionId || 'none'}</div>
              {chat.messages && chat.messages.length > 0 && (
                <div className="mt-1 text-xs">
                  <div className="text-white/60">Content Types in Messages:</div>
                  {chat.messages.slice(0, 2).map((msg, i) => (
                    <div key={i} className="ml-2">
                      Msg {i}: {Array.isArray(msg.content) ? 
                        msg.content.map(c => c.type).join(', ') : 
                        'string'
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pipeline Status */}
            <div>
              <div className="text-yellow-300 font-semibold">Pipeline Status:</div>
              <div className={chat.messages?.length ? 'text-green-400' : 'text-red-400'}>
                ✓ Messages: {chat.messages?.length || 0}
              </div>
              <div className={timeline.length ? 'text-green-400' : 'text-red-400'}>
                ✓ Timeline: {timeline.length}
              </div>
              <div className={toolEvents.length ? 'text-green-400' : 'text-red-400'}>
                ✓ Tool Events: {toolEvents.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Toggle Button */}
      {!showDebugOverlay && (
        <button
          onClick={() => setShowDebugOverlay(true)}
          className="fixed top-4 right-4 z-50 bg-yellow-500 text-black px-3 py-1 rounded text-xs font-bold hover:bg-yellow-400"
        >
          🔍 Debug
        </button>
      )}
    </div>
  );
};

export default ChatMainUnified;