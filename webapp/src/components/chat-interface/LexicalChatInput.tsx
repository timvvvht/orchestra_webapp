/**
 * LexicalChatInput Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the Lexical chat input for webapp migration.
 * Provides the basic interface without complex Lexical editor functionality.
 * 
 * TODO: Implement full Lexical chat input functionality when needed
 */

import React, { useState } from 'react';
import './LexicalChatInput.css';

interface LexicalChatInputProps {
  onSendMessage?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const LexicalChatInput: React.FC<LexicalChatInputProps> = ({ 
  onSendMessage,
  placeholder = "Type your message...",
  disabled = false,
  className = ''
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg ${className}`}>
      <form onSubmit={handleSubmit} className="flex">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 p-3 bg-transparent resize-none focus:outline-none min-h-[60px] max-h-32"
          rows={2}
        />
        <div className="flex items-end p-2">
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
      
      <div className="px-3 pb-2 text-xs text-gray-500 italic">
        Lexical editor functionality is simplified in webapp mode
      </div>
    </div>
  );
};

export default LexicalChatInput;