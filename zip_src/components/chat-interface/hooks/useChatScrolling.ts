/**
 * useChatScrolling - Custom hook for managing chat auto-scroll behavior
 * Extracted from ChatMainCanonicalLegacy to improve maintainability
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage as ChatMessageType } from '@/types/chatTypes';

interface UseChatScrollingProps {
  sessionId?: string;
  messages: ChatMessageType[];
}

export const useChatScrolling = ({ sessionId, messages }: UseChatScrollingProps) => {
  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll state
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [anchorVisible, setAnchorVisible] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);

  // Monitor sessionId changes and reset auto-scroll state
  useEffect(() => {
    console.log(`🔄 [useChatScrolling] New session: ${sessionId}, resetting auto-scroll state`);
    
    // Reset auto-scroll state for new session
    setIsAtBottom(true);
    setAnchorVisible(true);
    setNewMessageCount(0);
    setHasScrolledUp(false);
    setLastMessageCount(0);
    
    // Scroll to bottom after a brief delay to ensure DOM is ready
    setTimeout(() => {
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        console.log(`🔄 [useChatScrolling] Scrolling to bottom for session: ${sessionId}`);
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [sessionId]);

  // Auto-scroll functions
  const handleScroll = useCallback((event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const threshold = 5; // 5px tolerance for "at bottom"
    const atBottom = scrollHeight - clientHeight <= scrollTop + threshold;
    
    // Detect if user has scrolled up significantly (more than 30% from bottom)
    const scrollFromBottom = scrollHeight - clientHeight - scrollTop;
    const scrollUpThreshold = clientHeight * 0.3; // 30% of viewport height
    const scrolledUpSignificantly = scrollFromBottom > scrollUpThreshold;
    
    console.log(`📜 [useChatScrolling] Session: ${sessionId}, atBottom: ${atBottom}, scrollTop: ${scrollTop}, scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight}`);
    
    setIsAtBottom(atBottom);
    setHasScrolledUp(scrolledUpSignificantly);
  }, [sessionId]);

  const scrollToBottom = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const scrollContainer = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  const handleAnchorVisibilityChange = useCallback((isVisible: boolean) => {
    setAnchorVisible(isVisible);
  }, []);

  // Auto-scroll logic: scroll if user is at bottom OR anchor is not visible (new messages arrived)
  const shouldAutoScroll = useMemo(() => {
    const result = isAtBottom && !anchorVisible;
    console.log(`🔄 [useChatScrolling] Session: ${sessionId}, shouldAutoScroll: ${result}, isAtBottom: ${isAtBottom}, anchorVisible: ${anchorVisible}, messageCount: ${messages.length}`);
    return result;
  }, [isAtBottom, anchorVisible, sessionId, messages.length]);

  // Track new messages for the indicator
  useEffect(() => {
    const currentMessageCount = messages.length;
    if (currentMessageCount > lastMessageCount && !isAtBottom) {
      setNewMessageCount(prev => prev + (currentMessageCount - lastMessageCount));
    }
    setLastMessageCount(currentMessageCount);
  }, [messages.length, lastMessageCount, isAtBottom]);

  // Reset new message count when user scrolls to bottom
  useEffect(() => {
    if (isAtBottom) {
      setNewMessageCount(0);
    }
  }, [isAtBottom]);

  // Determine which button to show and what variant
  const scrollButtonConfig = useMemo(() => {
    // Priority 1: New messages (always takes precedence)
    if (!isAtBottom && newMessageCount > 0) {
      return {
        show: true,
        variant: 'new-messages' as const,
        messageCount: newMessageCount,
      };
    }
    
    // Priority 2: Back to latest (when scrolled up significantly, no new messages)
    if (hasScrolledUp && newMessageCount === 0) {
      return {
        show: true,
        variant: 'back-to-latest' as const,
        messageCount: undefined,
      };
    }
    
    // Default: No button
    return {
      show: false,
      variant: 'new-messages' as const,
      messageCount: 0,
    };
  }, [isAtBottom, newMessageCount, hasScrolledUp]);

  return {
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
  };
};