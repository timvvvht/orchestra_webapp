import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MobileChatInput } from "./MobileChatInput";
import { httpApi } from "@/api/httpApi";
import { useEventStore } from "@/stores/eventStore";
import { useSessionStatusStore } from "@/stores/sessionStatusStore";
import { ChatRole } from "@/types/chatTypes";

interface MockTestProps {
  sessionId?: string;
}

export const ChatMainMockTest: React.FC<MockTestProps> = ({
  sessionId = "mock_session_123",
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Mock event scenarios
  const mockScenarios = [
    { name: "Tool Execution", scenario: "tool_execution", delay: 300 },
    { name: "Streaming Response", scenario: "streaming_response", delay: 100 },
    { name: "Error Handling", scenario: "error_handling", delay: 500 },
  ];

  const sendMockRequest = async (scenario: string, delay: number) => {
    setIsLoading(true);

    try {
      // Add optimistic user message
      const userMessage = {
        id: `user-${Date.now()}`,
        sessionId,
        role: ChatRole.User,
        content: [{ type: "text", text: `Testing ${scenario}` }],
        createdAt: Date.now(),
        isStreaming: false,
      };

      useEventStore.getState().addEvent({
        id: userMessage.id,
        kind: "message",
        role: "user",
        content: [{ type: "text", text: `Testing ${scenario}` }],
        createdAt: new Date(userMessage.createdAt).toISOString(),
        sessionId,
        partial: false,
        source: "sse" as const,
      });

      // Mark session as awaiting
      useSessionStatusStore.getState().markAwaiting(sessionId);

      // Send mock request
      const response = await httpApi.POST(
        "https://orchestra-acs-web.fly.dev/acs/converse/mock",
        {
          headers: { "Content-Type": "application/json" },
          body: {
            session_id: sessionId,
            user_id: "f1948b82-7d6a-407e-860d-5a3acea11b8b",
            scenario,
            delay_ms: delay,
          },
        }
      );

      if (response?.ok) {
        console.log("✅ Mock request sent successfully", response.data);
      } else {
        throw new Error(`Mock request failed: ${response?.status}`);
      }
    } catch (error) {
      console.error("❌ Mock request failed:", error);
      useSessionStatusStore.getState().markError(sessionId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (message: string) => {
    if (!message.trim()) return;
    await sendMockRequest("custom_message", 200);
  };

  // Load events from store
  useEffect(() => {
    const unsubscribe = useEventStore.subscribe(() => {
      const state = useEventStore.getState();
      const eventIds = state.bySession.get(sessionId) || [];
      const events = eventIds.map((id) => state.byId.get(id)).filter(Boolean);
      setMessages([...events]);
    });
    return unsubscribe;
  }, [sessionId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <h2 className="text-white text-lg font-semibold">Mock Event Testing</h2>
        <p className="text-white/60 text-sm">Session: {sessionId}</p>
      </div>

      {/* Test Controls */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex gap-2 flex-wrap">
          {mockScenarios.map(({ name, scenario, delay }) => (
            <Button
              key={scenario}
              onClick={() => sendMockRequest(scenario, delay)}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="text-white border-white/20 hover:bg-white/10"
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {messages.map((event, index) => (
            <div key={event.id || index} className="bg-white/5 rounded-lg p-3">
              <div className="text-white/60 text-xs mb-1">
                {event.role} • {event.kind} •{" "}
                {new Date(event.createdAt).toLocaleTimeString()}
              </div>
              <div className="text-white">
                {Array.isArray(event.content)
                  ? event.content.map((c: any) => c.text || String(c)).join(" ")
                  : String(event.content)}
              </div>
              {event.partial && (
                <div className="text-yellow-400 text-xs mt-1">Streaming...</div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/10">
        <MobileChatInput
          disabled={isLoading}
          placeholder="Send test message..."
        />
      </div>
    </div>
  );
};
