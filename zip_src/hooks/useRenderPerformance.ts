import { useEffect, useRef } from 'react';

/**
 * Hook to measure component render performance
 * Logs warnings for slow renders (>16ms = 1 frame at 60fps)
 */
export const useRenderPerformance = (componentName: string, threshold = 16) => {
  const renderStartTime = useRef<number>(performance.now());
  
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    if (renderTime > threshold) {
      console.warn(
        `[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`,
        {
          threshold,
          exceedBy: renderTime - threshold,
          fps: Math.round(1000 / renderTime)
        }
      );
    }
    
    // Update start time for next render
    renderStartTime.current = performance.now();
  });
  
  return {
    measureBlock: (blockName: string, fn: () => void) => {
      const start = performance.now();
      fn();
      const duration = performance.now() - start;
      
      if (duration > threshold) {
        console.warn(
          `[Performance] ${componentName}.${blockName} slow: ${duration.toFixed(2)}ms`
        );
      }
      
      return duration;
    }
  };
};

/**
 * Hook to track scroll performance
 */
export const useScrollPerformance = (scrollContainerRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    let lastScrollTime = 0;
    let frameCount = 0;
    let lastFpsUpdate = 0;
    
    const handleScroll = () => {
      const now = performance.now();
      const delta = now - lastScrollTime;
      
      if (delta > 0) {
        frameCount++;
        
        // Update FPS every second
        if (now - lastFpsUpdate > 1000) {
          const fps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
          
          if (fps < 30) {
            console.warn(`[Performance] Low scroll FPS: ${fps}`);
          }
          
          frameCount = 0;
          lastFpsUpdate = now;
        }
      }
      
      lastScrollTime = now;
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);
};