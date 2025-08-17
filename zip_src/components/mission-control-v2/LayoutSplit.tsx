import React from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import AgentListPanel from './AgentListPanel';
import ChatPane from './ChatPane';

const LayoutSplit: React.FC = () => {
  const { selectedSession } = useMissionControlStore();

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Left Panel - Agent List */}
      <div
        data-testid="mc-left-wrapper"
        className={`
          transition-[width] duration-300 
          ${selectedSession ? 'w-[480px]' : 'w-full'} 
          relative h-full min-h-0 min-w-0 overflow-y-auto isolate
        `}
      >
        <AgentListPanel />
      </div>

      {/* Right Panel - Chat View - Only render when session is selected */}
      {selectedSession && (
        <div className="
          flex-1 h-full min-h-0 
          bg-black/95 backdrop-blur-2xl
          border-l border-white/10
          flex flex-col
          overflow-hidden
        ">
          <ChatPane />
        </div>
      )}
    </div>
  );
};

export default LayoutSplit;