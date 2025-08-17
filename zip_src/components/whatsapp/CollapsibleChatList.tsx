import React from 'react';
import { ChevronLeft, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatListItem from './ChatListItem';
import { mockAgents } from '@/data/mockWhatsappData';
import { Button } from '../ui/button';

interface CollapsibleChatListProps {
  onSelectAgent: (id: string) => void;
  selectedAgentId: string | null;
  onCollapseToggle?: (isCollapsed: boolean) => void;
}

const CollapsibleChatList: React.FC<CollapsibleChatListProps> = ({ 
  onSelectAgent, 
  selectedAgentId, 
  onCollapseToggle 
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseToggle?.(newCollapsedState);
  };

  const filteredAgents = mockAgents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-300 h-full overflow-hidden bg-background border-r border-border",
        isCollapsed ? "w-[80px] min-w-[80px] max-w-[80px]" : "w-[350px] min-w-[350px] max-w-[350px]"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!isCollapsed && (
          <div className="relative flex-1">
            <Input 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-full bg-surface-1 border-none text-foreground placeholder:text-muted-foreground focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring/30"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full bg-surface-1 hover:bg-surface-2 text-muted-foreground"
          onClick={handleCollapse}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <h2 className={cn(
          "font-medium transition-opacity",
          isCollapsed ? "opacity-0 w-0" : "opacity-100"
        )}>
          Agents
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full bg-surface-1 hover:bg-surface-2 text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="py-2 space-y-1">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="transition-all duration-300">
              <ChatListItem
                agent={agent}
                selected={agent.id === selectedAgentId}
                onClick={() => onSelectAgent(agent.id)}
                collapsed={isCollapsed}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CollapsibleChatList;
