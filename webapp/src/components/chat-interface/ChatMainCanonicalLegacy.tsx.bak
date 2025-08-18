/**
 * ChatMainCanonicalLegacy Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the legacy canonical chat main component.
 * Provides the basic interface for backward compatibility.
 * 
 * TODO: Implement full legacy chat functionality when needed
 */

import React from 'react';

interface ChatMainCanonicalLegacyProps {
  sessionId?: string;
  className?: string;
}

const ChatMainCanonicalLegacy: React.FC<ChatMainCanonicalLegacyProps> = ({ 
  sessionId,
  className = ''
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📜</span>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Legacy Chat Interface
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This is a stub implementation of the legacy canonical chat interface.
          </p>
          
          {sessionId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              Session: {sessionId.slice(0, 8)}...
            </p>
          )}
          
          <div className="mt-6 text-xs text-gray-400 italic">
            Legacy chat functionality is not implemented in webapp mode
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMainCanonicalLegacy;