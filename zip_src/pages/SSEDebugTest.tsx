import React, { useState, useEffect } from 'react';
import { SSEEventDebugPanel } from '@/components/debug/SSEEventDebugPanel';
import type { SSEEvent } from '@/services/acs';

/**
 * Test page for the SSE Debug Panel
 * Simulates SSE events to demonstrate the debug panel functionality
 */
const SSEDebugTest: React.FC = () => {
  const [events, setEvents] = useState<SSEEvent[]>([]);

  // Simulate SSE events for testing
  useEffect(() => {
    const interval = setInterval(() => {
      const eventTypes = ['chunk', 'token', 'tool_call', 'tool_result', 'done', 'error', 'status', 'agent_status'];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      const mockEvent: SSEEvent = {
        type: randomType,
        sessionId: 'test-session-123',
        messageId: `msg-${Date.now()}`,
        seq: Math.floor(Math.random() * 100),
        event_id: `evt-${Date.now()}`,
        delta: randomType === 'chunk' || randomType === 'token' ? `Sample text ${Math.random()}` : undefined,
        toolCall: randomType === 'tool_call' ? {
          id: `tool-${Date.now()}`,
          name: 'test_tool',
          arguments: { param: 'value' }
        } : undefined,
        result: randomType === 'tool_result' ? { output: 'Tool executed successfully' } : undefined,
        error: randomType === 'error' ? 'Sample error message' : undefined,
        data: {
          timestamp: Date.now(),
          source: 'test',
          metadata: { test: true }
        }
      };

      // Add timestamp when event is received (simulating the real implementation)
      const eventWithTimestamp = {
        ...mockEvent,
        _receivedAt: Date.now()
      };

      setEvents(prev => [eventWithTimestamp, ...prev].slice(0, 500));
    }, 2000); // Add a new event every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">SSE Debug Panel Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Information</h2>
          <p className="text-gray-300 mb-2">
            This page demonstrates the SSE Debug Panel component that shows real-time SSE events (excluding heartbeats).
          </p>
          <p className="text-gray-300 mb-2">
            <strong>Events received:</strong> {events.length}
          </p>
          <p className="text-gray-300 mb-4">
            The debug panel appears as a collapsible overlay in the top-right corner that expands to full viewport height.
          </p>
          
          <div className="bg-gray-700 rounded p-4">
            <h3 className="font-semibold mb-2">Features:</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>Fixed position top-right overlay</li>
              <li>Full viewport height when expanded</li>
              <li>Collapsible with click to expand/collapse</li>
              <li>Quick filter dropdown by event type</li>
              <li>Shows event count in header (filtered count)</li>
              <li>Displays timestamp and event type</li>
              <li>Full JSON representation of each event</li>
              <li>Limits to 200 most recent events</li>
              <li>Only visible in development builds</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
          <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
            {events.slice(0, 10).map((event, idx) => (
              <div key={idx} className="mb-4 p-3 bg-gray-700 rounded">
                <div className="text-sm text-gray-400 mb-1">
                  {(event as any)._receivedAt ? new Date((event as any)._receivedAt).toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  }) + '.' + String((event as any)._receivedAt % 1000).padStart(3, '0') : 'No timestamp'} | {event.type}
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-gray-400 text-center">No events yet. Events will appear automatically...</p>
            )}
          </div>
        </div>
      </div>

      {/* The SSE Debug Panel - this is what we're testing */}
      <SSEEventDebugPanel events={events} />
    </div>
  );
};

export default SSEDebugTest;