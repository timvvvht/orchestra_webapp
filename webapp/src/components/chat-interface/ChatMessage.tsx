// webapp/src/components/chat-interface/ChatMessage.tsx
import React from 'react';
import type { ChatMessage as ChatMessageType, TextPart } from '@/types/chatTypes';
import OptimizedTextPartDisplay from './content-parts/OptimizedTextPartDisplay';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastMessage: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onFork?: () => void; // Ignored in minimal version
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLastMessage,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = true,
  showTimestamp = true,
}) => {
  const isUser = message.role === 'user' || message.role === 'User';

  // Collect text parts for rendering
  const textParts: TextPart[] = [];
  if (Array.isArray(message.content)) {
    message.content
      .filter((p): p is TextPart => p && p.type === 'text')
      .forEach((p) => {
        if (p.text && p.text.trim()) textParts.push(p);
      });
  } else if (typeof (message as any).content === 'string') {
    const s = (message as any).content as string;
    if (s.trim()) textParts.push({ type: 'text', text: s });
  }

  if (textParts.length === 0 && !message.thinking) {
    return null;
  }

  const bubbleBase = 'relative inline-block max-w-[85%] break-words rounded-2xl px-4 py-2';
  const bubbleClasses = isUser
    ? `${bubbleBase} bg-blue-600 text-white`
    : `${bubbleBase} bg-white/5 text-white border border-white/10 backdrop-blur`;

  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && showAvatar && isFirstInGroup ? (
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 mr-3 mt-1" />
      ) : !isUser ? (
        <div className="w-8 mr-3" />
      ) : null}

      <div className="flex-1 min-w-0">
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`chat-message ${bubbleClasses}`}>
            {textParts.length > 0 && (
              <div className="space-y-3">
                {textParts.map((part, i) => (
                  <OptimizedTextPartDisplay key={i} part={part} />
                ))}
              </div>
            )}
            {message.thinking && textParts.length === 0 && (
              <div className="text-xs opacity-70">Thinking…</div>
            )}
            {showTimestamp && isLastInGroup && (
              <div className={`text-[10px] mt-1 ${isUser ? 'text-white/70 text-right' : 'text-white/50'}`}>
                {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {isUser && showAvatar && isFirstInGroup ? (
        <div className="w-8 h-8 rounded-full bg-blue-600 ml-3 mt-1" />
      ) : isUser ? (
        <div className="w-8 ml-3" />
      ) : null}
    </div>
  );
};

export default React.memo(ChatMessage);