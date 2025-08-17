import React, { useEffect } from 'react';

export const QuickPerformanceMonitor: React.FC = () => {
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 30) {
          console.warn(`🐌 Low FPS detected: ${fps}fps`);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    animationId = requestAnimationFrame(measureFPS);
    
    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        
        if (usedMB > 150) {
          console.warn(`🧠 High memory usage: ${usedMB}MB / ${totalMB}MB`);
        }
      }
    }, 30000); // Every 30 seconds
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`⏱️ Long task detected: ${Math.round(entry.duration)}ms`);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // longtask not supported in all browsers
        console.log('Long task monitoring not supported');
      }
      
      return () => {
        cancelAnimationFrame(animationId);
        clearInterval(memoryInterval);
        observer.disconnect();
      };
    }
    
    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(memoryInterval);
    };
  }, []);
  
  return null;
};

export default QuickPerformanceMonitor;