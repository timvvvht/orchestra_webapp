import React, { useState, useMemo } from 'react';
import { Clock, Code, FileText, Search, MessageSquare, Database, RefreshCcw, CheckCircle, AlertCircle, Filter, X, ChevronDown, Layers } from 'lucide-react';
import CachedResourceImage from './CachedResourceImage';
import { useActivityFeed, ActivityEvent, EventKind } from '@/stores/activityStore';

interface ActivityFeedProps {
  className?: string;
}

type FilterState = {
  types: EventKind[];
  agents: string[];
};

type TimeGroup = {
  label: string;
  events: ActivityEvent[];
};

// Mock data for demonstration purposes
const MOCK_EVENTS: ActivityEvent[] = [
  {
    id: 'mock-1',
    agentName: 'CodeAgent',
    agentId: 'code-agent-1',
    action: 'analyzed the codebase',
    timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    eventType: 'thinking',
    details: 'Reviewing project structure and dependencies',
    agentColor: 'from-blue-500 to-indigo-700',
  },
  {
    id: 'mock-2',
    agentName: 'CodeAgent',
    agentId: 'code-agent-1',
    action: 'made a recommendation',
    timestamp: Date.now() - 4 * 60 * 1000, // 4 minutes ago
    eventType: 'message',
    details: 'Suggested refactoring the authentication module for better security',
    agentColor: 'from-blue-500 to-indigo-700',
  },
  {
    id: 'mock-3',
    agentName: 'DataAgent',
    agentId: 'data-agent-1',
    action: 'accessed database',
    timestamp: Date.now() - 3 * 60 * 1000, // 3 minutes ago
    eventType: 'tool_call',
    target: 'users.collection',
    details: 'Retrieving user profiles and preferences',
    agentColor: 'from-emerald-500 to-green-700',
  },
  {
    id: 'mock-4',
    agentName: 'DataAgent',
    agentId: 'data-agent-1',
    action: 'processed data',
    timestamp: Date.now() - 2 * 60 * 1000, // 2 minutes ago
    eventType: 'tool_result',
    details: 'Successfully analyzed 1,254 user records',
    agentColor: 'from-emerald-500 to-green-700',
  },
  {
    id: 'mock-5',
    agentName: 'FileAgent',
    agentId: 'file-agent-1',
    action: 'updated configuration',
    timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    eventType: 'file_operation',
    target: 'config/settings.json',
    details: 'Updated API endpoints and timeout settings',
    agentColor: 'from-amber-500 to-orange-700',
  },
  {
    id: 'mock-6',
    agentName: 'BugHunter',
    agentId: 'bug-hunter-1',
    action: 'fixed a critical issue',
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    eventType: 'complete',
    target: 'src/services/auth.ts',
    details: 'Fixed potential security vulnerability in token validation',
    agentColor: 'from-red-500 to-rose-700',
  },
  {
    id: 'mock-7',
    agentName: 'BugHunter',
    agentId: 'bug-hunter-1',
    action: 'encountered an error',
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    eventType: 'error',
    details: 'Failed to parse malformed JSON response from external API',
    agentColor: 'from-red-500 to-rose-700',
  },
  {
    id: 'mock-8',
    agentName: 'AssistantBot',
    agentId: 'assistant-bot-1',
    action: 'generated documentation',
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
    eventType: 'file_operation',
    target: 'docs/API.md',
    details: 'Created comprehensive API documentation with examples',
    agentColor: 'from-purple-500 to-violet-700',
  }
];

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ className = '' }) => {
  const { events, clear } = useActivityFeed();
  const [filters, setFilters] = useState<FilterState>({ types: [], agents: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [showMockData, setShowMockData] = useState(false);
  
  // Use mock data if no real events and showMockData is true
  const displayEvents = events.length > 0 ? events : (showMockData ? MOCK_EVENTS : []);
  
  // Get unique agent names and event types for filters
  const { agentNames, eventTypes } = useMemo(() => {
    const names = new Set<string>();
    const types = new Set<EventKind>();
    
    displayEvents.forEach(event => {
      names.add(event.agentName);
      if (event.eventType) types.add(event.eventType);
    });
    
    return {
      agentNames: Array.from(names),
      eventTypes: Array.from(types as Set<EventKind>)
    };
  }, [displayEvents]);
  
  // Apply filters to events
  const filteredEvents = useMemo(() => {
    if (filters.types.length === 0 && filters.agents.length === 0) {
      return displayEvents;
    }
    
    return displayEvents.filter(event => {
      const typeMatch = filters.types.length === 0 || 
        (event.eventType && filters.types.includes(event.eventType));
      const agentMatch = filters.agents.length === 0 || 
        filters.agents.includes(event.agentName);
      
      return typeMatch && agentMatch;
    });
  }, [displayEvents, filters]);
  
  // Group events by time periods
  const groupedEvents = useMemo(() => {
    const now = Date.now();
    const groups: TimeGroup[] = [];
    
    // Helper to check if date is today
    const isToday = (timestamp: number) => {
      const date = new Date(timestamp);
      const today = new Date();
      return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
    };
    
    // Helper to check if date is yesterday
    const isYesterday = (timestamp: number) => {
      const date = new Date(timestamp);
      const yesterday = new Date(now - 86400000);
      return date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();
    };
    
    // Helper to get week number
    const getWeekNumber = (timestamp: number) => {
      const date = new Date(timestamp);
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };
    
    // Helper to check if date is this week
    const isThisWeek = (timestamp: number) => {
      const date = new Date(timestamp);
      const today = new Date();
      return getWeekNumber(date.getTime()) === getWeekNumber(today.getTime()) &&
        date.getFullYear() === today.getFullYear();
    };
    
    // Create groups
    const todayEvents = filteredEvents.filter(e => isToday(e.timestamp));
    if (todayEvents.length > 0) {
      groups.push({ label: 'Today', events: todayEvents });
    }
    
    const yesterdayEvents = filteredEvents.filter(e => isYesterday(e.timestamp));
    if (yesterdayEvents.length > 0) {
      groups.push({ label: 'Yesterday', events: yesterdayEvents });
    }
    
    const thisWeekEvents = filteredEvents.filter(e => 
      !isToday(e.timestamp) && !isYesterday(e.timestamp) && isThisWeek(e.timestamp)
    );
    if (thisWeekEvents.length > 0) {
      groups.push({ label: 'This Week', events: thisWeekEvents });
    }
    
    const olderEvents = filteredEvents.filter(e => 
      !isToday(e.timestamp) && !isYesterday(e.timestamp) && !isThisWeek(e.timestamp)
    );
    if (olderEvents.length > 0) {
      groups.push({ label: 'Older', events: olderEvents });
    }
    
    return groups;
  }, [filteredEvents]);
  
  // Format time for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      // For today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // For other days, show date and time
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
        ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  // Get appropriate icon for event type
  const getEventIcon = (eventType?: string) => {
    const iconClasses = "h-4 w-4 flex-shrink-0";
    
    switch (eventType) {
      case 'tool_call':
        return <Code className={`${iconClasses} text-blue-600 dark:text-blue-400`} />;
      case 'tool_result':
        return <Database className={`${iconClasses} text-purple-600 dark:text-purple-400`} />;
      case 'message':
        return <MessageSquare className={`${iconClasses} text-green-600 dark:text-green-400`} />;
      case 'thinking':
        return <RefreshCcw className={`${iconClasses} text-amber-600 dark:text-amber-400`} />;
      case 'file_operation':
        return <FileText className={`${iconClasses} text-blue-600 dark:text-blue-400`} />;
      case 'error':
        return <AlertCircle className={`${iconClasses} text-red-600 dark:text-red-400`} />;
      case 'complete':
        return <CheckCircle className={`${iconClasses} text-green-600 dark:text-green-400`} />;
      default:
        return <Clock className={`${iconClasses} text-muted-foreground`} />;
    }
  };
  
  // Get color class for event type badge
  const getEventTypeColor = (eventType?: string): string => {
    switch (eventType) {
      case 'tool_call':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shadow-sm';
      case 'tool_result':
        return 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 shadow-sm';
      case 'message':
        return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800/50 shadow-sm';
      case 'thinking':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shadow-sm';
      case 'file_operation':
        return 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 shadow-sm';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/50 shadow-sm';
      case 'complete':
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shadow-sm';
      default:
        return 'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/50 shadow-sm';
    }
  };
  
  // Toggle a filter value
  const toggleFilter = (type: 'types' | 'agents', value: string) => {
    setFilters(prev => {
      const current = prev[type] as string[];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      
      return {
        ...prev,
        [type]: updated
      };
    });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({ types: [], agents: [] });
  };
  
  // Show empty state if no events and mock data is not enabled
  if (!displayEvents.length) {
    return (
      <div className={`h-full overflow-y-auto rounded-lg border border-border bg-surface-1 ${className}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3">
          <h2 className="text-base font-semibold">Activity Feed</h2>
        </div>
        <div className="flex h-[calc(100%-3rem)] flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 rounded-full bg-surface-2 p-3 shadow-sm border border-border/30">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mb-1 text-sm font-medium">No activity yet</p>
          <p className="text-xs text-muted-foreground">Agent activity will appear here</p>
          <div className="flex flex-col gap-2 mt-4">
            <button 
              onClick={() => setShowMockData(true)}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-full px-3 py-1 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 shadow-sm flex items-center justify-center gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Show sample activity</span>
            </button>
            <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-full px-3 py-1 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 shadow-sm">
              Run an agent to get started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto rounded-lg border border-border bg-surface-1 ${className}`}>
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface-1">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-semibold">Activity Feed</h2>
          <div className="flex items-center gap-2">
            {events.length === 0 && showMockData && (
              <button
                onClick={() => setShowMockData(false)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Demo Mode</span>
              </button>
            )}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 ${showFilters ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground border border-primary/20 dark:border-primary/30 shadow-sm' : 'text-muted-foreground hover:bg-surface-2 border border-transparent hover:border-border/40'}`}
              aria-label="Filter activities"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <button 
              onClick={() => {
                clear();
                setShowMockData(false);
              }}
              className="rounded-full p-1.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 border border-transparent hover:border-border/40"
              aria-label="Clear activity feed"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="border-t border-border bg-surface-2 px-4 py-3">
            <div className="mb-3">
              <h3 className="mb-2 text-xs font-medium">Filter by type</h3>
              <div className="flex flex-wrap gap-1.5">
                {eventTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleFilter('types', type)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${filters.types.includes(type) ? getEventTypeColor(type) : 'bg-surface-3 text-muted-foreground hover:bg-surface-3/80 border border-border/40'}`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-2">
              <h3 className="mb-2 text-xs font-medium">Filter by agent</h3>
              <div className="flex flex-wrap gap-1.5">
                {agentNames.map(name => (
                  <button
                    key={name}
                    onClick={() => toggleFilter('agents', name)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${filters.agents.includes(name) ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground border border-primary/20 dark:border-primary/30 shadow-sm' : 'bg-surface-3 text-muted-foreground hover:bg-surface-3/80 border border-border/40'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            
            {(filters.types.length > 0 || filters.agents.length > 0) && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-full px-2 py-0.5 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Activity Groups */}
      <div className="divide-y divide-border">
        {groupedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 rounded-full bg-surface-2 p-2.5">
              <Filter className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No matching activities</p>
            <p className="mb-2 text-xs text-muted-foreground">Try adjusting your filters</p>
            {(filters.types.length > 0 || filters.agents.length > 0) && (
              <button
                onClick={clearFilters}
                className="mt-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-full px-3 py-1 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 shadow-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          groupedEvents.map(group => (
            <div key={group.label} className="px-4 py-3">
              {/* Time Group Label */}
              <div className="mb-3 flex items-center">
                <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
                <div className="ml-3 h-px flex-1 bg-border/60 dark:bg-border/40"></div>
              </div>
              
              {/* Events in this group */}
              <div className="space-y-4">
                {group.events.map((event) => (
                  <div key={event.id} className="group relative flex gap-3">
                    {/* Timeline connector */}
                    <div className="absolute left-[0.9375rem] top-10 bottom-0 w-px bg-border/60 group-last:hidden"></div>
                    
                    {/* Avatar */}
                    <div className="relative">
                      <div className={`h-7.5 w-7.5 flex-shrink-0 rounded-full bg-gradient-to-br ${event.agentColor} flex items-center justify-center text-primary-foreground font-medium text-xs overflow-hidden shadow-sm`}>
                        {event.avatarPath && event.avatarType === 'resource' ? (
                          <CachedResourceImage 
                            path={event.avatarPath} 
                            alt={`${event.agentName} avatar`} 
                            className="h-full w-full object-cover"
                            showPlaceholder={true}
                            onError={(error) => console.error(`Error loading avatar for ${event.agentName}:`, error)}
                          />
                        ) : (
                          event.agentName.charAt(0)
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                      {/* Header */}
                      <div className="mb-1 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5 overflow-hidden">
                          <span className="font-medium truncate">{event.agentName}</span>
                          <span className="text-xs text-muted-foreground truncate">{event.action}</span>
                        </div>
                        <time className="ml-2 flex-shrink-0 text-xs text-muted-foreground">{formatTime(event.timestamp)}</time>
                      </div>
                      
                      {/* Event Type Badge */}
                      {event.eventType && (
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${getEventTypeColor(event.eventType)}`}>
                            {getEventIcon(event.eventType)}
                            <span>{event.eventType.replace('_', ' ')}</span>
                          </span>
                        </div>
                      )}
                      
                      {/* Target (if any) */}
                      {event.target && (
                        <div className="mb-1.5 overflow-hidden text-ellipsis">
                          <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs font-mono border border-border/40">{event.target}</code>
                        </div>
                      )}
                      
                      {/* Details (if any) */}
                      {event.details && (
                        <p className="text-xs text-muted-foreground">
                          {typeof event.details === 'string'
                            ? event.details
                            : (typeof event.details === 'object' && event.details !== null && 'thought' in event.details && typeof (event.details as any).thought === 'string')
                              ? (event.details as { thought: string }).thought
                              : JSON.stringify(event.details) // Fallback: show object as string for debugging
                          }
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;