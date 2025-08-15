#!/bin/bash

# Create missing component and hook stubs for webapp migration

echo "🔧 Creating missing component and hook stubs..."

# Create directories
mkdir -p app/components/chat-interface
mkdir -p app/hooks
mkdir -p app/stores
mkdir -p app/debug

# ChatMessageList component
if [ ! -f "app/components/chat-interface/ChatMessageList.tsx" ]; then
cat > app/components/chat-interface/ChatMessageList.tsx << 'EOF'
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
EOF
echo "✅ Created ChatMessageList.tsx"
fi

# DebugOverlay component
if [ ! -f "app/components/chat-interface/DebugOverlay.tsx" ]; then
cat > app/components/chat-interface/DebugOverlay.tsx << 'EOF'
import React from 'react';

interface DebugOverlayProps {
  isVisible?: boolean;
  debugInfo?: any;
  className?: string;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ isVisible = false, debugInfo, className = '' }) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono max-w-sm ${className}`}>
      <div className="font-bold mb-2">Debug Info (Webapp Stub)</div>
      <pre className="whitespace-pre-wrap">
        {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'No debug info available'}
      </pre>
    </div>
  );
};

export default DebugOverlay;
EOF
echo "✅ Created DebugOverlay.tsx"
fi

# MessageTestControls component
if [ ! -f "app/components/chat-interface/MessageTestControls.tsx" ]; then
cat > app/components/chat-interface/MessageTestControls.tsx << 'EOF'
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
EOF
echo "✅ Created MessageTestControls.tsx"
fi

# chatStore stub
if [ ! -f "app/stores/chatStore.ts" ]; then
cat > app/stores/chatStore.ts << 'EOF'
/**
 * Chat Store - Webapp Stub Implementation
 */

import { create } from 'zustand';

interface ChatState {
  messages: any[];
  isLoading: boolean;
  error: string | null;
  addMessage: (message: any) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
EOF
echo "✅ Created chatStore.ts"
fi

# useOptimizedChatStore hook
if [ ! -f "app/hooks/useOptimizedChatStore.ts" ]; then
cat > app/hooks/useOptimizedChatStore.ts << 'EOF'
/**
 * useOptimizedChatStore Hook - Webapp Stub Implementation
 */

import { useChatStore } from '@/stores/chatStore';

export function useOptimizedChatStore() {
  const store = useChatStore();
  
  console.log('🚀 [useOptimizedChatStore] STUB: Would provide optimized chat store access');
  
  return {
    ...store,
    isOptimized: true,
  };
}
EOF
echo "✅ Created useOptimizedChatStore.ts"
fi

echo "🎉 Finished creating missing stubs!"