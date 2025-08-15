/**
 * ChatHeader Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the chat header for webapp migration.
 * Provides the basic interface without complex functionality.
 * 
 * TODO: Implement full chat header functionality when needed
 */

import React from 'react';

interface ChatHeaderProps {
  // Add props as needed based on usage
  sessionId?: string;
  agentName?: string;
  onSettingsClick?: () => void;
  className?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  sessionId, 
  agentName = 'Assistant',
  onSettingsClick,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {agentName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {agentName}
          </h2>
          {sessionId && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {sessionId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Settings"
          >
            ⚙️
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;