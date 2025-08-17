import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Bot, ArrowRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type TaskStatus = 'idle' | 'thinking' | 'running' | 'done' | 'blocked';

interface Agent {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Dependency {
  fromTaskId: string;
  toTaskId: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: TaskStatus;
  agent: Agent;
  dependencies?: string[];
  completion: number; // 0-100
  isMilestone?: boolean;
}

interface Mission {
  id: string;
  title: string;
  tasks: Task[];
  dependencies: Dependency[];
}

interface TimelineGanttProps {
  missions: Mission[];
  onTaskClick?: (taskId: string) => void;
}

// Mock data for agents with different colors
const mockAgents: Agent[] = [
  { id: 'a1', name: 'Research Assistant', avatar: '🔍', color: '#3498db' },
  { id: 'a2', name: 'Code Assistant', avatar: '💻', color: '#9b59b6' },
  { id: 'a3', name: 'Writing Assistant', avatar: '📝', color: '#2ecc71' },
  { id: 'a4', name: 'Data Analyst', avatar: '📊', color: '#e74c3c' },
  { id: 'a5', name: 'Design Assistant', avatar: '🎨', color: '#f39c12' },
];

// Helper to get status color
const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'idle': return 'bg-neutral-300 dark:bg-neutral-600';
    case 'thinking': return 'bg-amber-400';
    case 'running': return 'bg-brand-500';
    case 'done': return 'bg-green-500';
    case 'blocked': return 'bg-red-500';
    default: return 'bg-neutral-300';
  }
};

// Helper to get status label
const getStatusLabel = (status: TaskStatus) => {
  switch (status) {
    case 'idle': return 'Not Started';
    case 'thinking': return 'Planning';
    case 'running': return 'In Progress';
    case 'done': return 'Completed';
    case 'blocked': return 'Blocked';
    default: return 'Unknown';
  }
};

const TimelineGantt: React.FC<TimelineGanttProps> = ({ missions, onTaskClick }) => {
  const today = new Date();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(today);
  
  // Calculate date range based on view mode
  const getDateRange = () => {
    if (viewMode === 'day') {
      return [currentDate];
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
      const end = endOfWeek(currentDate, { weekStartsOn: 1 }); // End on Sunday
      return eachDayOfInterval({ start, end });
    } else {
      // Month view - show 30 days
      const start = currentDate;
      const end = addDays(start, 29);
      return eachDayOfInterval({ start, end });
    }
  };
  
  const dateRange = getDateRange();
  
  // Navigate to previous/next period
  const navigatePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -30));
    }
  };
  
  const navigateNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 30));
    }
  };
  
  // Calculate task position and width
  const getTaskPosition = (task: Task) => {
    const startIdx = dateRange.findIndex(date => isSameDay(date, task.startDate));
    let width = differenceInDays(task.endDate, task.startDate) + 1;
    
    // If task starts before visible range
    if (startIdx === -1) {
      // If task ends before visible range, don't show
      if (task.endDate < dateRange[0]) return null;
      
      // Task starts before visible range but ends within or after
      width = differenceInDays(task.endDate, dateRange[0]) + 1;
      if (width > dateRange.length) width = dateRange.length;
      
      return { left: 0, width };
    }
    
    // If task extends beyond visible range
    if (width + startIdx > dateRange.length) {
      width = dateRange.length - startIdx;
    }
    
    return { left: startIdx, width };
  };
  
  // Draw dependency lines
  const renderDependencies = (mission: Mission) => {
    return mission.dependencies.map(dep => {
      const fromTask = mission.tasks.find(t => t.id === dep.fromTaskId);
      const toTask = mission.tasks.find(t => t.id === dep.toTaskId);
      
      if (!fromTask || !toTask) return null;
      
      const fromPos = getTaskPosition(fromTask);
      const toPos = getTaskPosition(toTask);
      
      if (!fromPos || !toPos) return null;
      
      // Calculate positions for the SVG path
      const fromX = (fromPos.left + fromPos.width) * 100;
      const fromY = mission.tasks.indexOf(fromTask) * 50 + 25;
      const toX = toPos.left * 100;
      const toY = mission.tasks.indexOf(toTask) * 50 + 25;
      
      return (
        <svg 
          key={`${dep.fromTaskId}-${dep.toTaskId}`}
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
          style={{ overflow: 'visible' }}
        >
          <path
            d={`M ${fromX} ${fromY} C ${fromX + 20} ${fromY}, ${toX - 20} ${toY}, ${toX} ${toY}`}
            stroke="#CBD5E1"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="4 2"
            markerEnd="url(#arrowhead)"
          />
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#CBD5E1" />
            </marker>
          </defs>
        </svg>
      );
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={navigatePrevious}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-18 font-semibold text-neutral-900 dark:text-neutral-100">
            {viewMode === 'day' && format(currentDate, 'MMMM d, yyyy')}
            {viewMode === 'week' && `Week of ${format(dateRange[0], 'MMM d')} - ${format(dateRange[dateRange.length - 1], 'MMM d')}`}
            {viewMode === 'month' && `${format(dateRange[0], 'MMMM d')} - ${format(dateRange[dateRange.length - 1], 'MMMM d')}`}
          </h2>
          
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={navigateNext}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCurrentDate(today)}
            className="ml-2 text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <Calendar className="h-4 w-4" />
            <span className="ml-1 text-13">Today</span>
          </Button>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant={viewMode === 'day' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('day')}
            className={viewMode === 'day' ? 'bg-brand-500 text-white' : ''}
          >
            Day
          </Button>
          <Button 
            variant={viewMode === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('week')}
            className={viewMode === 'week' ? 'bg-brand-500 text-white' : ''}
          >
            Week
          </Button>
          <Button 
            variant={viewMode === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('month')}
            className={viewMode === 'month' ? 'bg-brand-500 text-white' : ''}
          >
            Month
          </Button>
        </div>
      </div>
      
      {/* Timeline grid */}
      <Card className="flex-1 overflow-hidden border border-neutral-200/50 dark:border-neutral-800/50 bg-white dark:bg-neutral-900">
        <div className="flex h-full">
          {/* Left sidebar with task names */}
          <div className="w-64 flex-shrink-0 border-r border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-800/50">
            <div className="h-10 border-b border-neutral-200/50 dark:border-neutral-800/50 flex items-center px-4">
              <span className="text-13 font-medium text-neutral-500 dark:text-neutral-400">Tasks</span>
            </div>
            
            <ScrollArea className="h-[calc(100%-2.5rem)]">
              {missions.map(mission => (
                <div key={mission.id} className="mb-6">
                  <div className="sticky top-0 z-10 px-4 py-2 bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border-y border-neutral-200/50 dark:border-neutral-800/50">
                    <h3 className="text-14 font-semibold text-neutral-800 dark:text-neutral-200">{mission.title}</h3>
                  </div>
                  
                  {mission.tasks.map(task => (
                    <div 
                      key={task.id} 
                      className="h-[50px] px-4 flex items-center hover:bg-neutral-100 dark:hover:bg-neutral-800/50 border-b border-neutral-200/30 dark:border-neutral-800/30"
                    >
                      <div className="flex items-center gap-2 w-full overflow-hidden">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: task.agent.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-13 font-medium text-neutral-800 dark:text-neutral-200 truncate">
                              {task.title}
                            </span>
                            {task.isMilestone && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                                Milestone
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-11 text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-0.5">
                              <Bot className="h-3 w-3" />
                              {task.agent.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>
          </div>
          
          {/* Right side with timeline */}
          <div className="flex-1 overflow-hidden">
            {/* Date headers */}
            <div className="h-10 border-b border-neutral-200/50 dark:border-neutral-800/50 flex">
              {dateRange.map((date, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 min-w-[100px] text-center border-r border-neutral-200/30 dark:border-neutral-800/30 flex flex-col justify-center",
                    isSameDay(date, today) && "bg-brand-50/50 dark:bg-brand-900/10"
                  )}
                >
                  <div className="text-11 font-medium text-neutral-800 dark:text-neutral-200">
                    {format(date, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-11 text-neutral-500 dark:text-neutral-400",
                    isSameDay(date, today) && "text-brand-600 dark:text-brand-400 font-medium"
                  )}>
                    {format(date, 'MMM d')}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Timeline content */}
            <ScrollArea className="h-[calc(100%-2.5rem)]">
              <div className="relative">
                {missions.map(mission => (
                  <div key={mission.id} className="mb-6">
                    <div className="sticky top-0 z-10 py-2 bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border-y border-neutral-200/50 dark:border-neutral-800/50">
                      <div className="h-4" /> {/* Spacer to match the task sidebar header */}
                    </div>
                    
                    <div className="relative">
                      {/* Render dependency lines */}
                      {renderDependencies(mission)}
                      
                      {/* Render tasks */}
                      {mission.tasks.map((task, taskIndex) => {
                        const position = getTaskPosition(task);
                        if (!position) return null; // Task not in visible range
                        
                        const { left, width } = position;
                        
                        return (
                          <div 
                            key={task.id} 
                            className="h-[50px] relative border-b border-neutral-200/30 dark:border-neutral-800/30"
                          >
                            {/* Today indicator */}
                            {dateRange.findIndex(date => isSameDay(date, today)) >= 0 && (
                              <div 
                                className="absolute top-0 bottom-0 w-px bg-brand-500/50 dark:bg-brand-400/50 z-10"
                                style={{ left: `${dateRange.findIndex(date => isSameDay(date, today)) * 100}px` }}
                              />
                            )}
                            
                            {/* Task bar */}
                            <div 
                              className={cn(
                                "absolute top-[10px] h-[30px] rounded-md z-20 cursor-pointer",
                                task.isMilestone ? "w-[20px] h-[20px] top-[15px] rounded-full" : "",
                                "shadow-sm hover:shadow transition-all duration-150"
                              )}
                              style={{
                                left: `${left * 100}px`,
                                width: task.isMilestone ? '20px' : `${width * 100}px`,
                                background: task.isMilestone 
                                  ? task.agent.color
                                  : `linear-gradient(to right, ${task.agent.color}CC, ${task.agent.color})`,
                              }}
                              onClick={() => onTaskClick?.(task.id)}
                            >
                              {!task.isMilestone && (
                                <div className="px-2 h-full flex items-center">
                                  <div className="relative w-full">
                                    {/* Progress bar */}
                                    <div className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-sm" style={{ width: `${task.completion}%` }} />
                                    
                                    {/* Status indicator */}
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(task.status))} />
                                      {width > 2 && (
                                        <span className="text-10 text-white font-medium">
                                          {task.completion}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Card>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-13 font-medium text-neutral-800 dark:text-neutral-200">Agents:</div>
          <div className="flex items-center gap-3">
            {mockAgents.map(agent => (
              <div key={agent.id} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: agent.color }}
                />
                <span className="text-12 text-neutral-600 dark:text-neutral-400">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-13 font-medium text-neutral-800 dark:text-neutral-200">Status:</div>
          <div className="flex items-center gap-3">
            {['idle', 'thinking', 'running', 'done', 'blocked'].map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full", getStatusColor(status as TaskStatus))} />
                <span className="text-12 text-neutral-600 dark:text-neutral-400">
                  {getStatusLabel(status as TaskStatus)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Generate some placeholder data for demonstration
const generatePlaceholderData = (): Mission[] => {
  const today = new Date();
  
  return [
    {
      id: 'm1',
      title: 'Research AI Ethics Framework',
      tasks: [
        {
          id: 't1',
          title: 'Initial Research',
          description: 'Gather existing AI ethics frameworks',
          startDate: addDays(today, -5),
          endDate: addDays(today, -2),
          status: 'done',
          agent: mockAgents[0],
          completion: 100,
          dependencies: [],
        },
        {
          id: 't2',
          title: 'Framework Analysis',
          description: 'Analyze common principles across frameworks',
          startDate: addDays(today, -1),
          endDate: addDays(today, 2),
          status: 'running',
          agent: mockAgents[3],
          completion: 60,
          dependencies: ['t1'],
        },
        {
          id: 't3',
          title: 'Draft Initial Framework',
          description: 'Create first draft of our AI ethics framework',
          startDate: addDays(today, 3),
          endDate: addDays(today, 6),
          status: 'idle',
          agent: mockAgents[2],
          completion: 0,
          dependencies: ['t2'],
        },
        {
          id: 't4',
          title: 'Framework Review',
          description: 'Review milestone',
          startDate: addDays(today, 7),
          endDate: addDays(today, 7),
          status: 'idle',
          agent: mockAgents[0],
          completion: 0,
          dependencies: ['t3'],
          isMilestone: true,
        },
      ],
      dependencies: [
        { fromTaskId: 't1', toTaskId: 't2' },
        { fromTaskId: 't2', toTaskId: 't3' },
        { fromTaskId: 't3', toTaskId: 't4' },
      ],
    },
    {
      id: 'm2',
      title: 'Develop Timeline Component',
      tasks: [
        {
          id: 't5',
          title: 'Research Libraries',
          description: 'Evaluate existing timeline libraries',
          startDate: addDays(today, -3),
          endDate: addDays(today, -1),
          status: 'done',
          agent: mockAgents[1],
          completion: 100,
          dependencies: [],
        },
        {
          id: 't6',
          title: 'Design Prototype',
          description: 'Create design prototype',
          startDate: addDays(today, 0),
          endDate: addDays(today, 1),
          status: 'thinking',
          agent: mockAgents[4],
          completion: 30,
          dependencies: ['t5'],
        },
        {
          id: 't7',
          title: 'Implementation',
          description: 'Implement the timeline component',
          startDate: addDays(today, 2),
          endDate: addDays(today, 5),
          status: 'idle',
          agent: mockAgents[1],
          completion: 0,
          dependencies: ['t6'],
        },
        {
          id: 't8',
          title: 'Testing',
          description: 'Test the timeline component',
          startDate: addDays(today, 6),
          endDate: addDays(today, 7),
          status: 'idle',
          agent: mockAgents[1],
          completion: 0,
          dependencies: ['t7'],
        },
        {
          id: 't9',
          title: 'Release v1',
          description: 'Release milestone',
          startDate: addDays(today, 8),
          endDate: addDays(today, 8),
          status: 'idle',
          agent: mockAgents[1],
          completion: 0,
          dependencies: ['t8'],
          isMilestone: true,
        },
      ],
      dependencies: [
        { fromTaskId: 't5', toTaskId: 't6' },
        { fromTaskId: 't6', toTaskId: 't7' },
        { fromTaskId: 't7', toTaskId: 't8' },
        { fromTaskId: 't8', toTaskId: 't9' },
      ],
    },
  ];
};

// Example usage
const TimelineGanttExample: React.FC = () => {
  const placeholderData = generatePlaceholderData();
  
  return (
    <div className="h-[600px] p-4">
      <TimelineGantt 
        missions={placeholderData} 
        onTaskClick={(taskId) => console.log('Task clicked:', taskId)}
      />
    </div>
  );
};

export { TimelineGantt, TimelineGanttExample };
export type { Mission, Task, Agent, Dependency };