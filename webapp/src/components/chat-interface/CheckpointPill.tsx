// webapp/src/components/chat-interface/CheckpointPill.tsx
import React from 'react';
import type { ChatMessage } from '@/types/chatTypes';

export default function CheckpointPill({ message }: { message: ChatMessage }) {
  const title = (message.meta && (message.meta.title || message.meta.name)) || 'Checkpoint';
  return (
    <div className="px-3 py-1 rounded-full border border-white/15 bg-white/5 text-white/80 text-xs">
      {title}
    </div>
  );
}