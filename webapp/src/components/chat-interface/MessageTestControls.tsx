import React from 'react';

interface MessageTestControlsProps {
  onSendTestMessage?: (message: string) => void;
  className?: string;
}

const MessageTestControls: React.FC<MessageTestControlsProps> = ({ onSendTestMessage, className = '' }) => {
  const testMessages = [
    'Hello, how are you?',
    'What can you help me with?',
    'Tell me a joke',
  ];

  return (
    <div className={`p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg ${className}`}>
      <div className="text-sm font-medium mb-2">Test Controls (Webapp Stub)</div>
      <div className="space-y-2">
        {testMessages.map((message, index) => (
          <button
            key={index}
            onClick={() => onSendTestMessage?.(message)}
            className="block w-full text-left px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {message}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MessageTestControls;
