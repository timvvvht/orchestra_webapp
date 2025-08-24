// webapp/src/components/chat-interface/TouchMessage.tsx
import React from 'react';

interface TouchMessageProps {
  children: React.ReactNode;
  onReply?: () => void;
  onCopy?: () => void;
  className?: string;
}

const TouchMessage: React.FC<TouchMessageProps> = ({ children, onReply, onCopy, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {/* Simple touch-friendly action row (no swipe yet) */}
      <div className="absolute right-1 top-1 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
        {onReply && (
          <button onClick={onReply} className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-300">Reply</button>
        )}
        {onCopy && (
          <button onClick={onCopy} className="px-2 py-1 text-xs rounded bg-white/10 text-white/70">Copy</button>
        )}
      </div>
      {children}
    </div>
  );
};

export default TouchMessage;