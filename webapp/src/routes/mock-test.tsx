import React, { useEffect } from "react";
import { ChatMainMockTest } from "@/components/chat-interface/ChatMainMockTest";

export default function MockTestRoute() {
  useEffect(() => {
    // Connect to SSE endpoint to receive events
    const eventSource = new EventSource('https://orchestra-sse-service.fly.dev/sse/user/f1948b82-7d6a-407e-860d-5a3acea11b8b');
    
    eventSource.onmessage = (event) => {
      console.log('SSE Event received:', event.data);
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
    };
    
    return () => eventSource.close();
  }, []);

  return (
    <div className="h-screen w-screen bg-black">
      <ChatMainMockTest sessionId="mock_session_123" />
    </div>
  );
}
