import React, { useState } from 'react';
import { Plus, ChevronDown, Bot, User, Clock, MoreHorizontal, Play, Pause, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { TimelineGanttExample } from './TimelineGantt';

type AgentStatus = 'idle' | 'thinking' | 'running' | 'done' | 'blocked';

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  description: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: AgentStatus;
  agent: Agent;
  createdAt: Date;
  updatedAt: Date;
  duration?: number; // in minutes
  column: 'todo' | 'in-progress' | 'done';
}

interface Mission {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'archived';
}

const mockAgents: Agent[] = [
  { id: 'a1', name: 'Research Assistant', description: 'Helps with research and information gathering' },
  { id: 'a2', name: 'Code Assistant', description: 'Helps with coding tasks and debugging' },
  { id: 'a3', name: 'Writing Assistant', description: 'Helps with writing and editing content' },
  { id: 'a4', name: 'Data Analyst', description: 'Helps with data analysis and visualization' },
];

const mockMissions: Mission[] = [
  {
    id: 'm1',
    title: 'Research AI Ethics Framework',
    description: 'Develop a comprehensive ethics framework for AI development',
    createdAt: new Date(2024, 4, 10),
    updatedAt: new Date(2024, 4, 14),
    status: 'active',
    tasks: [
      {
        id: 't1',
        title: 'Gather existing AI ethics frameworks',
        description: 'Research and compile existing AI ethics frameworks from major organizations',
        status: 'done',
        agent: mockAgents[0],
        createdAt: new Date(2024, 4, 10),
        updatedAt: new Date(2024, 4, 11),
        duration: 120,
        column: 'done'
      },
      {
        id: 't2',
        title: 'Analyze common principles',
        description: 'Identify common principles across different frameworks',
        status: 'running',
        agent: mockAgents[3],
        createdAt: new Date(2024, 4, 11),
        updatedAt: new Date(2024, 4, 14),
        duration: 180,
        column: 'in-progress'
      },
      {
        id: 't3',
        title: 'Draft initial framework',
        description: 'Create first draft of our AI ethics framework',
        status: 'idle',
        agent: mockAgents[2],
        createdAt: new Date(2024, 4, 12),
        updatedAt: new Date(2024, 4, 12),
        column: 'todo'
      }
    ]
  },
  {
    id: 'm2',
    title: 'Develop Timeline Component',
    description: 'Create a new timeline component for agent orchestration',
    createdAt: new Date(2024, 4, 13),
    updatedAt: new Date(2024, 4, 14),
    status: 'active',
    tasks: [
      {
        id: 't4',
        title: 'Research timeline libraries',
        description: 'Evaluate existing timeline libraries for potential use',
        status: 'done',
        agent: mockAgents[0],
        createdAt: new Date(2024, 4, 13),
        updatedAt: new Date(2024, 4, 13),
        duration: 90,
        column: 'done'
      },
      {
        id: 't5',
        title: 'Create component prototype',
        description: 'Develop initial prototype of the timeline component',
        status: 'thinking',
        agent: mockAgents[1],
        createdAt: new Date(2024, 4, 14),
        updatedAt: new Date(2024, 4, 14),
        column: 'in-progress'
      },
      {
        id: 't6',
        title: 'Integrate with agent system',
        description: 'Connect timeline component with agent orchestration system',
        status: 'idle',
        agent: mockAgents[1],
        createdAt: new Date(2024, 4, 14),
        updatedAt: new Date(2024, 4, 14),
        column: 'todo'
      }
    ]
  }
];

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const statusColors = {
    idle: 'bg-neutral-200 dark:bg-neutral-700',
    thinking: 'bg-amber-500 animate-pulse',
    running: 'bg-brand-500',
    done: 'bg-green-500',
    blocked: 'bg-danger-500'
  };
  
  const statusIcons = {
    idle: <Clock className="h-3.5 w-3.5" />,
    thinking: <Clock className="h-3.5 w-3.5 animate-pulse" />,
    running: <Play className="h-3.5 w-3.5" />,
    done: <Play className="h-3.5 w-3.5" />,
    blocked: <AlertCircle className="h-3.5 w-3.5" />
  };
  
  return (
    <Card className="p-3 mb-3 card-interactive">
      <div className="flex justify-between items-start">
        <h3 className="text-16 font-medium">{task.title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="-mr-1 -mt-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Reassign Agent</DropdownMenuItem>
            <DropdownMenuItem>Change Status</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <p className="text-14 text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
        {task.description}
      </p>
      
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Bot className="w-3 h-3 text-brand-600 dark:text-brand-400" />
            </div>
            <span className="text-12 text-neutral-600 dark:text-neutral-400">{task.agent.name}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusColors[task.status]}`} />
          <span className="text-12 capitalize text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
            {statusIcons[task.status]}
            {task.status}
          </span>
        </div>
      </div>
    </Card>
  );
};

const MissionCard: React.FC<{ mission: Mission }> = ({ mission }) => {
  const todoTasks = mission.tasks.filter(task => task.column === 'todo');
  const inProgressTasks = mission.tasks.filter(task => task.column === 'in-progress');
  const doneTasks = mission.tasks.filter(task => task.column === 'done');
  
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
        <div>
          <h2 className="text-20 font-display font-semibold">{mission.title}</h2>
          <p className="text-14 text-neutral-600 dark:text-neutral-400 mt-1">{mission.description}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>
      
      <div className="p-4 grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-16 font-medium">To Do</h3>
            <span className="text-12 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              {todoTasks.length}
            </span>
          </div>
          {todoTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-16 font-medium">In Progress</h3>
            <span className="text-12 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              {inProgressTasks.length}
            </span>
          </div>
          {inProgressTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-16 font-medium">Done</h3>
            <span className="text-12 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              {doneTasks.length}
            </span>
          </div>
          {doneTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </Card>
  );
};

const TimelineView: React.FC<{ missions: Mission[] }> = ({ missions }) => {
  return (
    <div className="p-4">
      <TimelineGanttExample />
    </div>
  );
};

const MissionsPage: React.FC = () => {
  const [missions] = useState<Mission[]>(mockMissions);
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-24 font-display font-semibold">Missions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Bot className="h-4 w-4" />
            Agents
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>
          <Button className="gap-1">
            <Plus className="h-4 w-4" />
            New Mission
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="kanban" className="flex-1 overflow-hidden">
        <div className="px-4 pt-4 border-b border-neutral-200 dark:border-neutral-800">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="overflow-y-auto flex-1">
          <TabsContent value="kanban" className="mt-0 h-full">
            <div className="p-4">
              {missions.map(mission => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="timeline" className="mt-0 h-full">
            <TimelineView missions={missions} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MissionsPage;