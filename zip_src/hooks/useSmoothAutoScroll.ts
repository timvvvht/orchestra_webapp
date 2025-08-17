import { useRef, useCallback, useEffect } from 'react';

interface UseSmoothAutoScrollOptions {
  bottomThreshold?: number;
  scrollDelay?: number;
  debug?: boolean;
}

interface UseSmoothAutoScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  handleNewMessages: (messageCount: number) => void;
  scrollToBottom: () => void;
  isNearBottom: () => boolean;
}

export function useSmoothAutoScroll(
  options: UseSmoothAutoScrollOptions = {}
): UseSmoothAutoScrollReturn {
  const {
    bottomThreshold = 100,
    scrollDelay = 50,
    debug = false
  } = options;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastMessageCountRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const log = useCallback((...args: any[]) => {
    if (debug) console.log('[useSmoothAutoScroll]', ...args);
  }, [debug]);

  const checkIsNearBottom = useCallback((): boolean => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom <= bottomThreshold;
    
    isNearBottomRef.current = nearBottom;
    return nearBottom;
  }, [bottomThreshold]);

  const scrollToBottom = useCallback((force = false) => {
    const container = scrollContainerRef.current;
    if (!container || (isScrollingRef.current && !force) || (!force && !isNearBottomRef.current)) {
      return;
    }

    isScrollingRef.current = true;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });

    setTimeout(() => {
      isScrollingRef.current = false;
    }, prefersReducedMotion ? 0 : 600);
  }, []);

  const handleNewMessages = useCallback((messageCount: number) => {
    if (messageCount <= lastMessageCountRef.current) return;
    
    lastMessageCountRef.current = messageCount;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    checkIsNearBottom();
    
    scrollTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(() => scrollToBottom());
    }, scrollDelay);
  }, [scrollDelay, checkIsNearBottom, scrollToBottom]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(checkIsNearBottom, 100);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [checkIsNearBottom]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollContainerRef,
    handleNewMessages,
    scrollToBottom: () => scrollToBottom(true),
    isNearBottom: checkIsNearBottom
  };
}
