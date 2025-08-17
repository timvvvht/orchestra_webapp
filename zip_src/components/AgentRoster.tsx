import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// Mock data for agents
const mockAgents = [
  {
    id: 'agent-1',
    name: 'Research Assistant',
    avatar: 'R',
    avatarColor: 'from-blue-500 to-indigo-600',
    status: 'idle',
    lastActive: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
    specialty: 'Web research and summarization'
  },
  {
    id: 'agent-2',
    name: 'Data Crawler',
    avatar: 'D',
    avatarColor: 'from-green-500 to-emerald-600',
    status: 'idle',
    lastActive: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
    specialty: 'Data extraction and processing'
  },
  {
    id: 'agent-3',
    name: 'Code Helper',
    avatar: 'C',
    avatarColor: 'from-purple-500 to-violet-600',
    status: 'active',
    lastActive: new Date(), // Now
    specialty: 'Code generation and refactoring'
  },
  {
    id: 'agent-4',
    name: 'Content Writer',
    avatar: 'W',
    avatarColor: 'from-amber-500 to-orange-600',
    status: 'idle',
    lastActive: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    specialty: 'Blog posts and documentation'
  },
  {
    id: 'agent-5',
    name: 'Knowledge Base',
    avatar: 'K',
    avatarColor: 'from-pink-500 to-rose-600',
    status: 'idle',
    lastActive: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    specialty: 'Information retrieval and organization'
  }
];

interface AgentRowProps {
  agent: {
    id: string;
    name: string;
    avatar: string;
    avatarColor: string;
    status: 'idle' | 'active' | 'busy';
    lastActive: Date;
    specialty: string;
  };
  onClick: (id: string) => void;
}

const AgentRow: React.FC<AgentRowProps> = ({ agent, onClick }) => {
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="h-2 w-2 rounded-full bg-green-500"></span>;
      case 'busy':
        return <span className="h-2 w-2 rounded-full bg-amber-500"></span>;
      default:
        return <span className="h-2 w-2 rounded-full bg-muted-foreground/30"></span>;
    }
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onClick(agent.id)}
    >
      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${agent.avatarColor} flex items-center justify-center text-white font-medium text-sm`}>
        {agent.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="font-medium truncate">{agent.name}</h3>
          <div className="flex items-center gap-1.5">
            {getStatusIndicator(agent.status)}
            <span className="text-xs text-muted-foreground">
              {agent.status}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground truncate">{agent.specialty}</p>
      </div>
    </div>
  );
};

interface AgentRosterProps {
  className?: string;
}

const AgentRoster: React.FC<AgentRosterProps> = ({ className = '' }) => {
  const [loading, setLoading] = React.useState(true);
  const [agents, setAgents] = React.useState<typeof mockAgents>([]);

  // Simulate data loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAgents(mockAgents);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAgentClick = (id: string) => {
    console.log(`Clicked on agent ${id}`);
    // In a real app, this would navigate to the agent's chat or detail page
  };

  const handleCreateAgent = () => {
    console.log('Create new agent');
    // In a real app, this would open a dialog to create a new agent
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Agent Roster</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCreateAgent}>
          <Plus className="h-4 w-4 mr-1" />
          New Agent
        </Button>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : agents.length > 0 ? (
          <div className="space-y-1">
            {agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} onClick={handleAgentClick} />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            No agents available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentRoster;