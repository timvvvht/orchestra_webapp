import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBreakpoint } from '@/hooks/useBreakpoint'; 
import ChatSidebar from './ChatSidebar';
import ChatMainCanonical from './ChatMainCanonical';
import ChatTest from './ChatTest';
import HooksTestSimple from './HooksTestSimple';
import BlankScreenDebug from './BlankScreenDebug';
import ChatMain from './ChatMain';
import ChatMainLegacy from './ChatMainLegacy';
import ChatDebugSimple from './ChatDebugSimple';
import ChatMainCanonicalLite from './ChatMainCanonicalLite';
import ChatMainCanonicalUltraLite from './ChatMainCanonicalUltraLite';
import ChatMainCanonicalWithUI from './ChatMainCanonicalWithUI';
import ChatMainCanonicalFixed from './ChatMainCanonicalFixed';
import ChatMainCanonicalLegacy from './ChatMainCanonicalLegacy';
import SwitchTest from './SwitchTest';
import ChatMainMinimal from './ChatMainMinimal';
import IsolationTestRunner from './IsolationTestRunner';
import StoreTestRunner from './StoreTestRunner';
import ChatMainWithBoundaries from './ChatMainWithBoundaries';

const ChatLayout: React.FC = () => {
  console.log('🔍 [ChatLayout] Component rendering');
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>(); 
  const isDesktop = useBreakpoint(); // ≥ 768px
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Increased default width
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);
  // Removed coding mode state - now handled in ChatMain/ChatHeader




  const activeAgentId = urlSessionId || null;

  // Chat session switcher hook

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDesktop) return; // Only allow drag on desktop
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    initialWidthRef.current = sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    const newWidth = initialWidthRef.current + deltaX;
    // Set minimum and maximum widths
    const minWidth = 200;
    const maxWidth = 500; 
    setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.userSelect = 'auto';
    document.body.style.cursor = 'auto';
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex h-full w-full max-h-full max-w-full overflow-hidden bg-black rounded-tl-2xl">
      <div 
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px`, flex: `0 0 ${sidebarWidth}px` }}
        className={`flex flex-col relative h-full overflow-hidden transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      >
          {/* Glass morphism sidebar with Apple-style blur */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-white/[0.01] backdrop-blur-2xl" />
          <div className="absolute inset-0 bg-black/40" />
          
          <ChatSidebar
            selectedAgentId={activeAgentId} 
            collapsed={sidebarCollapsed}
            onToggleCollapse={setSidebarCollapsed}
          />
          
          {/* Refined resize handle - only show on desktop */}
          {isDesktop && (
            <div 
              onMouseDown={handleMouseDown}
              className="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize group"
            >
              <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-white/10 transition-colors duration-200" />
              <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 h-full max-h-full overflow-hidden">
          <ChatMainCanonicalLegacy 
            sidebarCollapsed={sidebarCollapsed}
          />
          {/* <IsolationTestRunner /> */}
          {/* <StoreTestRunner /> */}
          {/* <ChatMainMinimal /> */}
          
        </div>

    </div>
  );
};

export default ChatLayout;