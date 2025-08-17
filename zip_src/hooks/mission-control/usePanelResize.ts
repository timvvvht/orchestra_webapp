import { useRef, useCallback, useState } from 'react';

interface PanelResizeConfig {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Hook for managing panel resize functionality with mouse drag interactions.
 * Handles resize state, constraints (min/max width), and mouse event listeners.
 * 
 * @param config - Configuration object with width constraints
 * @returns Object with refs, current width, resize state, and event handlers
 */
export const usePanelResize = (config: PanelResizeConfig = {}) => {
  const { initialWidth = 400, minWidth = 300, maxWidth = 800 } = config;
  
  const [panelWidth, setPanelWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(initialWidth);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
    
    // Panel resize refs & handlers logic will be moved here
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startXRef.current;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX));
    setPanelWidth(newWidth);
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  return {
    panelRef,
    resizerRef,
    panelWidth,
    isResizing,
    handleMouseDown,
  };
};