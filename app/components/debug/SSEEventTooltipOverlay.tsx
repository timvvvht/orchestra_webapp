import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { eventBus } from "@/services/acs/eventBus";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface SSEEvent {
  id: string;
  type: string;
  summary: string;
  fullData: any;
  timestamp: number;
  timeString: string;
}

interface SSEDebugEntry {
  timestamp: number;
  kind: string;
  event?: any;
  unified?: any;
  canonicalEvent?: any;
  eventId?: string;
  sessionId?: string;
  messageId?: string;
  reason?: string;
  error?: string;
  [key: string]: any;
}

interface LiveTooltip {
  id: string;
  text: string;
  createdAt: number;
}

const TTL = 3500; // ms each tooltip stays visible
const MAX_HISTORY = 100; // keep last 100 events

// Extend window interface for TypeScript
declare global {
  interface Window {
    __SSE_HISTORY?: SSEDebugEntry[];
  }
}

export default function SSEEventTooltipOverlay() {
  const [tips, setTips] = useState<LiveTooltip[]>([]);
  const [history, setHistory] = useState<SSEDebugEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  /* Poll window.__SSE_HISTORY for updates */
  useEffect(() => {
    const pollHistory = () => {
      if (window.__SSE_HISTORY && window.__SSE_HISTORY.length > 0) {
        // Sort by timestamp (newest first) and take last 1000 entries
        const sortedHistory = [...window.__SSE_HISTORY]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 1000);
        
        setHistory(sortedHistory);
        
        // Create tooltips for recent raw_in events
        const recentRawEvents = sortedHistory
          .filter(entry => entry.kind === 'raw_in' && Date.now() - entry.timestamp < TTL)
          .slice(0, 5); // Show max 5 recent tooltips
        
        const newTips = recentRawEvents.map(entry => {
          const event = entry.event;
          const summary = event?.type === "chunk"
            ? event.data?.content 
              ? `complete: ${event.data.content.slice(0, 60)}...`
              : `chunk: ${event.delta?.slice(0, 60)}`
            : event?.type === "tool_call"
            ? `tool_call: ${event.toolCall?.name || event.data?.tool_call?.name}`
            : event?.type === "error"
            ? `error: ${event.error?.message || 'Unknown error'}`
            : event?.type === "done"
            ? "stream complete"
            : event?.type || entry.kind;
          
          return {
            id: `${entry.timestamp}-${Math.random()}`,
            text: summary,
            createdAt: entry.timestamp
          };
        });
        
        setTips(newTips);
      } else {
        // Initialize empty history if none exists
        setHistory([]);
        setTips([]);
      }
    };

    // Poll every 500ms
    const interval = setInterval(pollHistory, 500);
    
    // Initial poll
    pollHistory();
    
    return () => clearInterval(interval);
  }, []);

  /* age-out old tooltips every 500 ms */
  useEffect(() => {
    const t = setInterval(() => {
      setTips((cur) => cur.filter((t) => Date.now() - t.createdAt < TTL));
    }, 500);
    return () => clearInterval(t);
  }, []);

  /* render into portal so it's outside layout flow */
  return createPortal(
    <div>
      <TooltipProvider>
        {/* Live tooltips */}
        {tips.map((tip) => (
          <Tooltip key={tip.id} open>
            <TooltipTrigger asChild>
              {/* invisible anchor fixed to top-right, stacked */}
              <div
                style={{
                  position: "fixed",
                  top: 12 + tips.indexOf(tip) * 26,
                  right: 12,
                  width: 0,
                  height: 0,
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="left" size="sm">
              {tip.text}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>

      {/* History toggle button */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        style={{
          position: "fixed",
          top: 12,
          right: 200,
          zIndex: 9999,
          padding: "4px 8px",
          fontSize: "12px",
          backgroundColor: showHistory ? "#3b82f6" : "#374151",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        SSE History ({history.length})
        {window.__SSE_HISTORY && (
          <span style={{ fontSize: "10px", marginLeft: "4px", color: "#10b981" }}>
            ●
          </span>
        )}
      </button>

      {/* History panel */}
      {showHistory && (
        <div
          style={{
            position: "fixed",
            top: 50,
            right: 12,
            width: "400px",
            maxHeight: "500px",
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            zIndex: 9998,
            overflow: "hidden",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "#374151",
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
              borderBottom: "1px solid #4b5563",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span>SSE Event History</span>
              <div style={{ fontSize: "10px", fontWeight: "normal", color: "#9ca3af", marginTop: "2px" }}>
                {window.__SSE_HISTORY ? (
                  <span style={{ color: "#10b981" }}>
                    ● Connected to global debug history ({window.__SSE_HISTORY.length} total)
                  </span>
                ) : (
                  <span style={{ color: "#ef4444" }}>
                    ● No global history available
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => {
                  // Add test entries to verify connection
                  if (!window.__SSE_HISTORY) {
                    window.__SSE_HISTORY = [];
                  }
                  const testEntries = [
                    { timestamp: Date.now(), kind: 'raw_in', event: { type: 'test', sessionId: 'test-session' } },
                    { timestamp: Date.now() + 1, kind: 'unified_ok', unified: [{ type: 'test' }] },
                    { timestamp: Date.now() + 2, kind: 'store_add', canonicalEvent: { id: 'test' } },
                    { timestamp: Date.now() + 3, kind: 'skip_test', reason: 'test skip reason' }
                  ];
                  window.__SSE_HISTORY.push(...testEntries);
                }}
                style={{
                  padding: "2px 6px",
                  fontSize: "11px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                Test
              </button>
              <button
                onClick={() => {
                  if (window.__SSE_HISTORY) {
                    window.__SSE_HISTORY.length = 0;
                  }
                  setHistory([]);
                }}
                style={{
                  padding: "2px 6px",
                  fontSize: "11px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Event list */}
          <div
            style={{
              maxHeight: "450px",
              overflowY: "auto",
              padding: "4px",
            }}
          >
            {history.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: "12px",
                }}
              >
                No events yet...
              </div>
            ) : (
              history.map((entry) => {
                const timeString = new Date(entry.timestamp).toLocaleTimeString();
                const eventType = entry.event?.type || entry.kind;
                const summary = entry.reason 
                  ? `${entry.kind}: ${entry.reason}`
                  : entry.event?.type === "chunk"
                  ? entry.event.data?.content 
                    ? `complete: ${entry.event.data.content.slice(0, 60)}...`
                    : `chunk: ${entry.event.delta?.slice(0, 60)}`
                  : entry.event?.type === "tool_call"
                  ? `tool_call: ${entry.event.toolCall?.name || entry.event.data?.tool_call?.name}`
                  : entry.event?.type === "error"
                  ? `error: ${entry.event.error?.message || 'Unknown error'}`
                  : entry.event?.type === "done"
                  ? "stream complete"
                  : entry.kind;
                
                return (
                  <div
                    key={`${entry.timestamp}-${entry.kind}`}
                    style={{
                      padding: "6px 8px",
                      margin: "2px 0",
                      backgroundColor: "#374151",
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: "#e5e7eb",
                      borderLeft: `3px solid ${
                        entry.kind === "raw_in" ? "#3b82f6" :
                        entry.kind === "unified_ok" ? "#10b981" :
                        entry.kind === "store_add" ? "#f59e0b" :
                        entry.kind.startsWith("skip_") ? "#ef4444" :
                        eventType === "chunk" ? 
                          (entry.event?.data?.content ? "#f59e0b" : "#10b981") :
                        eventType === "tool_call" ? "#3b82f6" :
                        eventType === "error" ? "#ef4444" :
                        eventType === "done" ? "#8b5cf6" :
                        "#6b7280"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "2px",
                      }}
                    >
                      <span style={{ fontWeight: "bold", color: "#f3f4f6" }}>
                        {entry.kind}
                        {entry.sessionId && (
                          <span style={{ color: "#9ca3af", fontSize: "9px", marginLeft: "4px" }}>
                            ({entry.sessionId.slice(-8)})
                          </span>
                        )}
                      </span>
                      <span style={{ color: "#9ca3af", fontSize: "10px" }}>
                        {timeString}
                      </span>
                    </div>
                    <div style={{ color: "#d1d5db" }}>
                      {summary}
                    </div>
                    <details style={{ marginTop: "4px" }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          color: "#9ca3af",
                          fontSize: "10px",
                        }}
                      >
                        Raw data
                      </summary>
                      <pre
                        style={{
                          marginTop: "4px",
                          padding: "4px",
                          backgroundColor: "#1f2937",
                          borderRadius: "2px",
                          fontSize: "9px",
                          color: "#e5e7eb",
                          overflow: "auto",
                          maxHeight: "100px",
                        }}
                      >
                        {JSON.stringify(entry, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}