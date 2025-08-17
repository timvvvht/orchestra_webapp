import React, { useState, useMemo, useEffect } from 'react';
import type { SSEEvent } from '@/services/acs';
import { useChatUI } from '@/context/ChatUIContext';

interface Props {
  events: SSEEvent[];
  currentSessionId?: string;
  isConnected?: boolean;
}

const MAX_EVENTS = 200;

export const SSEEventDebugPanel: React.FC<Props> = ({ events, currentSessionId, isConnected }) => {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [allEvents, setAllEvents] = useState<Array<SSEEvent & { _source: 'session' | 'user' }>>([]);
  
  // Get access to the chat UI context for firehose service
  const chatUI = useChatUI();
  
  // Debug: Log when events prop changes
  useEffect(() => {
    console.log('🐛 [DEBUG] SSEEventDebugPanel received events, count:', events.length);
    if (events.length > 0) {
      console.log('🐛 [DEBUG] First few events:', events.slice(0, 2));
    }
  }, [events]);

  // Subscribe to both session and user pipe events
  useEffect(() => {
    // Add session events with source marker
    const sessionEvents = events.map(event => ({ ...event, _source: 'session' as const }));
    
    // Subscribe to user pipe events via firehose service
    let userEventUnsubscribe: (() => void) | undefined;
    
    if (chatUI.acsClient?.streaming?.firehoseService) {
      console.log('🐛 [DEBUG] SSEEventDebugPanel subscribing to user pipe events');
      
      userEventUnsubscribe = chatUI.acsClient.streaming.firehoseService.subscribe((rawEvent: any) => {
        console.log('🐛 [DEBUG] SSEEventDebugPanel received user pipe event:', rawEvent);
        
        // Transform raw firehose event to SSEEvent format
        const userEvent: SSEEvent & { _source: 'user' } = {
          type: rawEvent.event_type || 'unknown',
          sessionId: rawEvent.session_id || '',
          event_id: rawEvent.event_id || '',
          messageId: rawEvent.message_id,
          data: rawEvent.data || rawEvent,
          _source: 'user',
          _receivedAt: Date.now()
        };
        
        setAllEvents(prev => {
          const updated = [...prev, userEvent].slice(-MAX_EVENTS);
          console.log('🐛 [DEBUG] SSEEventDebugPanel updated allEvents count:', updated.length);
          return updated;
        });
      });
    }
    
    // Combine session events with existing user events
    setAllEvents(prev => {
      const userEvents = prev.filter(e => e._source === 'user');
      const combined = [...sessionEvents, ...userEvents]
        .sort((a, b) => ((a as any)._receivedAt || 0) - ((b as any)._receivedAt || 0))
        .slice(-MAX_EVENTS);
      return combined;
    });
    
    return () => {
      if (userEventUnsubscribe) {
        console.log('🐛 [DEBUG] SSEEventDebugPanel unsubscribing from user pipe events');
        userEventUnsubscribe();
      }
    };
  }, [events, chatUI.acsClient?.streaming?.firehoseService]);

  // Get unique event types for filter dropdown
  const uniqueEventTypes = useMemo(() => {
    const types = new Set(allEvents.map(ev => ev.type));
    return Array.from(types).sort();
  }, [allEvents]);

  // Filter events based on selected type
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') {
      return allEvents;
    }
    return allEvents.filter(ev => ev.type === filterType);
  }, [allEvents, filterType]);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 420,
    height: open ? '100vh' : 32,
    background: 'rgba(0,0,0,0.8)',
    color: '#d4d4d4',
    fontSize: 12,
    fontFamily: 'monospace',
    overflowY: 'auto',
    zIndex: 9999,
    borderBottomLeftRadius: open ? 0 : 6,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  };

  return (
    <div style={containerStyle}>
      <div
        style={{ 
          padding: '4px 8px', 
          borderBottom: open ? '1px solid #444' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={() => setOpen(!open)}
        >
          {open ? '◀' : '▶'} SSE Debug {filteredEvents.length}
          {filterType !== 'all' && (
            <span style={{ fontSize: 10, color: '#888' }}>
              ({filterType})
            </span>
          )}
          <div style={{ fontSize: 9, color: isConnected ? '#4ade80' : '#ef4444', marginLeft: 4 }}>
            {isConnected ? '●' : '○'}
          </div>
        </div>
        
        {open && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 3,
              color: '#d4d4d4',
              fontSize: 10,
              padding: '2px 4px',
              cursor: 'pointer'
            }}
          >
            <option value="all">All ({allEvents.length})</option>
            {uniqueEventTypes.map(type => (
              <option key={type} value={type} style={{ background: '#333' }}>
                {type} ({allEvents.filter(e => e.type === type).length})
              </option>
            ))}
          </select>
        )}
      </div>

      {open && (
        <div style={{ 
          padding: 8, 
          height: 'calc(100vh - 32px)', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {/* Session Info */}
          <div style={{
            padding: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 4,
            fontSize: 10,
            color: '#d4d4d4',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div><strong>Session:</strong> {currentSessionId || 'None'}</div>
            <div><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</div>
            <div><strong>Events:</strong> {allEvents.length} total, {filteredEvents.length} filtered</div>
            <div><strong>Sources:</strong> 
              <span style={{ color: '#0af', marginLeft: 4 }}>
                Session: {allEvents.filter(e => e._source === 'session').length}
              </span>
              <span style={{ color: '#f80', marginLeft: 8 }}>
                User: {allEvents.filter(e => e._source === 'user').length}
              </span>
            </div>
          </div>
          
          {filteredEvents.slice(0, MAX_EVENTS).map((ev, idx) => (
            <pre
              key={idx}
              style={{
                margin: 0,
                padding: 8,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <span style={{ color: ev._source === 'session' ? '#0af' : '#f80', fontWeight: 'bold' }}>
                [{ev._source.toUpperCase()}]
              </span>
              {' '}
              {(ev as any)._receivedAt ? new Date((ev as any)._receivedAt).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              }) + '.' + String((ev as any)._receivedAt % 1000).padStart(3, '0') : 'No timestamp'} | {ev.type}
              {'\n'}
              {JSON.stringify(ev, null, 2)}
            </pre>
          ))}
          {filteredEvents.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: '#888', 
              padding: 20,
              fontStyle: 'italic'
            }}>
              {allEvents.length === 0 
                ? 'No SSE events yet...' 
                : `No ${filterType} events found`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};