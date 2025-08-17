// LIKELY DEPRECATED


import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Bot, User } from 'lucide-react';
import { ChatMessage, RichContentPart, TextPart, ToolUsePart, ToolResultPart } from './types';
import ToolChip from './ToolChip';
import MessageDrawer from './MessageDrawer';
import TextPartDisplay from '../chat-interface/content-parts/TextPartDisplay';
import ToolUsePartDisplay from '../chat-interface/content-parts/ToolUsePartDisplay';
import ToolResultPartDisplay from '../chat-interface/content-parts/ToolResultPartDisplay';

interface MessageBubbleProps {
  message: ChatMessage;
  isLastMessage: boolean;
  variant?: 'default' | 'compact';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isLastMessage,
  variant = 'default' 
}) => {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const isUser = message.role === 'user';

  const toggleDetails = () => setDetailsOpen(prev => !prev);
  
  // Extract tool-related parts from the content array for new format messages
  const toolUseParts: ToolUsePart[] = Array.isArray(message.content)
    ? message.content.filter(part => part.type === 'tool_use') as ToolUsePart[]
    : [];
  
  // Prepare content for rendering, handling both new and old formats
  const contentToRender: RichContentPart[] = [];
  
  if (Array.isArray(message.content)) {
    // New format - content is already an array of RichContentPart
    contentToRender.push(...message.content);
  } else if (typeof message.content === 'string') {
    // Old format - convert string content to TextPart
    contentToRender.push({ type: 'text', text: message.content });
    
    // Add legacy toolCall if present
    if (message.toolCall) {
      contentToRender.push({
        type: 'tool_use',
        id: message.toolCall.id,
        name: message.toolCall.name,
        input: message.toolCall.arguments
      });
    }
  }

  // Default bubble style
  const bubbleClasses = cn(
    'relative transition-all duration-150',
    variant === 'default' ? 'max-w-[75%] px-4 py-3 text-16' : 'max-w-[85%] px-3 py-2 text-14',
    'rounded-lg',
    isUser 
      ? 'ml-auto bg-brand-500 text-white' 
      : 'mr-auto surface-1 text-foreground'
  );

  // Tail for the message bubble
  const tailClasses = cn(
    'absolute bottom-1 w-4 h-4 overflow-hidden',
    isUser ? '-right-1.5' : '-left-1.5'
  );

  const tailInnerClasses = cn(
    'absolute transform rotate-45 w-2 h-2',
    isUser 
      ? 'bg-brand-500 -left-1 bottom-0' 
      : 'bg-surface-1 -right-1 bottom-0'
  );

  const hasDetails = message.reasoning?.length || toolUseParts.length > 0 || message.toolCall;

  // Avatar styles
  const avatarClasses = cn(
    'flex items-center justify-center',
    variant === 'default' ? 'w-8 h-8' : 'w-6 h-6',
    'rounded-full',
    isUser 
      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200' 
      : 'bg-blue-50 dark:bg-brand-900/30 text-blue-600 dark:text-brand-400',
    variant === 'default' ? (isUser ? 'ml-2' : 'mr-2') : (isUser ? 'ml-1' : 'mr-1'),
    'self-end'
  );

  // Thinking animation
  const thinkingAnimation = (
    <div className="flex gap-1 mb-2">
      <span className="inline-block animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700 h-1.5 w-1.5" />
      <span className="inline-block animate-pulse delay-150 rounded-full bg-neutral-200 dark:bg-neutral-700 h-1.5 w-1.5" />
      <span className="inline-block animate-pulse delay-300 rounded-full bg-neutral-200 dark:bg-neutral-700 h-1.5 w-1.5" />
    </div>
  );

  return (
    <div className={`flex flex-col gap-1 ${isLastMessage && message.thinking ? 'animate-pulse opacity-80' : ''}`}>
      <div className="flex">
        {!isUser && (
          <div className={avatarClasses}>
            <Bot className={variant === 'default' ? 'w-4 h-4' : 'w-3 h-3'} strokeWidth={2} />
          </div>
        )}
        <div className={bubbleClasses}>
          {message.thinking && thinkingAnimation}
          
          {/* Render content parts based on their type */}
          {contentToRender.map((part, index) => {
            switch (part.type) {
              case 'text':
                return <TextPartDisplay key={`text-${index}`} part={part as TextPart} />;
              case 'tool_use':
                return (
                  <div key={`tool-use-${index}`} className="mt-2">
                    <ToolUsePartDisplay part={part as ToolUsePart} />
                  </div>
                );
              case 'tool_result':
                return (
                  <div key={`tool-result-${index}`} className="mt-2">
                    <ToolResultPartDisplay part={part as ToolResultPart} />
                  </div>
                );
              default:
                return null;
            }
          })}
          
          {/* Legacy rendering for backward compatibility */}
          {!Array.isArray(message.content) && message.toolCall && (
            <div className="mt-2">
              <ToolChip call={message.toolCall} />
            </div>
          )}
          
          {variant === 'default' && (
            <div className={tailClasses}>
              <div className={tailInnerClasses} />
            </div>
          )}
          
          <div className={cn(
            "text-12 mt-1 text-right",
            isUser ? "text-white/70" : "text-neutral-500 dark:text-neutral-400"
          )}>
            {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </div>
        </div>
        {isUser && (
          <div className={avatarClasses}>
            <User className={variant === 'default' ? 'w-4 h-4' : 'w-3 h-3'} strokeWidth={2} />
          </div>
        )}
      </div>
      
      {hasDetails && (
        <div className={`flex items-center mt-1 ${isUser ? 'mr-10 justify-end' : 'ml-10'}`}>
          <button 
            onClick={toggleDetails}
            className="flex items-center gap-1 text-12 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            {detailsOpen ? 'Hide details' : 'Show details'}
            <ChevronDown 
              className={cn('h-3 w-3 transition-transform', 
                detailsOpen ? 'rotate-180' : ''
              )} 
            />
          </button>
        </div>
      )}
      
      {detailsOpen && <MessageDrawer message={message} />}
    </div>
  );
};

export default MessageBubble;
