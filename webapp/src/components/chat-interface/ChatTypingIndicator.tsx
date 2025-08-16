/**
 * ChatTypingIndicator Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the chat typing indicator for webapp migration.
 * Provides the basic interface for showing when the assistant is typing.
 * 
 * TODO: Implement full chat typing indicator functionality when needed
 */

import React from 'react';

interface ChatTypingIndicatorProps {
  isVisible?: boolean;
  agentName?: string;
  className?: string;
}

const ChatTypingIndicator: React.FC<ChatTypingIndicatorProps> = ({ 
  isVisible = false,
  agentName = 'Assistant',
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <div className={`flex items-center space-x-3 p-4 ${className}`}>
      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
        <span className="text-sm">🤖</span>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {agentName} is typing
          </span>
          <div className="flex space-x-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="text-xs text-gray-400 italic mt-1">
          Typing indicator (webapp mode)
        </div>
      </div>
    </div>
  );
};

export default ChatTypingIndicator;