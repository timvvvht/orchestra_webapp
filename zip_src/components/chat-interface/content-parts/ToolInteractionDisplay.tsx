import React from 'react';
import { ToolUsePart, ToolResultPart } from '@/types/chatTypes';
import MainToolInteractionDisplay from '../ToolInteractionDisplay';

interface ToolInteractionDisplayProps {
  toolUsePart: ToolUsePart;
  toolResultPart?: ToolResultPart;
  isCurrentlyStreaming?: boolean;
}

// This is a wrapper component that uses the main ToolInteractionDisplay component
// This ensures consistency between the two implementations
const ToolInteractionDisplay: React.FC<ToolInteractionDisplayProps> = ({ 
  toolUsePart, 
  toolResultPart,
  isCurrentlyStreaming = false
}) => {
  // Log the props for debugging
  console.log(`[ToolInteractionDisplay Wrapper] Rendering tool ${toolUsePart.id}:`, {
    toolUsePart,
    toolResultPart,
    hasResult: !!toolResultPart
  });
  
  return (
    <MainToolInteractionDisplay 
      toolUsePart={toolUsePart}
      toolResultPart={toolResultPart}
      isCurrentlyStreaming={isCurrentlyStreaming}
    />
  );
};

export default ToolInteractionDisplay;
