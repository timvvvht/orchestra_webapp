/**
 * ChatMainCanonicalLegacyRefactored - Refactored version of the main chat interface
 * 
 * This is a refactored version that breaks down the monolithic ChatMainCanonicalLegacy
 * component into smaller, more manageable pieces:
 * 
 * - Custom hooks for state management (useChatSession, useChatScrolling, useChatSSE)
 * - Layout components (ChatContainer, ChatDebugOverlay)
 * - Better separation of concerns and improved maintainability
 */

import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// UI Components
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Chat Components
import ChatHeader from '@/components/chat-interface/ChatHeader';
import SessionDetailsDebug from '@/components/chat-interface/SessionDetailsDebug';
import ApprovalPanel from '@/components/chat-interface/ApprovalPanel';
import StreamDebugOverlay from '@/components/chat-interface/StreamDebugOverlay';
import HydrationDebugOverlay from '@/components/chat-interface/HydrationDebugOverlay';
import ChatMessageList from '@/components/chat-interface/ChatMessageList';
import ChatTypingIndicator from '@/components/chat-interface/ChatTypingIndicator';
import ChatScrollAnchor from '@/components/chat-interface/ChatScrollAnchor';
import NewMessagesIndicator from '@/components/chat-interface/NewMessagesIndicator';
import ChatInput from '@/components/chat-interface/ChatInput';
import MobileChatInput from '@/components/chat-interface/MobileChatInput';
import AgentProfile from '@/components/chat-interface/AgentProfile';
import NewChatModal from '@/components/chat-interface/NewChatModal';

// Extracted Components and Hooks
import { ChatContainer } from './components/ChatContainer';
import { useChatSession } from './hooks/useChatSession';
import { useChatScrolling } from './hooks/useChatScrolling';
import { useChatSSE } from './hooks/useChatSSE';

// Stores and Utils
import { useSessionStatusStore } from '@/stores/sessionStatusStore';
import { useChatUI } from '@/contexts/ChatUIContext';
import { useSelections } from '@/contexts/SelectionsContext';
import { useAuth } from '@/hooks/useAuth';
import { useBYOKStore } from '@/stores/byokStore';
import { useACSClient } from '@/hooks/useACSClient';
import { usePendingToolsStore } from '@/stores/pendingToolsStore';

// Utils
import { formatMessageDate, shouldGroupMessages } from '@/utils/chat';
import { isOptimizedFinalAssistantMessage, getOptimizedFileOperationsForResponse } from '@/utils/messageOptimization';
import { shouldUseUnifiedRendering, renderUnifiedTimelineEvent } from '@/utils/unifiedRendering';
import { mergeMessageGroups } from '@/utils/messageGrouping';

interface ChatMainCanonicalLegacyRefactoredProps {
  sidebarCollapsed: boolean;
  sessionId?: string;
}

const ChatMainCanonicalLegacyRefactored: React.FC<ChatMainCanonicalLegacyRefactoredProps> = ({
  sidebarCollapsed,
  sessionId: propSessionId
}) => {
  // Breakpoint detection
  const isDesktop = useBreakpoint('md');

  // External stores and contexts
  const { user } = useAuth();
  const { preferBYOK } = useBYOKStore();
  const { connectStreaming, disconnectStreaming, sseConnected, onSSEEvent } = useACSClient();
  const { sendMessage } = useChatUI();
  const { selectedAgent, selectedModel } = useSelections();

  // Custom hooks for extracted functionality
  const { 
    sessionId, 
    messages, 
    setMessages, 
    localIsLoading, 
    setLocalIsLoading, 
    loadEvents 
  } = useChatSession({ propSessionId });

  const {
    scrollAreaRef,
    isAtBottom,
    anchorVisible,
    newMessageCount,
    hasScrolledUp,
    shouldAutoScroll,
    scrollButtonConfig,
    handleScroll,
    scrollToBottom,
    handleAnchorVisibilityChange,
  } = useChatScrolling({ sessionId, messages });

  // SSE event processing
  useChatSSE({ 
    sessionId, 
    sseConnected, 
    disconnectStreaming, 
    loadEvents 
  });

  // Local UI state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [refinedMode, setRefinedMode] = useState(false);
  const [streamDebugOverlayOpen, setStreamDebugOverlayOpen] = useState(false);
  const [hydrationDebugOverlayOpen, setHydrationDebugOverlayOpen] = useState(false);
  const [toolDebugOpen, setToolDebugOpen] = useState(false);
  const [eventTapDebugOpen, setEventTapDebugOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugData, setDebugData] = useState<{
    supabaseData: any[];
    storeData: any[];
    loading: boolean;
  }>({ supabaseData: [], storeData: [], loading: false });

  // Session status and typing indicator
  const idleNow = useSessionStatusStore(
    state => (sessionId ? state.getStatus(sessionId) === 'idle' : true)
  );

  const isTyping = useMemo(() => {
    // If agent is marked as idle, don't show typing indicator
    if (idleNow) {
      return false;
    }

    // Check if any message is currently streaming
    const hasStreamingMessage = messages.some(m => m.isStreaming);
    
    // Show typing if there are streaming messages
    return hasStreamingMessage;
  }, [messages, sessionId, idleNow]);

  // Loading states
  const isLoading = localIsLoading;
  const isWaitingForAI = !idleNow && !isTyping;

  // Message grouping
  const mergedMessageGroups = useMemo(() => {
    return mergeMessageGroups(messages);
  }, [messages]);

  // ✅ WATCHDOG: Mark session as idle if no streaming messages detected
  useEffect(() => {
    const interval = setInterval(() => {
      const stillTyping = messages.some(m => m.isStreaming);
      if (!stillTyping && sessionId) {
        useSessionStatusStore.getState().markIdle(sessionId);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [messages, sessionId]);

  // Message submission
  const handleSubmit = async (content: string) => {
    if (!sessionId || !content.trim()) return;

    try {
      setLocalIsLoading(true);
      
      // Connect to streaming if not already connected
      if (!sseConnected) {
        await connectStreaming();
      }

      // Send message
      await sendMessage({
        content,
        sessionId,
        agentId: selectedAgent?.id,
        modelId: selectedModel?.id,
        preferBYOK
      });

      // Mark session as awaiting response
      useSessionStatusStore.getState().markAwaiting(sessionId);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLocalIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle any special key combinations here
  };

  const handleFork = (messageId: string) => {
    // Handle message forking
    console.log('Fork message:', messageId);
  };

  return (
    <ChatContainer>
      {/* Header Section */}
      <div className="flex-shrink-0">
        <ChatHeader
          sessionId={sessionId}
          onOpenAgentSelector={() => {}}
          refinedMode={refinedMode}
          onToggleRefinedMode={setRefinedMode}
          hasMessages={messages.length > 0}
          streamDebugOverlayOpen={streamDebugOverlayOpen}
          onToggleStreamDebugOverlay={setStreamDebugOverlayOpen}
          hydrationDebugOverlayOpen={hydrationDebugOverlayOpen}
          onToggleHydrationDebugOverlay={setHydrationDebugOverlayOpen}
          toolDebugOpen={toolDebugOpen}
          onToggleToolDebug={setToolDebugOpen}
          eventTapDebugOpen={eventTapDebugOpen}
          onToggleEventTapDebug={setEventTapDebugOpen}
        />
      </div>

      {/* Session Details Debug Component */}
      <div className="flex-shrink-0">
        <SessionDetailsDebug />
      </div>

      {/* Tool Approval Panel */}
      <div className="flex-shrink-0">
        <ApprovalPanel
          sessionId={sessionId}
          className="px-6 md:px-12 py-4 border-b border-white/10"
        />
      </div>

      {/* Debug Overlays */}
      <StreamDebugOverlay isOpen={streamDebugOverlayOpen} />
      <HydrationDebugOverlay 
        open={hydrationDebugOverlayOpen} 
        onClose={() => setHydrationDebugOverlayOpen(false)} 
      />

      {/* Message Display Area */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 min-h-0 max-h-full"
        viewportClassName="min-h-0 max-w-full"
        onScrollCapture={handleScroll}
      >
        <div className="px-6 md:px-12 pt-8 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-full overflow-x-hidden">
          <ChatMessageList
            messages={messages}
            mergedMessageGroups={mergedMessageGroups}
            refinedMode={refinedMode}
            isDesktop={isDesktop}
            handleFork={handleFork}
            formatMessageDate={formatMessageDate}
            shouldGroupMessages={shouldGroupMessages}
            isOptimizedFinalAssistantMessage={isOptimizedFinalAssistantMessage}
            getOptimizedFileOperationsForResponse={getOptimizedFileOperationsForResponse}
            shouldUseUnifiedRendering={shouldUseUnifiedRendering}
            renderUnifiedTimelineEvent={(event, index, events) =>
              renderUnifiedTimelineEvent(event, index, events, false, refinedMode)
            }
          />

          {/* Typing indicator */}
          <ChatTypingIndicator
            isVisible={isLoading || isWaitingForAI || false}
            agentName="AI Assistant"
            showThinkingState={messages.length > 0 && messages[messages.length - 1].thinking || false}
          />

          {/* Chat Scroll Anchor */}
          <ChatScrollAnchor
            isAtBottom={isAtBottom}
            onVisibilityChange={handleAnchorVisibilityChange}
            shouldAutoScroll={shouldAutoScroll}
            scrollToBottom={scrollToBottom}
          />
        </div>
      </ScrollArea>

      {/* Scroll Button */}
      <NewMessagesIndicator
        show={scrollButtonConfig.show}
        variant={scrollButtonConfig.variant}
        messageCount={scrollButtonConfig.messageCount}
        onClick={scrollToBottom}
      />

      {/* Message Input */}
      <div className="flex-shrink-0">
        {isDesktop ? (
          <ChatInput
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            isTyping={isTyping}
            isLoading={isLoading}
            placeholder="Message"
          />
        ) : (
          <MobileChatInput
            onSubmit={handleSubmit}
            disabled={isTyping || isLoading}
            placeholder="Message"
            isTyping={isTyping}
          />
        )}
      </div>

      {/* Agent Profile Drawer */}
      <AnimatePresence>
        {isProfileOpen && (
          <AgentProfile
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            agentId={'canonical-agent'}
          />
        )}
      </AnimatePresence>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebugPanel && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed top-0 right-0 h-full w-[600px] bg-gray-900 border-l border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Debug Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Debug Panel</h3>
              <button
                onClick={() => setShowDebugPanel(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Debug Panel Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Session Info</h4>
                  <div className="text-xs text-gray-300 font-mono">
                    Session ID: {sessionId}
                    <br />
                    Messages: {messages.length}
                    <br />
                    Loading: {isLoading ? 'Yes' : 'No'}
                    <br />
                    Typing: {isTyping ? 'Yes' : 'No'}
                    <br />
                    SSE Connected: {sseConnected ? 'Yes' : 'No'}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Scroll State</h4>
                  <div className="text-xs text-gray-300 font-mono">
                    At Bottom: {isAtBottom ? 'Yes' : 'No'}
                    <br />
                    Anchor Visible: {anchorVisible ? 'Yes' : 'No'}
                    <br />
                    New Messages: {newMessageCount}
                    <br />
                    Scrolled Up: {hasScrolledUp ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ChatContainer>
  );
};

export default ChatMainCanonicalLegacyRefactored;