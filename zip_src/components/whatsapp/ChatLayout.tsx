import React, { useState, useEffect, useRef, useCallback } from 'react';
import CollapsibleChatList from './CollapsibleChatList';
import CurrentChat from './CurrentChat';
import { mockAgents } from '@/data/mockWhatsappData';
import TauriResourceTest from '@/components/TauriResourceTest';

/**
 * Throttle function to limit execution frequency
 * This helps reduce the number of operations during mouse movement
 */
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan = 0;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      lastRan = Date.now();
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    } else {
      if (lastFunc) clearTimeout(lastFunc);
      
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

export const ChatLayout = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(mockAgents[0]?.id || null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280); // Initial width
  const [isDragging, setIsDragging] = useState(false);

  // Refs for DOM elements
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Refs for resize operation that don't need to trigger re-renders
  const startXRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);
  
  // Ref to store the last animation frame ID
  const rafIdRef = useRef<number | null>(null);

  // Enable animations after initial mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Create a throttled mouse move handler with useCallback to maintain reference stability
  const handleMouseMove = useCallback(
    throttle((e: MouseEvent) => {
      if (!isDragging || !sidebarRef.current) return;
      
      // Cancel any existing animation frame to prevent queuing
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      // Use requestAnimationFrame for smoother visual updates
      // This ensures we're synced with the browser's render cycle
      rafIdRef.current = requestAnimationFrame(() => {
        if (!sidebarRef.current) return;
        
        // Calculate new width based on cursor position
        const deltaX = e.clientX - startXRef.current;
        const newWidth = initialWidthRef.current + deltaX;
        
        // Set minimum and maximum widths
        const minWidth = 200;
        const maxWidth = 500;
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        // Apply the width using direct style updates for better performance
        sidebarRef.current.style.width = `${clampedWidth}px`;
        sidebarRef.current.style.flex = `0 0 ${clampedWidth}px`;
        
        // If we have a main container, adjust its margin to avoid layout shift
        if (mainContainerRef.current) {
          mainContainerRef.current.style.marginLeft = '8px'; // Ensure consistent spacing
        }
        
        rafIdRef.current = null;
      });
    }, 8), // Throttle to ~120fps (8ms) - fast enough to feel responsive but reduces load
    [isDragging] // Only recreate when isDragging changes
  );

  // Handle mouse up event (end of dragging)
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    // Cancel any pending animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Capture the final width before changing state
    let finalWidth = initialWidthRef.current;
    
    if (sidebarRef.current) {
      // Get the current width from the DOM
      const widthStr = sidebarRef.current.style.width;
      if (widthStr) {
        finalWidth = parseInt(widthStr, 10) || finalWidth;
      }
      
      // Restore transitions
      sidebarRef.current.style.transition = '';
    }
    
    if (mainContainerRef.current) {
      mainContainerRef.current.style.transition = '';
    }
    
    // Reset global styles
    document.body.style.userSelect = 'auto';
    document.body.style.cursor = 'auto';
    
    // Remove active state from resize handle
    if (resizeHandleRef.current) {
      resizeHandleRef.current.classList.remove('active');
    }
    
    // Update state after all DOM operations
    setSidebarWidth(finalWidth);
    setIsDragging(false);
  }, [isDragging]);

  // Handle mouse down event (start of dragging)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    // Cache the initial values before setting state to avoid any lag
    startXRef.current = e.clientX;
    initialWidthRef.current = sidebarWidth;
    
    // Prepare elements for dragging before state update
    if (sidebarRef.current) {
      // Remove transition for immediate response
      sidebarRef.current.style.transition = 'none';
      // Ensure the width is explicitly set before dragging starts
      sidebarRef.current.style.width = `${sidebarWidth}px`;
      sidebarRef.current.style.flex = `0 0 ${sidebarWidth}px`;
    }
    
    if (mainContainerRef.current) {
      mainContainerRef.current.style.transition = 'none';
    }
    
    // Apply global styles for dragging
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    // Add active state to resize handle
    if (resizeHandleRef.current) {
      resizeHandleRef.current.classList.add('active');
    }
    
    // Set dragging state last to trigger the effect that adds event listeners
    setIsDragging(true);
  };

  // Add and remove event listeners based on dragging state
  useEffect(() => {
    // Only add event listeners when dragging starts
    if (isDragging) {
      // Use passive: true for better performance on supporting browsers
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      
      // Add a mouseleave handler to handle cases where mouse leaves the window
      window.addEventListener('mouseleave', handleMouseUp);
    }
    
    return () => {
      // Clean up all event listeners when component unmounts or dragging stops
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      
      // Cancel any pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
  };

  const handleCollapseToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0B0914] to-[#131420] overflow-hidden transition-all duration-500 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none" />
      {/* Background effects */}
      <div className="absolute bottom-0 left-0 w-full h-[70vh] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#dc7bdb]/25 via-[#6754e0]/20 to-transparent" 
          style={{ 
            maskImage: 'radial-gradient(ellipse at center, black 0%, black 25%, transparent 70%)', 
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, black 25%, transparent 70%)' 
          }} 
        />
      </div>
      <div className="absolute bottom-[-10vh] left-1/2 w-[50vw] h-[50vh] -translate-x-1/2 bg-[#35ba68]/20 blur-[140px] rounded-full animate-pulse pointer-events-none" 
        style={{animationDuration: '15s'}} />
      <div className="absolute bottom-[-5vh] left-1/2 w-[45vw] h-[55vh] -translate-x-1/2 bg-[#2e9cdd]/20 blur-[130px] rounded-full animate-pulse pointer-events-none" 
        style={{animationDuration: '20s', animationDelay: '2s'}} />
      
      {/* Resource Test Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 relative z-10">
          <TauriResourceTest />
        </div>
      )}
      
      {/* Main chat container */}
      <div className="flex flex-1 mx-4 my-4 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(103,84,224,0.15)] relative z-10 backdrop-blur-md border border-white/5" 
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
        }}>
        <div 
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px`, flex: `0 0 ${sidebarWidth}px` }}
          className={`flex flex-col relative h-full overflow-hidden backdrop-blur-md bg-gradient-to-br from-background/90 to-background/80 rounded-xl ${!isDragging ? 'transition-all duration-200' : ''}`}
        >
          <CollapsibleChatList 
            onSelectAgent={handleSelectAgent} 
            selectedAgentId={selectedAgentId}
            onCollapseToggle={handleCollapseToggle}
          />
          <div 
            ref={resizeHandleRef}
            onMouseDown={handleMouseDown}
            className="absolute top-0 bottom-0 right-0 w-5 cursor-col-resize hover:bg-white/20 group transition-colors duration-150 z-10"
          >
            {/* Visual indicator for resize handle */}
            <div className="absolute top-0 bottom-0 right-0 w-[3px] bg-white/10 group-hover:bg-white/30 group-[.active]:bg-primary/50 transition-colors duration-150"></div>
            
            {/* Additional visual feedback when dragging - no animation for better performance */}
            {isDragging && (
              <div className="absolute top-0 bottom-0 right-0 w-[3px] bg-primary"></div>
            )}
          </div>
        </div>
        <div 
          ref={mainContainerRef}
          className={`flex flex-1 h-full overflow-hidden backdrop-blur-md bg-gradient-to-br from-background/90 to-background/80 rounded-xl ml-2 ${!isDragging ? 'transition-all duration-200' : ''}`}
        >
          <CurrentChat 
            agentId={selectedAgentId} 
            isLeftPanelCollapsed={isCollapsed}
          />
        </div>
      </div>
    </div>
  );
};
