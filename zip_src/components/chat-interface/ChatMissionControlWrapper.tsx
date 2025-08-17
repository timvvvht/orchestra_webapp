/**
 * ChatMissionControlWrapper - Wrapper for ChatMainCanonicalLegacy in Mission Control context
 * 
 * This component ensures proper layout constraints when the chat interface is used
 * within the Mission Control split screen, preventing the input area from being
 * pushed downwards when the message list becomes scrollable.
 */

import React from 'react';
import ChatMainCanonicalLegacy from '@/components/chat-interface/ChatMainCanonicalLegacy';
import './ChatMissionControl.css';

interface ChatMissionControlWrapperProps {
  sessionId: string;
  sidebarCollapsed?: boolean;
}

const ChatMissionControlWrapper: React.FC<ChatMissionControlWrapperProps> = ({
  sessionId,
  sidebarCollapsed = true
}) => {
  return (
    <div className="chat-mission-control-wrapper">
      <ChatMainCanonicalLegacy 
        sessionId={sessionId}
        sidebarCollapsed={sidebarCollapsed}
      />
    </div>
  );
};

export default ChatMissionControlWrapper;