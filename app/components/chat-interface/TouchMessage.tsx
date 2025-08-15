/**
 * TouchMessage Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the touch message component for webapp migration.
 * Provides the basic interface for touch-optimized message display.
 * 
 * TODO: Implement full touch message functionality when needed
 */

import React from 'react';

interface TouchMessageProps {
  message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
  };
  onLongPress?: (messageId: string) => void;
  className?: string;
}

const TouchMessage: React.FC<TouchMessageProps> = ({ 
  message,
  onLongPress,
  className = ''
}) => {
  const handleTouchStart = () => {
    // Simple touch handling - could be enhanced with proper long press detection
    if (onLongPress) {
      setTimeout(() => {
        onLongPress(message.id);
      }, 500);
    }
  };

  const isUser = message.role === 'user';

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${className}`}
      onTouchStart={handleTouchStart}
    >
      <div 
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className={`text-xs mt-1 ${
          isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default TouchMessage;