import React from 'react';
import { useEnqueueMessage } from '@/hooks/useEnqueueMessage';

interface QueueButtonProps {
  sessionId: string;
  message?: string;
}

/**
 * Simple button to test the queued-send functionality
 * Enqueues a test message that will be sent when the agent goes idle
 */
export const QueueButton: React.FC<QueueButtonProps> = ({ 
  sessionId, 
  message = "This is a queued test message" 
}) => {
  const enqueue = useEnqueueMessage(sessionId);

  const handleClick = () => {
    enqueue(message);
    console.log('📥 [Queue] Enqueued message for session:', sessionId, 'Message:', message);
  };

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
      title="Queue a test message"
    >
      Queue Test Message
    </button>
  );
};