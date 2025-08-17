/**
 * ChatContainer - Main layout wrapper for the chat interface
 * Extracted from ChatMainCanonicalLegacy to improve maintainability
 */

import React from 'react';
import { ChatDebugOverlay } from './ChatDebugOverlay';

interface ChatContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  children, 
  className = "flex-1 flex flex-col max-h-screen overflow-hidden relative bg-black" 
}) => {
  return (
    <div className={className}>
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none" />
      
      {/* Debug size overlay */}
      <ChatDebugOverlay />
      
      {/* Main content */}
      {children}
    </div>
  );
};