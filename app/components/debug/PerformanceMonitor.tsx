import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RenderInfo {
  component: string;
  timestamp: number;
  renderCount: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
  showOverlay?: boolean;
}

// Global render tracking
const renderTracker = new Map<string, RenderInfo>();
const renderListeners = new Set<(renders: Map<string, RenderInfo>) => void>();

const addRenderListener = (listener: (renders: Map<string, RenderInfo>) => void) => {
  renderListeners.add(listener);
  return () => renderListeners.delete(listener);
};

const trackRender = (componentName: string) => {
  const existing = renderTracker.get(componentName);
  const now = Date.now();
  
  renderTracker.set(componentName, {
    component: componentName,
    timestamp: now,
    renderCount: existing ? existing.renderCount + 1 : 1
  });
  
  // Notify listeners
  renderListeners.forEach(listener => listener(new Map(renderTracker)));
};

/**
 * PerformanceMonitor - Tracks component re-renders for debugging
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  enabled = process.env.NODE_ENV === 'development',
  showOverlay = false
}) => {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  if (enabled) {
    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    // Track this render
    trackRender(componentName);
    
    // Log excessive re-renders
    if (renderCountRef.current > 10 && timeSinceLastRender < 100) {
      console.warn(`[PerformanceMonitor] ${componentName} rendered ${renderCountRef.current} times. Last render: ${timeSinceLastRender}ms ago`);
    }
  }
  
  if (!showOverlay || !enabled) return null;
  
  return (
    <div className="fixed top-2 right-2 bg-black/80 text-white text-xs p-2 rounded z-50 font-mono">
      {componentName}: {renderCountRef.current} renders
    </div>
  );
};

/**
 * Global Performance Overlay - Shows all component render counts
 */
export const GlobalPerformanceOverlay: React.FC<{ enabled?: boolean }> = ({ 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const [renders, setRenders] = useState<Map<string, RenderInfo>>(new Map());
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const unsubscribe = addRenderListener(setRenders);
    
    // Keyboard shortcut to toggle visibility
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
  
  if (!enabled) return null;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-4 right-4 bg-black/90 backdrop-blur-xl text-white text-xs p-4 rounded-lg z-50 font-mono max-w-sm max-h-96 overflow-auto border border-white/20"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Performance Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/60 hover:text-white"
            >
              ×
            </button>
          </div>
          
          <div className="text-xs text-white/60 mb-3">
            Press Ctrl+Shift+P to toggle
          </div>
          
          <div className="space-y-1">
            {Array.from(renders.values())
              .sort((a, b) => b.renderCount - a.renderCount)
              .map(({ component, renderCount, timestamp }) => {
                const isRecent = Date.now() - timestamp < 1000;
                return (
                  <div
                    key={component}
                    className={`flex justify-between items-center py-1 px-2 rounded ${
                      isRecent ? 'bg-red-500/20 text-red-300' : 'bg-white/5'
                    }`}
                  >
                    <span className="truncate">{component}</span>
                    <span className={`font-bold ${renderCount > 20 ? 'text-red-400' : renderCount > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {renderCount}
                    </span>
                  </div>
                );
              })}
          </div>
          
          {renders.size === 0 && (
            <div className="text-white/40 text-center py-4">
              No renders tracked yet
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Hook to track component renders
 */
export const useRenderTracker = (componentName: string, enabled = process.env.NODE_ENV === 'development') => {
  const renderCount = useRef(0);
  
  if (enabled) {
    renderCount.current += 1;
    trackRender(componentName);
  }
  
  return renderCount.current;
};

/**
 * HOC to wrap components with performance monitoring
 */
export const withPerformanceMonitor = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    useRenderTracker(name);
    
    return <Component {...props} ref={ref} />;
  });
  
  WrappedComponent.displayName = `withPerformanceMonitor(${componentName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default PerformanceMonitor;