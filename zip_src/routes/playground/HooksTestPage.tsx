/**
 * HooksTestPage - Isolated testing environment for canonical store hooks
 */

import React, { useState, useEffect } from 'react';
import { useEventStore } from '@/stores/eventStore';
import { useTimelineEvents } from '@/selectors/canonical/useTimelineEvents';
import { useCanonicalChatUI } from '@/hooks/useCanonicalChatUI';
import type { CanonicalEvent } from '@/types/events';

export default function HooksTestPage() {
  const [testSessionId, setTestSessionId] = useState<string>('test-session-123');
  const [refinedMode, setRefinedMode] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);

  // Test 1: Direct event store access
  const eventStore = useEventStore();
  const allEvents = eventStore.getAllEvents();
  const sessionIds = eventStore.getSessionIds();
  const eventCount = eventStore.getEventCount();
  const debugInfo = eventStore.getDebugInfo();

  // Test 2: Timeline events selector
  let timelineEvents: any[] = [];
  let timelineError: string | null = null;
  
  try {
    timelineEvents = useTimelineEvents(testSessionId, { refined: refinedMode });
  } catch (err) {
    timelineError = err instanceof Error ? err.message : String(err);
  }

  // Test 3: Canonical Chat UI hook
  let chatHook: any = null;
  let chatError: string | null = null;
  
  try {
    chatHook = useCanonicalChatUI({
      autoInitialize: true,
      debug: true
    });
  } catch (err) {
    chatError = err instanceof Error ? err.message : String(err);
  }

  // Test adding events to the store
  const addTestEvent = () => {
    const testEvent: CanonicalEvent = {
      id: `test-${Date.now()}`,
      sessionId: testSessionId,
      kind: 'message',
      role: 'user',
      content: [{ type: 'text', text: 'Test message ' + new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      source: 'supabase'
    };

    console.log('[HooksTest] Adding test event:', testEvent);
    eventStore.addEvent(testEvent);
  };

  const addToolCallEvent = () => {
    const toolCallEvent: CanonicalEvent = {
      id: `tool-call-${Date.now()}`,
      sessionId: testSessionId,
      kind: 'tool_call',
      role: 'assistant',
      content: [{ 
        type: 'tool_use', 
        id: `tool-use-${Date.now()}`,
        name: 'think',
        input: { thought: 'Testing tool call event' }
      }],
      toolUseId: `tool-use-${Date.now()}`,
      name: 'think',
      createdAt: new Date().toISOString(),
      source: 'sse'
    };

    console.log('[HooksTest] Adding tool call event:', toolCallEvent);
    eventStore.addEvent(toolCallEvent);
  };

  const clearAllEvents = () => {
    console.log('[HooksTest] Clearing all events');
    eventStore.clearAll();
  };

  // Log hook states on mount and updates
  useEffect(() => {
    console.log('[HooksTest] Component mounted');
    console.log('[HooksTest] Canonical store enabled:', import.meta.env.VITE_CANONICAL_STORE);
    console.log('[HooksTest] Event store state:', {
      eventCount,
      sessionIds,
      debugInfo,
      allEvents: allEvents.slice(0, 5) // First 5 events
    });
  }, [eventCount, sessionIds, debugInfo, allEvents]);

  useEffect(() => {
    console.log('[HooksTest] Timeline events updated:', {
      count: timelineEvents.length,
      events: timelineEvents.slice(0, 3),
      error: timelineError
    });
  }, [timelineEvents, timelineError]);

  useEffect(() => {
    if (chatHook) {
      console.log('[HooksTest] Chat hook state:', {
        isInitialized: chatHook.isInitialized,
        isConnected: chatHook.isConnected,
        currentSessionId: chatHook.currentSessionId,
        messages: chatHook.messages?.slice(0, 3),
        error: chatHook.error
      });
    }
  }, [chatHook]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="bg-gray-900 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Canonical Store Hooks Test Page</h1>
        
        {/* Environment Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded">
          <h2 className="text-lg font-semibold mb-2">Environment Status</h2>
          <div className="space-y-1 text-sm">
            <div>
              Canonical Store Enabled: 
              <span className={`ml-2 font-mono ${import.meta.env.VITE_CANONICAL_STORE ? 'text-green-400' : 'text-red-400'}`}>
                {String(import.meta.env.VITE_CANONICAL_STORE || 'false')}
              </span>
            </div>
            <div>
              NODE_ENV: <span className="ml-2 font-mono text-blue-400">{process.env.NODE_ENV}</span>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-6 p-4 bg-gray-800 rounded">
          <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm">Test Session ID:</label>
              <input
                type="text"
                value={testSessionId}
                onChange={(e) => setTestSessionId(e.target.value)}
                className="px-3 py-1 bg-gray-700 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm">Refined Mode:</label>
              <input
                type="checkbox"
                checked={refinedMode}
                onChange={(e) => setRefinedMode(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addTestEvent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Add Test Message
              </button>
              <button
                onClick={addToolCallEvent}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
              >
                Add Tool Call
              </button>
              <button
                onClick={clearAllEvents}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Clear All Events
              </button>
            </div>
          </div>
        </div>

        {/* Hook Test Results */}
        <div className="space-y-6">
          {/* Event Store Test */}
          <div className="p-4 bg-gray-800 rounded">
            <h2 className="text-lg font-semibold mb-2">1. Event Store (Direct Access)</h2>
            <div className="space-y-2 text-sm">
              <div>Total Events: <span className="font-mono text-green-400">{eventCount}</span></div>
              <div>Session IDs: <span className="font-mono text-blue-400">{JSON.stringify(sessionIds)}</span></div>
              <div>Debug Info: <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre></div>
              {allEvents.length > 0 && (
                <div>
                  <div className="mt-2">First 3 Events:</div>
                  <pre className="mt-1 p-2 bg-gray-900 rounded text-xs overflow-auto">
                    {JSON.stringify(allEvents.slice(0, 3), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Events Test */}
          <div className="p-4 bg-gray-800 rounded">
            <h2 className="text-lg font-semibold mb-2">2. useTimelineEvents Hook</h2>
            {timelineError ? (
              <div className="text-red-400">
                <div className="font-semibold">Error:</div>
                <pre className="mt-1 p-2 bg-gray-900 rounded text-xs">{timelineError}</pre>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  Timeline Events for session "{testSessionId}": 
                  <span className="ml-2 font-mono text-green-400">{timelineEvents.length}</span>
                </div>
                <div>Refined Mode: <span className="font-mono text-blue-400">{String(refinedMode)}</span></div>
                {timelineEvents.length > 0 && (
                  <div>
                    <div className="mt-2">First 3 Timeline Events:</div>
                    <pre className="mt-1 p-2 bg-gray-900 rounded text-xs overflow-auto">
                      {JSON.stringify(timelineEvents.slice(0, 3), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Canonical Chat UI Test */}
          <div className="p-4 bg-gray-800 rounded">
            <h2 className="text-lg font-semibold mb-2">3. useCanonicalChatUI Hook</h2>
            {chatError ? (
              <div className="text-red-400">
                <div className="font-semibold">Error:</div>
                <pre className="mt-1 p-2 bg-gray-900 rounded text-xs">{chatError}</pre>
              </div>
            ) : chatHook ? (
              <div className="space-y-2 text-sm">
                <div>Initialized: <span className="font-mono text-green-400">{String(chatHook.isInitialized)}</span></div>
                <div>Connected: <span className="font-mono text-green-400">{String(chatHook.isConnected)}</span></div>
                <div>Current Session: <span className="font-mono text-blue-400">{chatHook.currentSessionId || 'none'}</span></div>
                <div>Messages: <span className="font-mono text-green-400">{chatHook.messages?.length || 0}</span></div>
                <div>Error: <span className="font-mono text-red-400">{chatHook.error || 'none'}</span></div>
                {chatHook.messages && chatHook.messages.length > 0 && (
                  <div>
                    <div className="mt-2">First 3 Messages:</div>
                    <pre className="mt-1 p-2 bg-gray-900 rounded text-xs overflow-auto">
                      {JSON.stringify(chatHook.messages.slice(0, 3), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-yellow-400">Hook not initialized</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded">
          <h3 className="text-lg font-semibold mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Check if VITE_CANONICAL_STORE is enabled (should be green)</li>
            <li>Click "Add Test Message" to add events to the store</li>
            <li>Verify events appear in the Event Store section</li>
            <li>Check if useTimelineEvents shows the events</li>
            <li>Toggle "Refined Mode" to test the selector</li>
            <li>Change the session ID to test filtering</li>
            <li>Check browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}