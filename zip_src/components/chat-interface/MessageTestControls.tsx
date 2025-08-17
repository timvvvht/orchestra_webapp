import React from 'react';
import { useChatStore } from '@/stores/chatStore';

interface MessageTestControlsProps {
  sessionId?: string;
}

export const MessageTestControls: React.FC<MessageTestControlsProps> = ({ sessionId }) => {
  const { isDebugMode, sendMessage } = useChatStore();

  if (!isDebugMode || !sessionId) {
    return null;
  }

  const addTestMessage = async () => {
    const testMessages = [
      "This is a test message to trigger scrolling behavior.",
      "Another test message to see how the layout responds.",
      "Let's add more content to see if the input area gets pushed down.",
      "This is a longer test message that contains more text to see how the layout behaves when we have messages of varying lengths.",
      "Short message.",
      "This is an even longer test message that should definitely cause some scrolling behavior and help us understand what's happening with the layout when the ScrollArea needs to handle overflow content.",
    ];
    
    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    
    try {
      await sendMessage(randomMessage);
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
  };

  const addMultipleMessages = async () => {
    for (let i = 0; i < 5; i++) {
      await addTestMessage();
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <div className="fixed bottom-20 left-4 bg-black/90 border border-white/20 rounded-lg p-3 z-50">
      <div className="text-white font-semibold mb-2 text-sm">🧪 Message Test Controls</div>
      <div className="space-y-2">
        <button
          onClick={addTestMessage}
          className="block w-full text-left px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-sm transition-colors"
        >
          Add Test Message
        </button>
        <button
          onClick={addMultipleMessages}
          className="block w-full text-left px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-sm transition-colors"
        >
          Add 5 Messages
        </button>
      </div>
    </div>
  );
};