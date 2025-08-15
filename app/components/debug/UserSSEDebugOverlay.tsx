import React, { useState, useEffect, useMemo } from 'react';
import { getDefaultACSClient } from '@/services/acs';
import type { ACSRawEvent } from '@/services/acs/streaming/firehose';

interface UserSSEEvent extends ACSRawEvent {
  _receivedAt: number;
}

const MAX_EVENTS = 100;

export const UserSSEDebugOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<UserSSEEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Keyboard shortcut to toggle overlay (Ctrl+Shift+U for User SSE)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'U') {
        event.preventDefault();
        setOpen(prev => !prev);
        console.log('🔥 [USER-SSE-DEBUG] Toggled overlay via keyboard shortcut');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to user-specific SSE events
  useEffect(() => {
    const acsClient = getDefaultACSClient();
    const firehose = acsClient.firehose;
    
    if (!firehose) {
      console.warn('🔥 [USER-SSE-DEBUG] No firehose service available');
      return;
    }

    console.log('🔥 [USER-SSE-DEBUG] User SSE Debug Overlay mounted! Press Ctrl+Shift+U to toggle');
    console.log('🔥 [USER-SSE-DEBUG] Setting up user SSE debug overlay');

    // Track connection status
    const updateConnectionStatus = () => {
      setIsConnected(firehose.connectionType === 'user');
      setCurrentUserId(firehose.currentUserId);
    };

    // Initial status
    updateConnectionStatus();

    // Subscribe to firehose events
    const unsubscribe = firehose.subscribe((rawEvent: ACSRawEvent) => {
      console.log('🔥 [USER-SSE-DEBUG] Received event:', rawEvent);
      
      const eventWithTimestamp: UserSSEEvent = {
        ...rawEvent,
        _receivedAt: Date.now()
      };

      setEvents(prev => {
        const updated = [eventWithTimestamp, ...prev].slice(0, MAX_EVENTS);
        return updated;
      });

      // Update connection status when we receive events
      updateConnectionStatus();
    });

    // Check connection status periodically
    const statusInterval = setInterval(updateConnectionStatus, 1000);

    return () => {
      console.log('🔥 [USER-SSE-DEBUG] Cleaning up user SSE debug overlay');
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  // Get unique event types for filter dropdown
  const uniqueEventTypes = useMemo(() => {
    const types = new Set(events.map(ev => ev.event_type));
    return Array.from(types).sort();
  }, [events]);

  // Filter events based on selected type
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') {
      return events;
    }
    return events.filter(ev => ev.event_type === filterType);
  }, [events, filterType]);

  // Get event type color
  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'waiting_local_tool': return '#ff6b35'; // Orange for local tool events
      case 'agent_status': return '#4ecdc4'; // Teal for agent status
      case 'chunk': return '#45b7d1'; // Blue for chunks
      case 'tool_call': return '#f9ca24'; // Yellow for tool calls
      case 'tool_result': return '#6c5ce7'; // Purple for tool results
      case 'message_complete': return '#00b894'; // Green for completion
      case 'error': return '#e74c3c'; // Red for errors
      default: return '#95a5a6'; // Gray for others
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: open ? 500 : 200,
    height: open ? '100vh' : 40,
    background: 'rgba(0,0,0,0.9)',
    color: '#e0e0e0',
    fontSize: 11,
    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
    overflowY: 'auto',
    zIndex: 10000,
    borderBottomLeftRadius: open ? 0 : 8,
    border: '1px solid rgba(255,255,255,0.1)',
    borderTop: 'none',
    borderRight: 'none',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease'
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: open ? '1px solid rgba(255,255,255,0.2)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    userSelect: 'none'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{open ? '◀' : '▶'}</span>
          <span style={{ fontWeight: 'bold' }}>🔥 User SSE</span>
          <span style={{ 
            fontSize: 10, 
            background: 'rgba(255,255,255,0.1)', 
            padding: '2px 6px', 
            borderRadius: 10 
          }}>
            {filteredEvents.length}
          </span>
          {filterType !== 'all' && (
            <span style={{ fontSize: 9, color: '#888' }}>
              ({filterType})
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            fontSize: 10, 
            color: isConnected ? '#4ade80' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ fontSize: 12 }}>{isConnected ? '●' : '○'}</span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {open && (
        <div style={{ 
          padding: 12, 
          height: 'calc(100vh - 40px)', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {/* Connection Info */}
          <div style={{
            padding: 8,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 6,
            fontSize: 10,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div><strong>User ID:</strong> {currentUserId || 'None'}</div>
            <div><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</div>
            <div><strong>Events:</strong> {events.length} total, {filteredEvents.length} filtered</div>
            <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
              <strong>Shortcut:</strong> Ctrl+Shift+U to toggle
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>Filter:</strong>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 3,
                  color: '#e0e0e0',
                  fontSize: 10,
                  padding: '2px 6px',
                  marginLeft: 8,
                  cursor: 'pointer'
                }}
              >
                <option value="all">All ({events.length})</option>
                {uniqueEventTypes.map(type => (
                  <option key={type} value={type} style={{ background: '#333' }}>
                    {type} ({events.filter(e => e.event_type === type).length})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Events List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredEvents.map((ev, idx) => (
              <div
                key={`${ev.event_id}-${idx}`}
                style={{
                  padding: 8,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 4,
                  border: `1px solid ${getEventTypeColor(ev.event_type)}40`,
                  borderLeft: `4px solid ${getEventTypeColor(ev.event_type)}`
                }}
              >
                {/* Event Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ 
                      color: getEventTypeColor(ev.event_type), 
                      fontWeight: 'bold',
                      fontSize: 10
                    }}>
                      {ev.event_type}
                    </span>
                    {ev.session_id && (
                      <span style={{ fontSize: 9, color: '#888' }}>
                        {ev.session_id.slice(-8)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: '#aaa' }}>
                    {new Date(ev._receivedAt).toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}.{String(ev._receivedAt % 1000).padStart(3, '0')}
                  </span>
                </div>

                {/* Event Data */}
                <pre style={{
                  margin: 0,
                  fontSize: 9,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: '#ccc',
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.3)',
                  padding: 6,
                  borderRadius: 3
                }}>
                  {JSON.stringify({
                    event_id: ev.event_id,
                    message_id: ev.message_id,
                    timestamp: ev.timestamp,
                    data: ev.data
                  }, null, 2)}
                </pre>
              </div>
            ))}
            
            {filteredEvents.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: 20,
                fontStyle: 'italic',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 6,
                border: '1px dashed rgba(255,255,255,0.1)'
              }}>
                {events.length === 0 
                  ? '🔥 No user-specific SSE events yet...\nSend a message to see events!' 
                  : `No ${filterType} events found`
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};