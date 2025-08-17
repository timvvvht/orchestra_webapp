import React from 'react';
import { useSessionStatusStore } from '@/stores/sessionStatusStore';
import { useMessagesStore } from '@/store/messagesStore';
import { useParams } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function useAssistantState(sessionId: string | undefined) {
  const sessionStatus = useSessionStatusStore(s => sessionId ? s.getStatus(sessionId) : 'idle');
  const lastMsg = useMessagesStore(s => s.messages.at(-1)); // safe even if store not yet populated
  const hasStreamingMessage = useMessagesStore(s => s.hasStreamingMessage);

  if (!sessionId) {
    return { 
      label: 'no-session', 
      color: 'bg-slate-700', 
      tooltip: 'No session ID available' 
    };
  }

  const timestamp = new Date().toLocaleTimeString();
  const msgInfo = lastMsg ? `role: ${lastMsg.role}, streaming: ${!!lastMsg.isStreaming}, thinking: ${!!lastMsg.thinking}` : 'no messages';

  // Use the simplified two-state system
  if (sessionStatus === 'idle') {
    return { 
      label: 'Idle', 
      color: 'bg-emerald-600', 
      tooltip: `Session idle (${timestamp})\nstatus: ${sessionStatus}\nLast msg: ${msgInfo}` 
    };
  }
  
  // sessionStatus === 'awaiting' - but we can still show more granular states based on message content
  if (lastMsg?.isStreaming || hasStreamingMessage) {
    return { 
      label: 'Streaming', 
      color: 'bg-blue-600', 
      tooltip: `Assistant streaming (${timestamp})\nstatus: ${sessionStatus}\nhasStreamingMessage: ${hasStreamingMessage}\nLast msg: ${msgInfo}` 
    };
  }
  
  if (lastMsg?.thinking) {
    return { 
      label: 'Thinking', 
      color: 'bg-amber-500', 
      tooltip: `Assistant thinking (${timestamp})\nstatus: ${sessionStatus}\nthinking: true\nLast msg: ${msgInfo}` 
    };
  }
  
  // Default awaiting state
  return { 
    label: 'Awaiting reply', 
    color: 'bg-gray-500', 
    tooltip: `Waiting for assistant (${timestamp})\nstatus: ${sessionStatus}\nLast msg: ${msgInfo}` 
  };
}

const DebugAgentStateChip: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const state = useAssistantState(sessionId);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`px-2 py-0.5 rounded-full text-xs text-white/90
                           ${state.color} cursor-default select-none`}>
            {state.label}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <pre className="text-xs whitespace-pre-wrap">{state.tooltip}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DebugAgentStateChip;