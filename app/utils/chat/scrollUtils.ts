/**
 * Scroll management utilities for chat interface
 * Extracted from ChatMainCanonicalLegacy.tsx
 */

/**
 * Scroll to bottom of a container element
 * @param element - The scrollable container element
 * @param smooth - Whether to use smooth scrolling (default: true)
 */
export function scrollToBottom(element: HTMLElement, smooth: boolean = true): void {
  if (!element) return;
  
  element.scrollTo({
    top: element.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

/**
 * Check if an element is scrolled to the bottom
 * @param element - The scrollable container element
 * @param threshold - Threshold in pixels to consider "at bottom" (default: 100)
 */
export function isScrolledToBottom(element: HTMLElement, threshold: number = 100): boolean {
  if (!element) return false;
  
  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

/**
 * Get scroll percentage of an element
 * @param element - The scrollable container element
 * @returns Scroll percentage (0-100)
 */
export function getScrollPercentage(element: HTMLElement): number {
  if (!element) return 0;
  
  const { scrollTop, scrollHeight, clientHeight } = element;
  const maxScroll = scrollHeight - clientHeight;
  
  if (maxScroll <= 0) return 100;
  
  return Math.round((scrollTop / maxScroll) * 100);
}