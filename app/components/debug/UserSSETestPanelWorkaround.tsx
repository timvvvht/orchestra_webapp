/* eslint-env browser */
/* eslint-disable no-undef */
import { useEffect, useState } from "react";

interface SSEEvent {
  timestamp: string;
  data: string;
  eventType: string;
}

export default function UserSSETestPanelWorkaround() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("firehose");

  // Available endpoints that work without authentication
  const endpoints = {
    firehose: {
      url: "/sse",
      name: "Global Firehose (All Events)",
      description: "Shows all events from all sessions - no authentication required"
    },
    session: {
      url: "/sse/test-session-123",
      name: "Session Stream (test-session-123)",
      description: "Shows events for a specific session - no authentication required"
    }
  };

  const connectToStream = () => {
    // Disconnect existing connection if any
    if (eventSource) {
      eventSource.close();
    }

    const baseUrl = import.meta.env.VITE_SSE_BASE_URL?.replace(/\/$/, '') || '';
    const endpoint = endpoints[selectedEndpoint as keyof typeof endpoints];
    const url = `${baseUrl}${endpoint.url}`;
    
    console.log(`[UserSSETestPanelWorkaround] Connecting to: ${url}`);
    setConnectionStatus("Connecting...");
    setEvents([]); // Clear previous events

    // Use native EventSource (same as working SSEDebug component)
    const es = new EventSource(url);
    setEventSource(es);

    es.onopen = () => {
      setIsConnected(true);
      setConnectionStatus("Connected");
      console.log(`[UserSSETestPanelWorkaround] Connected to ${url}`);
    };

    es.onmessage = (event) => {
      const timestamp = new Date().toISOString();
      let eventType = "message";
      
      // Try to parse the event to get more info
      try {
        const parsed = JSON.parse(event.data);
        eventType = parsed.event_type || parsed.type || "message";
      } catch {
        // Not JSON, just use default
      }

      const newEvent: SSEEvent = {
        timestamp,
        data: event.data,
        eventType
      };
      
      setEvents(prevEvents => [...prevEvents, newEvent].slice(-100)); // Keep last 100 events
      console.log(`[UserSSETestPanelWorkaround] Received event:`, newEvent);
    };

    es.onerror = (error) => {
      console.error(`[UserSSETestPanelWorkaround] SSE Error:`, error);
      setConnectionStatus("Error - Check console for details");
      setIsConnected(false);
    };
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsConnected(false);
    setConnectionStatus("Disconnected");
    console.log(`[UserSSETestPanelWorkaround] Manually disconnected`);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getStatusColor = () => {
    if (connectionStatus === "Connected") return "text-green-400";
    if (connectionStatus.startsWith("Error") || connectionStatus.startsWith("Failed")) return "text-red-400";
    if (connectionStatus === "Connecting...") return "text-yellow-400";
    return "text-gray-400";
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">SSE Stream Test Panel (Workaround)</h1>
        
        {/* Info Banner */}
        <div className="bg-blue-900/50 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2 text-blue-300">🔧 CORS Workaround</h2>
          <p className="text-blue-200 text-sm mb-2">
            This component uses the same pattern as the working SSEDebug component - native EventSource without authentication.
            This avoids CORS preflight issues while the backend fix is being deployed.
          </p>
          <p className="text-blue-200 text-sm">
            <strong>Note:</strong> User-specific streams require authentication and will work once the backend CORS fix is deployed.
          </p>
        </div>
        
        {/* Connection Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Connection Controls</h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="endpoint" className="text-sm font-medium">
                Select SSE Endpoint:
              </label>
              <select
                id="endpoint"
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnected}
              >
                {Object.entries(endpoints).map(([key, endpoint]) => (
                  <option key={key} value={key}>
                    {endpoint.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-400">
                {endpoints[selectedEndpoint as keyof typeof endpoints]?.description}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={connectToStream}
                disabled={isConnected}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                Connect
              </button>
              
              <button
                onClick={disconnect}
                disabled={!isConnected}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                Disconnect
              </button>
              
              <button
                onClick={clearEvents}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-medium transition-colors"
              >
                Clear Events
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <span className={`text-sm font-mono ${getStatusColor()}`}>
                {connectionStatus}
              </span>
              {isConnected && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-2"></div>
              )}
            </div>
          </div>
        </div>

        {/* Event Stream Display */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Event Stream ({endpoints[selectedEndpoint as keyof typeof endpoints]?.name})
            </h2>
            <span className="text-sm text-gray-400">
              {events.length} events (last 100 shown)
            </span>
          </div>
          
          <div className="bg-black rounded-md p-4 h-96 overflow-y-auto font-mono text-sm">
            {events.length === 0 ? (
              <div className="text-gray-500 italic">
                No events received yet. Connect to an SSE stream to see events.
              </div>
            ) : (
              events.map((event, index) => (
                <div key={index} className="mb-2 border-b border-gray-700 pb-2">
                  <div className="text-gray-400 text-xs mb-1">
                    [{event.timestamp}] Type: {event.eventType}
                  </div>
                  <div className="text-green-400 break-all">
                    {event.data}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-gray-800 rounded-lg p-4 mt-6">
          <h2 className="text-lg font-semibold mb-2">How This Works</h2>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Global Firehose:</strong> Shows all events from all sessions (same as SSEDebug page)</li>
            <li>• <strong>Session Stream:</strong> Shows events for a specific session ID</li>
            <li>• <strong>No Authentication:</strong> These endpoints work without JWT tokens</li>
            <li>• <strong>No CORS Issues:</strong> Uses native EventSource like the working SSEDebug component</li>
            <li>• <strong>Real-time:</strong> Events appear as they happen in the system</li>
          </ul>
          
          <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 text-sm">
              <strong>For User-Specific Streams:</strong> Once the backend CORS fix is deployed, 
              the original UserSSETestPanel will work for user-specific authenticated streams.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}