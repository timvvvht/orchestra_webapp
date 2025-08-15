/**
 * ChatEmptyState Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the chat empty state for webapp migration.
 * Provides the basic interface for when no messages are present.
 * 
 * TODO: Implement full chat empty state functionality when needed
 */

import React from 'react';

interface ChatEmptyStateProps {
  onStartChat?: () => void;
  agentName?: string;
  className?: string;
}

const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ 
  onStartChat,
  agentName = 'Assistant',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full text-center p-8 ${className}`}>
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">💬</span>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Start a conversation with {agentName}
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        Ask questions, get help with tasks, or just have a conversation. 
        I'm here to assist you!
      </p>
      
      <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
        <p>💡 Try asking about:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Code help and debugging</li>
          <li>Writing and editing</li>
          <li>Analysis and research</li>
          <li>General questions</li>
        </ul>
      </div>
      
      {onStartChat && (
        <button
          onClick={onStartChat}
          className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Start Chatting
        </button>
      )}
      
      <div className="mt-4 text-xs text-gray-400 italic">
        Chat functionality is simplified in webapp mode
      </div>
    </div>
  );
};

export default ChatEmptyState;