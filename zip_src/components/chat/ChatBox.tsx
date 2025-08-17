
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './types';
import MessageBubble from './MessageBubble';

export interface ChatBoxProps {
  messages: ChatMessage[];
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      const element = scrollRef.current;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    };
    
    // Add a small delay to ensure content is rendered
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  const getTimeString = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 relative overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex flex-col space-y-6 p-6">
          {messages.map((message, i) => (
            <React.Fragment key={message.id}>
              {(i === 0 || message.createdAt - messages[i-1].createdAt > 600000) && (
                <div className="flex justify-center my-3">
                  <div className="rounded-full bg-white/5 px-2 py-1 text-xs text-text-muted">
                    {getTimeString(message.createdAt)}
                  </div>
                </div>
              )}
              <MessageBubble
                message={message}
                isLastMessage={i === messages.length - 1}
              />
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatBox;
