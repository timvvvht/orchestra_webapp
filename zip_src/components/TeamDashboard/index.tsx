import React, { useState, useEffect } from 'react';
import ActivityFeed from '../ActivityFeed';
import { CleanKanbanBoard } from '../TaskBoard';
import { useCleanKanbanStore } from '@/stores/cleanKanbanStore';

interface TeamDashboardProps {
  teamName?: string;
  teamStatus?: 'auto' | 'paused' | 'off';
  teamObjective?: string;
  initialViewMode?: 'feed' | 'agents' | 'tasks' | 'email' | 'social';
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  teamName = 'Research Squad',
  teamStatus = 'auto',
  teamObjective = 'Analyze and summarize research papers on AI collaboration techniques',
  initialViewMode = 'feed'
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [status, setStatus] = useState<'auto' | 'paused' | 'off'>(teamStatus);
  const [activeAgents, setActiveAgents] = useState<any[]>([]);

  // Always default to tasks view mode for now
  const [viewMode, setViewMode] = useState<'tasks' | 'email' | 'social'>(initialViewMode === 'tasks' ? 'tasks' : 'tasks');

  // Load the Kanban board when the component mounts
  useEffect(() => {
    const loadBoard = useCleanKanbanStore.getState().loadBoard;
    loadBoard().catch(err => {
      console.error('Failed to load kanban board:', err);
    });
  }, []);

  // Get columns from the Kanban store
  const taskColumns = useCleanKanbanStore(state => state.columns || []);

  const fallbackAgents = [
    {
      id: '1',
      name: 'Crawler',
      role: 'Research',
      avatarColor: 'from-purple-500 to-indigo-600',
      status: 'active',
      model: 'gpt-4o-mini',
      description: 'Specialized in finding and retrieving relevant information from various sources.',
      abilities: ['web_search', 'pdf_reader', 'markdown_writer', 'file_browser'],
      usage: {
        tokens: 14234,
        cost: 0.12
      }
    },
    {
      id: '2',
      name: 'Summarizer',
      role: 'Content',
      avatarColor: 'from-blue-500 to-cyan-600',
      status: 'idle',
      model: 'claude-3-haiku',
      description: 'Creates concise summaries from complex documents and research materials.',
      abilities: ['read_pdf', 'write_markdown', 'diff_documents'],
      usage: {
        tokens: 8750,
        cost: 0.09
      }
    },
    {
      id: '3',
      name: 'Critic',
      role: 'Review',
      avatarColor: 'from-pink-500 to-rose-600',
      status: 'paused',
      model: 'gpt-4o',
      description: 'Analyzes outputs for accuracy, completeness, and logical consistency.',
      abilities: ['review_content', 'provide_feedback', 'suggest_improvements'],
      usage: {
        tokens: 5324,
        cost: 0.18
      }
    },
  ];

  useEffect(() => {
    if (activeAgents.length === 0) {
      setActiveAgents(fallbackAgents);
    }
  }, [activeAgents.length]);

  const handleAgentClick = (agent: any) => {
    setSelectedAgent(agent);
    setDrawerOpen(true);
    console.log('Agent clicked:', agent.name);
  };

  const handleStatusChange = (newStatus: 'auto' | 'paused' | 'off') => {
    setStatus(newStatus);
    console.log(`Team status changed to ${newStatus}`);
  };

  const handleViewModeChange = (mode: 'tasks' | 'email' | 'social') => {
    setViewMode(mode);
    console.log(`View mode changed to ${mode}`);
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">


      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <section className="w-1/3 border-r border-border overflow-y-auto">
          <ActivityFeed />
        </section>
        <section className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-medium">Task Board</h2>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  onClick={() => {
                    // Use the store directly to avoid state refresh issues
                    if (taskColumns.length > 0) {
                      useCleanKanbanStore.getState().addTask(taskColumns[0].id, { title: 'New Task' });
                    }
                  }}
                >
                  Add Task
                </button>
                <button
                  className="px-3 py-1 text-xs border border-border rounded hover:bg-surface-2"
                  onClick={() => {
                    // Use the store directly to avoid state refresh issues
                    useCleanKanbanStore.getState().addColumn({ title: 'New Column', tasks: [] });
                  }}
                >
                  Add Column
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {/* Use the CleanKanbanBoard component for reliable drag and drop */}
              <CleanKanbanBoard />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TeamDashboard;