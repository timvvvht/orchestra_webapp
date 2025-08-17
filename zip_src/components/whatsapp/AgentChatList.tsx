import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatListItem from './ChatListItem';
import { mockAgents } from '@/data/mockWhatsappData';

interface AgentChatListProps {
  onSelectAgent: (id: string) => void;
  selectedAgentId: string | null;
}

const AgentChatList: React.FC<AgentChatListProps> = ({ onSelectAgent, selectedAgentId }) => {
  return (
    <>
      <div className="p-4 bg-surface-alt">
        <div className="relative">
          <Input 
            placeholder="Search agents" 
            className="pl-10 bg-white/5 border-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {mockAgents.map((agent) => (
            <ChatListItem
              key={agent.id}
              agent={agent}
              selected={agent.id === selectedAgentId}
              onClick={() => onSelectAgent(agent.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  );
};

export default AgentChatList;
