/* eslint-env browser */
/* eslint-disable no-undef */
import { useEffect, useState } from "react";
import { supabase } from "@/auth/SupabaseClient";

interface SSEEvent {
  timestamp: string;
  data: string;
  userId: string;
}

export default function UserSSETestPanel() {
  const [userId, setUserId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Auto-fill current user's ID on component mount
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        console.log(`[UserSSETestPanel] Auto-filled user ID: ${session.user.id}`);
      }
    })();
  }, []);

  const connectToUserStream = () => {
    if (!userId.trim()) {
      alert("Please enter a User ID");
      return;
    }

    // Disconnect existing connection if any
    if (eventSource) {
      eventSource.close();
    }

    setConnectionStatus("Connecting...");
    setEvents([]); // Clear previous events

    const baseUrl = import.meta.env.VITE_SSE_BASE_URL;
    const cleanUserId = userId.trim();
    const url = `${baseUrl}/sse/user/${encodeURIComponent(cleanUserId)}`;
    
    console.log(`\n🚀 [UserSSETestPanel] ===== INITIATING SSE CONNECTION =====`);
    console.log(`[UserSSETestPanel] 🔗 VITE_SSE_BASE_URL:`, baseUrl);
    console.log(`[UserSSETestPanel] 🔗 User ID:`, cleanUserId);
    console.log(`[UserSSETestPanel] 🔗 Full URL:`, url);
    console.log(`[UserSSETestPanel] 🔗 Connection method: Native EventSource (NO AUTH)`);
    console.log(`[UserSSETestPanel] 🔗 Cloud E2E Testing Mode: ${baseUrl.includes('fly.dev') ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[UserSSETestPanel] 🔗 Connection timestamp:`, new Date().toISOString());
    console.log(`[UserSSETestPanel] 🔗 Attempting EventSource connection...`);
    console.log(`[UserSSETestPanel] ===== CONNECTION ATTEMPT STARTED =====\n`);

    // Use native EventSource (same as working SSEDebug component)
    const es = new EventSource(url);
    setEventSource(es);

    es.onopen = (event) => {
      setIsConnected(true);
      setConnectionStatus("Connected");
      console.log(`\n🎉 [UserSSETestPanel] ===== SSE CONNECTION OPENED =====`);
      console.log(`[UserSSETestPanel] ✅ Connected to user ${userId} stream`);
      console.log(`[UserSSETestPanel] ✅ Connection URL:`, url);
      console.log(`[UserSSETestPanel] ✅ Connection event:`, event);
      console.log(`[UserSSETestPanel] ✅ EventSource readyState:`, es.readyState);
      console.log(`[UserSSETestPanel] ✅ EventSource URL:`, es.url);
      console.log(`[UserSSETestPanel] ✅ Connection timestamp:`, new Date().toISOString());
      console.log(`[UserSSETestPanel] ✅ Auth mode: NO AUTH (native EventSource)`);
      console.log(`[UserSSETestPanel] ===== CONNECTION READY FOR EVENTS =====\n`);
    };

    es.onmessage = (event) => {
      // 🚨 COMPREHENSIVE EVENT LOGGING FOR E2E TESTING 🚨
      console.log(`\n🎯 [UserSSETestPanel] ===== NEW SSE EVENT RECEIVED =====`);
      console.log(`[UserSSETestPanel] 📨 RAW MESSAGE RECEIVED:`, event);
      console.log(`[UserSSETestPanel] 📨 Event data (raw):`, event.data);
      console.log(`[UserSSETestPanel] 📨 Event type:`, event.type);
      console.log(`[UserSSETestPanel] 📨 Event lastEventId:`, event.lastEventId);
      console.log(`[UserSSETestPanel] 📨 Event origin:`, event.origin);
      console.log(`[UserSSETestPanel] 📨 Event timestamp:`, new Date().toISOString());
      
      // Try to parse the event data as JSON for better logging
      let parsedData = null;
      try {
        parsedData = JSON.parse(event.data);
        console.log(`[UserSSETestPanel] 📨 Parsed event data:`, parsedData);
        console.log(`[UserSSETestPanel] 📨 Event type from data:`, parsedData.event_type);
        console.log(`[UserSSETestPanel] 📨 Session ID:`, parsedData.session_id);
        console.log(`[UserSSETestPanel] 📨 Event ID:`, parsedData.event_id);
        console.log(`[UserSSETestPanel] 📨 Event payload:`, parsedData.data);
      } catch (e) {
        console.log(`[UserSSETestPanel] 📨 Could not parse event data as JSON:`, e);
        console.log(`[UserSSETestPanel] 📨 Raw data:`, event.data);
      }
      
      const timestamp = new Date().toISOString();
      const newEvent: SSEEvent = {
        timestamp,
        data: event.data,
        userId: userId.trim()
      };
      
      console.log(`[UserSSETestPanel] 📨 Creating UI event object:`, newEvent);
      
      setEvents(prevEvents => {
        const updated = [...prevEvents, newEvent].slice(-100);
        console.log(`[UserSSETestPanel] 📨 Updated events array (${updated.length} events):`, updated);
        console.log(`[UserSSETestPanel] 📨 Latest event in array:`, updated[updated.length - 1]);
        return updated;
      });
      
      console.log(`[UserSSETestPanel] 📨 Event successfully added to UI state`);
      console.log(`[UserSSETestPanel] ===== END EVENT PROCESSING =====\n`);
    };

    es.onerror = (error) => {
      console.error(`\n💥 [UserSSETestPanel] ===== SSE CONNECTION ERROR =====`);
      console.error(`[UserSSETestPanel] ❌ SSE Error:`, error);
      console.error(`[UserSSETestPanel] ❌ EventSource readyState:`, es.readyState);
      console.error(`[UserSSETestPanel] ❌ EventSource url:`, es.url);
      console.error(`[UserSSETestPanel] ❌ Connection URL:`, url);
      console.error(`[UserSSETestPanel] ❌ User ID:`, userId);
      console.error(`[UserSSETestPanel] ❌ Base URL:`, baseUrl);
      console.error(`[UserSSETestPanel] ❌ Error timestamp:`, new Date().toISOString());
      console.error(`[UserSSETestPanel] ❌ ReadyState meanings: 0=CONNECTING, 1=OPEN, 2=CLOSED`);
      console.error(`[UserSSETestPanel] ===== ERROR DETAILS END =====\n`);
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
    console.log(`[UserSSETestPanel] Manually disconnected`);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const testConnection = () => {
    console.log(`[UserSSETestPanel] 🧪 Testing connection manually...`);
    console.log(`[UserSSETestPanel] 🧪 EventSource state:`, eventSource?.readyState);
    console.log(`[UserSSETestPanel] 🧪 EventSource URL:`, eventSource?.url);
    console.log(`[UserSSETestPanel] 🧪 Is connected:`, isConnected);
    console.log(`[UserSSETestPanel] 🧪 Current events:`, events);
    
    // Add a test event to see if the UI updates
    const testEvent: SSEEvent = {
      timestamp: new Date().toISOString(),
      data: `{"type": "test", "message": "Manual test event", "timestamp": ${Date.now()}}`,
      userId: userId
    };
    setEvents(prev => [...prev, testEvent]);
    console.log(`[UserSSETestPanel] 🧪 Added test event:`, testEvent);
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
        <h1 className="text-2xl font-bold mb-6">User SSE Stream Test Panel</h1>
        
        {/* Info Banner */}
        <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2 text-green-300">✅ Authentication Disabled - Cloud E2E Testing</h2>
          <p className="text-green-200 text-sm mb-2">
            🚀 <strong>Cloud E2E Testing Mode:</strong> Connecting to {import.meta.env.VITE_SSE_BASE_URL}
          </p>
          <p className="text-green-200 text-sm mb-2">
            🔓 <strong>No Authentication:</strong> Using native EventSource without JWT headers
          </p>
          <p className="text-green-200 text-sm">
            📊 <strong>Console Logging:</strong> Every event will be logged with full details for debugging
          </p>
        </div>
        
        {/* Connection Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Connection Controls</h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="userId" className="text-sm font-medium">
                User ID:
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID to subscribe to their stream"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnected}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={connectToUserStream}
                disabled={isConnected || !userId.trim()}
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
              
              <button
                onClick={testConnection}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-medium transition-colors"
              >
                🧪 Debug Test
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
              Event Stream {userId && `(User: ${userId})`}
            </h2>
            <span className="text-sm text-gray-400">
              {events.length} events (last 100 shown)
            </span>
          </div>
          
          <div className="bg-black rounded-md p-4 h-96 overflow-y-auto font-mono text-sm">
            {events.length === 0 ? (
              <div className="text-gray-500 italic">
                No events received yet. Connect to a user stream to see events.
              </div>
            ) : (
              events.map((event, index) => (
                <div key={index} className="mb-2 border-b border-gray-700 pb-2">
                  <div className="text-gray-400 text-xs mb-1">
                    [{event.timestamp}] User: {event.userId}
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
          <h2 className="text-lg font-semibold mb-2">Usage Instructions</h2>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Enter a User ID in the input field above</li>
            <li>• Click "Connect" to subscribe to that user's SSE stream</li>
            <li>• Events will appear in real-time in the stream display</li>
            <li>• Use "Disconnect" to stop the stream</li>
            <li>• Use "Clear Events" to clear the event history</li>
            <li>• Auto-fills with your current user ID when logged in</li>
            <li>• No authentication required - works with any user ID</li>
          </ul>
        </div>
      </div>
    </div>
  );
}