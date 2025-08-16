/**
 * ChatScrollAnchor - Invisible anchor element for auto-scroll detection
 * Uses native Intersection Observer API for optimal performance
 */

import React, { useEffect, useRef } from "react";

interface ChatScrollAnchorProps {
  isAtBottom: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
  shouldAutoScroll: boolean;
  scrollToBottom: () => void;
}

export const ChatScrollAnchor: React.FC<ChatScrollAnchorProps> = ({
  isAtBottom,
  onVisibilityChange,
  shouldAutoScroll,
  scrollToBottom,
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    // Create intersection observer to detect if anchor is visible
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        console.log(
          `⚓ [ScrollAnchor] Intersection changed: ${entry.isIntersecting}, boundingRect: ${JSON.stringify(entry.boundingClientRect)}`
        );
        onVisibilityChange(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "0px 0px -1px 0px", // Slight offset to ensure accuracy
      }
    );

    observer.observe(anchor);

    return () => {
      observer.disconnect();
    };
  }, [onVisibilityChange]);

  // Auto-scroll when conditions are met
  useEffect(() => {
    if (shouldAutoScroll) {
      console.log(
        `⚓ [ScrollAnchor] Auto-scrolling triggered, isAtBottom: ${isAtBottom}`
      );
      scrollToBottom();
    }
  }, [shouldAutoScroll, scrollToBottom, isAtBottom]);

  return (
    <div
      ref={anchorRef}
      className="h-px w-full shrink-0"
      aria-hidden="true"
      data-testid="chat-scroll-anchor"
    />
  );
};

export default ChatScrollAnchor;
