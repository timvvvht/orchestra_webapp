import React, { useState, useEffect } from 'react';
import { MockACSStreamingService } from '@/services/acs/streaming/MockACSStreamingService';
import { mockOrchestraEvents, mockSSEFrames } from '@/debug/mockMoonBowlSession';
import { defaultACSConfig } from '@/services/acs/shared/client';
import type { SSEEvent } from '@/services/acs/shared/types';

export default function SSEMockDebugPage() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [mockService, setMockService] = useState<MockACSStreamingService | null>(null);
  const [useOrchestraFormat, setUseOrchestraFormat] = useState(true);

  useEffect(() => {
    console.log('🎭 [SSEMockDebugPage] Initializing mock streaming service');
    
    const config = {
      baseUrl: 'http://localhost:3000',
      sseUrl: 'http://localhost:3001',
      ...defaultACSConfig
    };

    const eventsToUse = useOrchestraFormat ? mockOrchestraEvents : mockSSEFrames;
    const service = new MockACSStreamingService(config, eventsToUse);
    setMockService(service);

    // Set up event handlers
    const unsubscribeConnection = service.onConnectionChange((connected) => {
      console.log('🎭 [SSEMockDebugPage] Connection status changed:', connected);
      setIsConnected(connected);
    });

    const unsubscribeEvents = service.onEvent((event) => {
      console.log('🎭 [SSEMockDebugPage] Event received:', event);
      setEvents(prev => [{ ...event, _timestamp: Date.now() }, ...prev].slice(0, 50));
    });

    return () => {
      console.log('🎭 [SSEMockDebugPage] Cleaning up');
      unsubscribeConnection();
      unsubscribeEvents();
      service.disconnect();
    };
  }, [useOrchestraFormat]);

  const handleConnect = async () => {
    if (mockService) {
      try {
        console.log('🎭 [SSEMockDebugPage] Connecting to mock service');
        await mockService.connect('test-session-123');
        console.log('🎭 [SSEMockDebugPage] Connected successfully');
      } catch (error) {
        console.error('🎭 [SSEMockDebugPage] Connection failed:', error);
      }
    }
  };

  const handleDisconnect = async () => {
    if (mockService) {
      console.log('🎭 [SSEMockDebugPage] Disconnecting from mock service');
      await mockService.disconnect();
      setEvents([]);
    }
  };

  const handleClearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎭 SSE Mock Debug Page</h1>
        
        {/* Controls */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <button
              onClick={handleConnect}
              disabled={isConnected}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
            >
              Connect
            </button>
            
            <button
              onClick={handleDisconnect}
              disabled={!isConnected}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
            >
              Disconnect
            </button>
            
            <button
              onClick={handleClearEvents}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              Clear Events
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useOrchestraFormat}
                onChange={(e) => setUseOrchestraFormat(e.target.checked)}
                className="rounded"
              />
              Use Orchestra Event Format
            </label>
            
            <span className="text-sm text-gray-400">
              Events: {useOrchestraFormat ? mockOrchestraEvents.length : mockSSEFrames.length}
            </span>
          </div>
        </div>

        {/* Event Display */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">SSE Events ({events.length})</h2>
            <span className="text-sm text-gray-400">
              Most recent events first
            </span>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No events received yet. Click "Connect" to start receiving mock events.
              </div>
            ) : (
              events.map((event, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded p-3 text-sm font-mono"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-400 font-semibold">
                      {event.type}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date((event as any)._timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-gray-300">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {event.sessionId && (
                        <div>
                          <span className="text-gray-500">Session:</span> {event.sessionId}
                        </div>
                      )}
                      {event.messageId && (
                        <div>
                          <span className="text-gray-500">Message:</span> {event.messageId}
                        </div>
                      )}
                    </div>
                    
                    {event.delta && (
                      <div className="mt-2">
                        <span className="text-gray-500">Delta:</span>
                        <div className="bg-gray-700 rounded p-2 mt-1">
                          {event.delta}
                        </div>
                      </div>
                    )}
                    
                    {event.toolCall && (
                      <div className="mt-2">
                        <span className="text-gray-500">Tool Call:</span>
                        <div className="bg-gray-700 rounded p-2 mt-1">
                          <div><strong>{event.toolCall.name}</strong></div>
                          <pre className="text-xs mt-1 overflow-x-auto">
                            {JSON.stringify(event.toolCall.arguments, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {event.result && (
                      <div className="mt-2">
                        <span className="text-gray-500">Result:</span>
                        <div className="bg-gray-700 rounded p-2 mt-1">
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(event.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {event.error && (
                      <div className="mt-2">
                        <span className="text-red-400">Error:</span>
                        <div className="bg-red-900/20 border border-red-500/20 rounded p-2 mt-1">
                          {event.error}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}