import React, { useState, useEffect, useRef } from 'react';
import { useEventStore } from '@/stores/eventStore';
import { eventBus } from '@/services/acs/eventBus';
import type { SSEEvent } from '@/types/events';

interface SSEEventLog {
  id: string;
  timestamp: number;
  type: 'raw_sse' | 'unified' | 'store_add' | 'store_error' | 'ui_render' | 'connection' | 'error';
  data: any;
  sessionId?: string;
  messageId?: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  url?: string;
  lastConnected?: number;
  lastDisconnected?: number;
  reconnectAttempts: number;
}

// Enhanced log entry component with expandable details
const LogEntry: React.FC<{ entry: SSEEventLog }> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getEventTypeColor = (type: SSEEventLog['type']) => {
    switch (type) {
      case 'raw_sse': return 'text-blue-400';
      case 'unified': return 'text-green-400';
      case 'store_add': return 'text-purple-400';
      case 'ui_render': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };
  
  const formatEventDataDetailed = (data: any) => {
    if (typeof data === 'string') return data;
    
    // Handle different event types with detailed formatting
    if (data?.type === 'chunk') {
      return `chunk: "${(data.delta || '').slice(0, 200)}${data.delta?.length > 200 ? '...' : ''}" (${data.delta?.length || 0} chars)`;
    }
    
    if (data?.type === 'tool_call') {
      return `tool_call: ${data.toolCall?.name || 'unknown'} with ${Object.keys(data.toolCall?.args || {}).length} args`;
    }
    
    if (data?.type === 'tool_result') {
      const result = data.toolResult?.result;
      const resultStr = typeof result === 'string' 
        ? result.slice(0, 200) 
        : JSON.stringify(result || '').slice(0, 200);
      return `tool_result: "${resultStr}${resultStr.length >= 200 ? '...' : ''}"`;
    }
    
    if (data?.action) {
      // Store operations
      const details = [];
      if (data.eventId) details.push(`eventId: ${String(data.eventId).slice(-8)}`);
      if (data.deltaLength) details.push(`deltaLength: ${data.deltaLength}`);
      if (data.newTextLength) details.push(`newTextLength: ${data.newTextLength}`);
      if (data.toolName) details.push(`tool: ${data.toolName}`);
      if (data.toolCallId) details.push(`toolCallId: ${String(data.toolCallId).slice(-8)}`);
      
      return `${data.action}: ${details.join(', ')}`;
    }
    
    // Fallback to JSON with more details
    return JSON.stringify(data, null, 2);
  };
  
  return (
    <div className="border border-gray-700 rounded p-2 bg-gray-800/50">
      <div 
        className="flex justify-between items-start mb-1 cursor-pointer hover:bg-gray-700/30 p-1 rounded"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={`font-bold ${getEventTypeColor(entry.type)}`}>
          {entry.type.toUpperCase()}
          <span className="ml-2 text-gray-500 text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
        </span>
        <span className="text-gray-400 text-xs">
          {formatTimestamp(entry.timestamp)}
        </span>
      </div>
      
      {entry.sessionId && (
        <div className="text-xs text-gray-400 mb-1">
          Session: {String(entry.sessionId).slice(-8)}
          {entry.messageId && ` | Message: ${String(entry.messageId).slice(-8)}`}
        </div>
      )}
      
      <div className="text-xs text-gray-300 break-all">
        {formatEventDataDetailed(entry.data)}
      </div>
      
      {isExpanded && (
        <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-600">
          <div className="text-xs text-gray-400 mb-1">Full Event Data:</div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(entry.data, null, 2)}
          </pre>
          {entry.sessionId && (
            <div className="mt-2 text-xs text-gray-400">
              <div>Full Session ID: {entry.sessionId}</div>
              {entry.messageId && <div>Full Message ID: {entry.messageId}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Event Store View Component
const EventStoreView: React.FC<{ eventStore: any }> = ({ eventStore }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  
  // Check if eventStore has the expected structure
  if (!eventStore || !eventStore.events || !eventStore.order) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <div className="text-lg mb-2">Event Store Not Available</div>
          <div className="text-sm">
            The event store structure is not initialized or accessible.
          </div>
        </div>
      </div>
    );
  }
  
  // Get all events from the store with defensive checks
  const allEvents = (eventStore.order || [])
    .map((id: string) => eventStore.events?.[id])
    .filter(Boolean);
  
  // Filter events by kind
  const filteredStoreEvents = allEvents.filter((event: any) => {
    if (storeFilter === 'all') return true;
    return event.kind === storeFilter;
  });
  
  // Get unique event kinds for filter
  const eventKinds = [...new Set(allEvents.map((event: any) => event?.kind).filter(Boolean))];
  
  // Get store statistics
  const storeStats = {
    totalEvents: allEvents.length,
    byKind: eventKinds.reduce((acc, kind) => {
      acc[kind] = allEvents.filter((event: any) => event?.kind === kind).length;
      return acc;
    }, {} as Record<string, number>),
    sessions: [...new Set(allEvents.map((event: any) => event?.sessionId).filter(Boolean))],
    sources: [...new Set(allEvents.map((event: any) => event?.source).filter(Boolean))]
  };
  
  const selectedEvent = selectedEventId ? eventStore.events?.[selectedEventId] : null;
  
  return (
    <>
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-600 flex justify-between items-center">
        <h3 className="text-yellow-400 font-bold">
          Event Store ({filteredStoreEvents.length}/{allEvents.length} events)
        </h3>
        <select 
          value={storeFilter} 
          onChange={(e) => setStoreFilter(e.target.value)}
          className="bg-gray-700 text-white px-2 py-1 rounded text-xs"
        >
          <option value="all">All Kinds</option>
          {eventKinds.map(kind => (
            <option key={kind} value={kind}>{kind} ({storeStats.byKind[kind]})</option>
          ))}
        </select>
      </div>
      
      <div className="flex-1 flex">
        {/* Left: Event List */}
        <div className="w-1/2 border-r border-gray-600 flex flex-col">
          <div className="bg-gray-900 px-3 py-2 border-b border-gray-600">
            <h4 className="text-green-400 font-bold text-sm">Store Statistics</h4>
            <div className="text-xs text-gray-300 mt-1 space-y-1">
              <div>Total Events: {storeStats.totalEvents}</div>
              <div>Sessions: {storeStats.sessions.length}</div>
              <div>Sources: {storeStats.sources.join(', ')}</div>
              <div className="mt-2">
                <div className="text-gray-400">By Kind:</div>
                {Object.entries(storeStats.byKind).map(([kind, count]) => (
                  <div key={kind} className="ml-2">{kind}: {count}</div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredStoreEvents.length === 0 ? (
              <div className="text-gray-500 text-center py-8 text-xs">
                No events in store
              </div>
            ) : (
              filteredStoreEvents.map((event: any) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`p-2 rounded text-xs cursor-pointer border ${
                    selectedEventId === event.id
                      ? 'bg-blue-600/30 border-blue-400'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-green-400">{event.kind}</span>
                    <span className="text-gray-400">{event.id.slice(-8)}</span>
                  </div>
                  <div className="text-gray-300">
                    Role: {event.role || 'unknown'}
                  </div>
                  {event.sessionId && (
                    <div className="text-gray-400">
                      Session: {event.sessionId.slice(-8)}
                    </div>
                  )}
                  {event.partial && (
                    <div className="text-yellow-400">STREAMING</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Right: Event Details */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-gray-900 px-3 py-2 border-b border-gray-600">
            <h4 className="text-purple-400 font-bold text-sm">
              {selectedEvent ? `Event Details: ${selectedEvent.kind}` : 'Select an event'}
            </h4>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {selectedEvent ? (
              <div className="space-y-3">
                <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                  <h5 className="text-yellow-400 font-bold text-xs mb-2">Basic Info</h5>
                  <div className="text-xs space-y-1">
                    <div><span className="text-gray-400">ID:</span> {selectedEvent.id}</div>
                    <div><span className="text-gray-400">Kind:</span> {selectedEvent.kind}</div>
                    <div><span className="text-gray-400">Role:</span> {selectedEvent.role}</div>
                    <div><span className="text-gray-400">Created:</span> {selectedEvent.createdAt}</div>
                    <div><span className="text-gray-400">Updated:</span> {selectedEvent.updatedAt || 'N/A'}</div>
                    <div><span className="text-gray-400">Session:</span> {selectedEvent.sessionId}</div>
                    <div><span className="text-gray-400">Source:</span> {selectedEvent.source}</div>
                    <div><span className="text-gray-400">Partial:</span> {selectedEvent.partial ? 'Yes' : 'No'}</div>
                  </div>
                </div>
                
                {selectedEvent.content && (
                  <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                    <h5 className="text-yellow-400 font-bold text-xs mb-2">Content</h5>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedEvent.content, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedEvent.kind === 'tool_call' && (
                  <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                    <h5 className="text-yellow-400 font-bold text-xs mb-2">Tool Call Details</h5>
                    <div className="text-xs space-y-1">
                      <div><span className="text-gray-400">Name:</span> {selectedEvent.name}</div>
                      <div><span className="text-gray-400">Tool Use ID:</span> {selectedEvent.toolUseId}</div>
                      <div><span className="text-gray-400">Args:</span></div>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto ml-2">
                        {JSON.stringify(selectedEvent.args, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {selectedEvent.kind === 'tool_result' && (
                  <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                    <h5 className="text-yellow-400 font-bold text-xs mb-2">Tool Result Details</h5>
                    <div className="text-xs space-y-1">
                      <div><span className="text-gray-400">Tool Use ID:</span> {selectedEvent.toolUseId}</div>
                      <div><span className="text-gray-400">Result:</span></div>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto ml-2">
                        {JSON.stringify(selectedEvent.result, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                  <h5 className="text-yellow-400 font-bold text-xs mb-2">Full Event Schema</h5>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8 text-xs">
                Click on an event to see its full schema and details
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export const SSEDebugOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'store'>('events');
  const [eventLog, setEventLog] = useState<SSEEventLog[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  });
  const [stats, setStats] = useState({
    totalEvents: 0,
    eventsPerSecond: 0,
    lastEventTime: 0,
    storeEventCount: 0,
    errorCount: 0
  });
  
  const logRef = useRef<HTMLDivElement>(null);
  const eventCountRef = useRef(0);
  const lastStatsUpdate = useRef(Date.now());
  
  // Get current eventStore state
  const eventStore = useEventStore();

  // Add event to log
  const addLogEntry = (entry: Omit<SSEEventLog, 'id' | 'timestamp'>) => {
    const logEntry: SSEEventLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      ...entry
    };
    
    setEventLog(prev => {
      const newLog = [logEntry, ...prev].slice(0, 100); // Keep last 100 events
      return newLog;
    });
    
    // Update stats
    eventCountRef.current++;
    const now = Date.now();
    if (now - lastStatsUpdate.current > 1000) {
      const timeDiff = (now - lastStatsUpdate.current) / 1000;
      const eventsInPeriod = eventCountRef.current;
      setStats(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + eventsInPeriod,
        eventsPerSecond: Math.round(eventsInPeriod / timeDiff),
        lastEventTime: now
      }));
      eventCountRef.current = 0;
      lastStatsUpdate.current = now;
    }
  };

  // Listen to SSE events
  useEffect(() => {
    const sseHandler = (event: SSEEvent) => {
      addLogEntry({
        type: 'raw_sse',
        data: event,
        sessionId: event.sessionId,
        messageId: event.messageId
      });
    };

    eventBus.on('sse', sseHandler);
    return () => eventBus.off('sse', sseHandler);
  }, []);

  // Monitor eventStore changes
  useEffect(() => {
    const unsubscribe = useEventStore.subscribe((state) => {
      setStats(prev => ({
        ...prev,
        storeEventCount: state.order.length
      }));
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcut to toggle
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auto-scroll to latest log entry
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [eventLog]);

  // Add global debug functions
  useEffect(() => {
    (window as any).__SSE_DEBUG = {
      addLogEntry,
      getEventLog: () => eventLog,
      getStats: () => stats,
      clearLog: () => setEventLog([]),
      toggleOverlay: () => setIsVisible(prev => !prev)
    };
  }, [eventLog, stats]);

  // Filter events based on type
  const filteredEvents = eventLog.filter(event => {
    if (filterType === 'all') return true;
    return event.type === filterType;
  });

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-mono hover:bg-gray-700 transition-colors"
          title="Open SSE Debug Overlay (Ctrl+Shift+D)"
        >
          SSE Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-black/90 backdrop-blur-sm rounded-lg border border-gray-600 text-white font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-600 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">SSE Debug Overlay</h2>
          <div className="flex bg-gray-700 rounded">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1 text-xs rounded-l ${
                activeTab === 'events' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Event Log
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1 text-xs rounded-r ${
                activeTab === 'store' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Event Store
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {activeTab === 'events' && (
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-700 text-white px-2 py-1 rounded text-xs"
            >
              <option value="all">All Events</option>
              <option value="raw_sse">Raw SSE</option>
              <option value="unified">Unified</option>
              <option value="store_add">Store Add</option>
              <option value="error">Errors</option>
            </select>
          )}
          <span className="text-xs text-gray-400">Ctrl+Shift+D to toggle</span>
          <button
            onClick={() => setEventLog([])}
            className="bg-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-600"
          >
            Clear Log
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-500"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex h-full">
        {/* Left Panel - Stats & Status */}
        <div className="w-1/3 bg-gray-900 p-4 border-r border-gray-600 overflow-y-auto">
          <div className="space-y-4">
            {/* Connection Status */}
            <div>
              <h3 className="text-yellow-400 font-bold mb-2">Connection Status</h3>
              <div className="space-y-1 text-xs">
                <div className={`flex justify-between ${connectionStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  <span>Status:</span>
                  <span>{connectionStatus.isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>URL:</span>
                  <span className="truncate ml-2">{import.meta.env.VITE_SSE_BASE_URL || 'Not set'}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Reconnects:</span>
                  <span>{connectionStatus.reconnectAttempts}</span>
                </div>
              </div>
            </div>

            {/* Environment */}
            <div>
              <h3 className="text-yellow-400 font-bold mb-2">Environment</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Canonical Store:</span>
                  <span className={import.meta.env.VITE_CANONICAL_STORE ? 'text-green-400' : 'text-red-400'}>
                    {import.meta.env.VITE_CANONICAL_STORE || 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ACS Migration:</span>
                  <span className={import.meta.env.VITE_CHAT_ACS_MIGRATION ? 'text-green-400' : 'text-red-400'}>
                    {import.meta.env.VITE_CHAT_ACS_MIGRATION || 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Debug SSE:</span>
                  <span className={import.meta.env.VITE_DEBUG_SSE_EVENTS ? 'text-green-400' : 'text-red-400'}>
                    {import.meta.env.VITE_DEBUG_SSE_EVENTS || 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div>
              <h3 className="text-yellow-400 font-bold mb-2">Statistics</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <span className="text-green-400">{stats.totalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Events/sec:</span>
                  <span className="text-blue-400">{stats.eventsPerSecond}</span>
                </div>
                <div className="flex justify-between">
                  <span>Store Events:</span>
                  <span className="text-purple-400">{stats.storeEventCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Errors:</span>
                  <span className="text-red-400">{stats.errorCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Event:</span>
                  <span className="text-gray-400">
                    {stats.lastEventTime ? `${Math.round((Date.now() - stats.lastEventTime) / 1000)}s ago` : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Type Legend */}
            <div>
              <h3 className="text-yellow-400 font-bold mb-2">Event Types</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">●</span>
                  <span>Raw SSE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">●</span>
                  <span>Unified</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">●</span>
                  <span>Store Add</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">●</span>
                  <span>UI Render</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400">●</span>
                  <span>Error</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'events' ? (
            <>
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-600">
                <h3 className="text-yellow-400 font-bold">
                  Event Log ({filteredEvents.length}/{eventLog.length})
                  {filterType !== 'all' && <span className="text-gray-400 ml-2">filtered by {filterType}</span>}
                </h3>
              </div>
              <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredEvents.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    {eventLog.length === 0 
                      ? "No events yet. Send a message to see SSE events flow through the system."
                      : `No ${filterType} events found. Try changing the filter.`
                    }
                  </div>
                ) : (
                  filteredEvents.map((entry) => (
                    <LogEntry key={entry.id} entry={entry} />
                  ))
                )}
              </div>
            </>
          ) : (
            <EventStoreView eventStore={eventStore} />
          )}
        </div>
      </div>
    </div>
  );
};

// Global debug functions for console access
declare global {
  interface Window {
    __SSE_DEBUG: {
      addLogEntry: (entry: Omit<SSEEventLog, 'id' | 'timestamp'>) => void;
      getEventLog: () => SSEEventLog[];
      getStats: () => any;
      clearLog: () => void;
      toggleOverlay: () => void;
    };
  }
}