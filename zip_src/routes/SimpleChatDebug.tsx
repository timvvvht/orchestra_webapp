import React, { useState, useEffect, useRef } from 'react';
import { mockOrchestraEvents } from '@/debug/mockMoonBowlSession';

// Enhanced message types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ToolCall {
  id: string;
  name: string;
  input: any;
  timestamp: number;
}

interface ToolResult {
  id: string;
  toolName: string;
  result: any;
  ok: boolean;
  timestamp: number;
  error?: string;
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result';
  timestamp: number;
  data: Message | ToolCall | ToolResult;
}

// Enhanced mock SSE event processor
function processSSEEvent(eventData: string): { 
  type: string; 
  content?: string; 
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  done?: boolean 
} | null {
  try {
    const parsed = JSON.parse(eventData);
    
    if (parsed.type === 'agent_event' && parsed.payload) {
      const { event_type, data, message_id } = parsed.payload;
      
      switch (event_type) {
        case 'chunk':
          return { type: 'chunk', content: data.text || '' };
        case 'tool_call':
          return { 
            type: 'tool_call', 
            toolCall: {
              id: data.call_id,
              name: data.tool_name,
              input: data.tool_input,
              timestamp: Date.now()
            }
          };
        case 'tool_result':
          return { 
            type: 'tool_result', 
            toolResult: {
              id: data.call_id,
              toolName: data.tool_name,
              result: data.result,
              ok: data.success,
              timestamp: Date.now()
            }
          };
        case 'done':
          return { type: 'done', done: true };
        default:
          return null;
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

export default function SimpleChatDebug() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: 'user-1',
      type: 'message',
      timestamp: Date.now() - 10000,
      data: {
        id: 'user-1',
        role: 'user',
        content: 'go search online about moon bowls in sf, and write a brief doc about them into /tmp',
        timestamp: Date.now() - 10000
      }
    }
  ]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [showRealData, setShowRealData] = useState(false);
  const [realSessionData, setRealSessionData] = useState<TimelineEvent[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const REAL_SESSION_ID = '12fd54e9-5b07-4371-867d-6ec5aa7526ed';

  // Fetch real session data
  const fetchRealSessionData = async () => {
    setIsLoadingReal(true);
    try {
      // TODO: Replace with actual Orchestra API endpoint
      // For now, we'll simulate the API call and create sample real data
      console.log(`Attempting to fetch session: ${REAL_SESSION_ID}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, create sample real session data
      // In production, this would be: const response = await fetch(`/api/sessions/${REAL_SESSION_ID}/messages`);
      const sessionData = {
        session_id: REAL_SESSION_ID,
        messages: [
          {
            role: 'user',
            content: 'Can you help me understand how Orchestra works?',
            timestamp: '2024-01-15T10:00:00Z'
          },
          {
            role: 'assistant', 
            content: 'I\'d be happy to help you understand Orchestra! Orchestra is an AI agent orchestration platform that manages complex workflows.',
            timestamp: '2024-01-15T10:00:05Z'
          },
          {
            role: 'assistant',
            content: 'Let me search for more detailed information about Orchestra\'s architecture.',
            timestamp: '2024-01-15T10:00:10Z',
            tool_calls: [
              {
                id: 'call_1',
                function: {
                  name: 'search_documentation',
                  arguments: '{"query": "Orchestra AI platform architecture"}'
                },
                timestamp: '2024-01-15T10:00:12Z'
              }
            ]
          },
          {
            role: 'tool',
            tool_results: [
              {
                id: 'result_1',
                tool_name: 'search_documentation',
                result: 'Orchestra consists of ACS (Agent Core Service), TES (Tool Execution Service), and SSE Service for real-time communication.',
                success: true,
                timestamp: '2024-01-15T10:00:15Z'
              }
            ]
          },
          {
            role: 'assistant',
            content: 'Based on the documentation, Orchestra has three main components:\n\n1. **ACS (Agent Core Service)** - Orchestrates AI agent interactions\n2. **TES (Tool Execution Service)** - Provides secure tool execution\n3. **SSE Service** - Handles real-time event streaming\n\nThis creates a robust platform for building complex AI workflows.',
            timestamp: '2024-01-15T10:00:20Z'
          }
        ]
      };
      
      // Convert session data to timeline events
      const timelineEvents: TimelineEvent[] = [];
      
      // Process session messages and convert to timeline format
      if (sessionData.messages) {
        sessionData.messages.forEach((msg: any, index: number) => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            timelineEvents.push({
              id: `real-msg-${index}`,
              type: 'message',
              timestamp: new Date(msg.timestamp || Date.now()).getTime(),
              data: {
                id: `real-msg-${index}`,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp || Date.now()).getTime()
              }
            });
          }
          
          // Process tool calls if present
          if (msg.tool_calls) {
            msg.tool_calls.forEach((toolCall: any, tcIndex: number) => {
              timelineEvents.push({
                id: `real-tool-call-${index}-${tcIndex}`,
                type: 'tool_call',
                timestamp: new Date(toolCall.timestamp || Date.now()).getTime(),
                data: {
                  id: toolCall.id || `real-tool-call-${index}-${tcIndex}`,
                  name: toolCall.function?.name || toolCall.name,
                  input: toolCall.function?.arguments || toolCall.input,
                  timestamp: new Date(toolCall.timestamp || Date.now()).getTime()
                }
              });
            });
          }
          
          // Process tool results if present
          if (msg.tool_results) {
            msg.tool_results.forEach((toolResult: any, trIndex: number) => {
              timelineEvents.push({
                id: `real-tool-result-${index}-${trIndex}`,
                type: 'tool_result',
                timestamp: new Date(toolResult.timestamp || Date.now()).getTime(),
                data: {
                  id: toolResult.id || `real-tool-result-${index}-${trIndex}`,
                  toolName: toolResult.tool_name || toolResult.name,
                  result: toolResult.result || toolResult.content,
                  ok: toolResult.success !== false,
                  timestamp: new Date(toolResult.timestamp || Date.now()).getTime(),
                  error: toolResult.error
                }
              });
            });
          }
        });
      }
      
      // Sort by timestamp
      timelineEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      setRealSessionData(timelineEvents);
    } catch (error) {
      console.error('Failed to fetch real session data:', error);
      // Fallback: create a placeholder message
      setRealSessionData([{
        id: 'error-msg',
        type: 'message',
        timestamp: Date.now(),
        data: {
          id: 'error-msg',
          role: 'assistant',
          content: `Failed to load session ${REAL_SESSION_ID}. Error: ${error}`,
          timestamp: Date.now()
        }
      }]);
    } finally {
      setIsLoadingReal(false);
    }
  };

  // Toggle between mock and real data
  const handleToggleData = async () => {
    if (!showRealData && realSessionData.length === 0) {
      // First time switching to real data, fetch it
      await fetchRealSessionData();
    }
    setShowRealData(!showRealData);
    setIsStreaming(false); // Stop any ongoing simulation
  };

  // Get current timeline data based on toggle
  const currentTimeline = showRealData ? realSessionData : timeline;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline, realSessionData, showRealData]);

  // Start the mock SSE simulation (only in mock mode)
  useEffect(() => {
    if (showRealData) return; // Don't run simulation in real data mode
    
    const startSimulation = () => {
      setIsStreaming(true);
      setEventIndex(0);
      
      const processNextEvent = (index: number) => {
        if (index >= mockOrchestraEvents.length) {
          // Simulation complete
          setIsStreaming(false);
          return;
        }

        const eventData = mockOrchestraEvents[index];
        const processed = processSSEEvent(eventData);
        
        if (processed) {
          if (processed.type === 'chunk' && processed.content) {
            setTimeline(prev => [...prev, {
              id: `chunk-${Date.now()}-${Math.random()}`,
              type: 'message',
              timestamp: Date.now(),
              data: {
                id: `chunk-${Date.now()}-${Math.random()}`,
                role: 'assistant',
                content: processed.content,
                timestamp: Date.now()
              }
            }]);
          } else if (processed.type === 'tool_call' && processed.toolCall) {
            setTimeline(prev => [...prev, {
              id: `tool-call-${Date.now()}`,
              type: 'tool_call',
              timestamp: Date.now(),
              data: processed.toolCall!
            }]);
          } else if (processed.type === 'tool_result' && processed.toolResult) {
            setTimeline(prev => [...prev, {
              id: `tool-result-${Date.now()}`,
              type: 'tool_result',
              timestamp: Date.now(),
              data: processed.toolResult!
            }]);
          } else if (processed.type === 'done') {
            setIsStreaming(false);
            return;
          }
        }

        // Continue to next event
        setTimeout(() => processNextEvent(index + 1), 400);
      };

      // Start after a short delay
      setTimeout(() => processNextEvent(0), 1000);
    };

    // Auto-start simulation
    const timer = setTimeout(startSimulation, 2000);
    return () => clearTimeout(timer);
  }, [showRealData]);

  const handleRestart = () => {
    setTimeline([{
      id: 'user-1',
      type: 'message',
      timestamp: Date.now(),
      data: {
        id: 'user-1',
        role: 'user',
        content: 'go search online about moon bowls in sf, and write a brief doc about them into /tmp',
        timestamp: Date.now()
      }
    }]);
    setIsStreaming(true);
    setEventIndex(0);
    
    // Restart simulation
    setTimeout(() => {
      const processNextEvent = (index: number) => {
        if (index >= mockOrchestraEvents.length) {
          setIsStreaming(false);
          return;
        }

        const eventData = mockOrchestraEvents[index];
        const processed = processSSEEvent(eventData);
        
        if (processed) {
          if (processed.type === 'chunk' && processed.content) {
            setTimeline(prev => [...prev, {
              id: `chunk-${Date.now()}-${Math.random()}`,
              type: 'message',
              timestamp: Date.now(),
              data: {
                id: `chunk-${Date.now()}-${Math.random()}`,
                role: 'assistant',
                content: processed.content,
                timestamp: Date.now()
              }
            }]);
          } else if (processed.type === 'tool_call' && processed.toolCall) {
            setTimeline(prev => [...prev, {
              id: `tool-call-${Date.now()}`,
              type: 'tool_call',
              timestamp: Date.now(),
              data: processed.toolCall!
            }]);
          } else if (processed.type === 'tool_result' && processed.toolResult) {
            setTimeline(prev => [...prev, {
              id: `tool-result-${Date.now()}`,
              type: 'tool_result',
              timestamp: Date.now(),
              data: processed.toolResult!
            }]);
          } else if (processed.type === 'done') {
            setIsStreaming(false);
            return;
          }
        }

        setTimeout(() => processNextEvent(index + 1), 400);
      };

      processNextEvent(0);
    }, 500);
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Debug Header */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-yellow-400 font-medium">
              🎭 Debug Mode: {showRealData ? `Real Session ${REAL_SESSION_ID.slice(0, 8)}...` : 'Mock SSE Events'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleData}
              disabled={isLoadingReal}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showRealData 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              } ${isLoadingReal ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoadingReal ? 'Loading...' : showRealData ? '📡 Real Data' : '🎭 Mock Data'}
            </button>
            {!showRealData && (
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                Restart Simulation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline - All Events in Chronological Order */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {showRealData && currentTimeline.length > 0 && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-sm font-medium">
                📡 Displaying real session data from {REAL_SESSION_ID.slice(0, 8)}...
              </span>
            </div>
          </div>
        )}
        {currentTimeline.map((event) => {
          if (event.type === 'message') {
            const message = event.data as Message;
            return (
              <div
                key={event.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-60 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          } else if (event.type === 'tool_call') {
            const toolCall = event.data as ToolCall;
            return (
              <div key={event.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-purple-900/30 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-400 rounded-full" />
                    <span className="text-purple-300 font-medium">🔧 Tool Call: {toolCall.name}</span>
                  </div>
                  <div className="text-gray-300 text-sm">
                    <div className="font-mono bg-black/30 rounded p-2 mt-2">
                      {JSON.stringify(toolCall.input, null, 2)}
                    </div>
                  </div>
                  <div className="text-xs text-purple-400 mt-2">
                    {new Date(toolCall.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          } else if (event.type === 'tool_result') {
            const toolResult = event.data as ToolResult;
            return (
              <div key={event.id} className="flex justify-start">
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 border ${
                  toolResult.ok 
                    ? 'bg-green-900/30 border-green-500/30' 
                    : 'bg-red-900/30 border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      toolResult.ok ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className={`font-medium ${
                      toolResult.ok ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {toolResult.ok ? '✅' : '❌'} Tool Result: {toolResult.toolName}
                    </span>
                  </div>
                  <div className="text-gray-300 text-sm">
                    {toolResult.error && (
                      <div className="text-red-300 mb-2">
                        <strong>Error:</strong> {toolResult.error}
                      </div>
                    )}
                    {toolResult.result && (
                      <div className="font-mono bg-black/30 rounded p-2">
                        {typeof toolResult.result === 'string' 
                          ? toolResult.result 
                          : JSON.stringify(toolResult.result, null, 2)
                        }
                      </div>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${
                    toolResult.ok ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {new Date(toolResult.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}

        {/* Typing Indicator - Only show during mock simulation */}
        {isStreaming && !showRealData && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-800 text-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-gray-400">Processing events...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Simple Input (non-functional for demo) */}
      <div className="border-t border-gray-800 p-6">
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="This is a demo - input is disabled"
              disabled
              className="flex-1 bg-transparent text-gray-500 placeholder-gray-600 outline-none"
            />
            <button
              disabled
              className="px-4 py-2 bg-gray-700 text-gray-500 rounded-lg text-sm cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            🎭 Debug mode: Watch the mock SSE events replay automatically
          </div>
        </div>
      </div>
    </div>
  );
}