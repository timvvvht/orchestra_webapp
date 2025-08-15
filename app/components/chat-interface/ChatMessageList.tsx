import React from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

interface ChatMessageListProps {
  messages: Message[];
  className?: string;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            message.role === 'user' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}>
            {message.content}
          </div>
        </div>
      ))}
      <div className="text-xs text-gray-400 italic text-center">
        Message list (webapp stub)
      </div>
    </div>
  );
};

export default ChatMessageList;
