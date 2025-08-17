import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  User,
  Bot,
  Brain,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Sparkles,
  SkipBack,
  SkipForward,
  Square,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Temporarily removed to use our own consistent design
// import { ThinkBlockDisplay } from '@/components/debug/ThinkBlockDisplay';
import { mockOrchestraEvents } from '@/debug/mockMoonBowlSession';
import { getDefaultACSClient, OrchestACSClient } from '@/services/acs';
import type { ChatMessage as ChatMessageType } from '@/types/chatTypes';
import { extractFileOperation } from '@/utils/timelineParser';

// 🎨 DESIGN SYSTEM - Cohesive and polished
const design = {
  // Border radius system - limited to 4 values for consistency
  radius: {
    full: 'rounded-full',     // Pills, avatars, dots
    '2xl': 'rounded-2xl',     // Messages, primary containers
    xl: 'rounded-xl',         // Cards, secondary containers  
    lg: 'rounded-lg'          // Buttons, small elements
  },
  
  // Glass morphism system - consistent opacity
  glass: {
    bg: {
      subtle: 'bg-white/[0.03]',      // Very subtle, for large areas
      light: 'bg-white/[0.06]',       // Light glass effect
      medium: 'bg-white/[0.08]',      // Medium glass effect
      strong: 'bg-black/80',          // Strong, for overlays
      colored: {
        purple: 'bg-purple-500/[0.08]',
        emerald: 'bg-emerald-500/[0.08]',
        blue: 'bg-blue-500/[0.08]'
      }
    },
    border: {
      subtle: 'border-white/[0.06]',  // Barely visible
      light: 'border-white/[0.08]',   // Light borders
      medium: 'border-white/10',      // Standard borders
      strong: 'border-white/20'       // Emphasized borders
    }
  },
  
  // Standardized spacing
  spacing: {
    message: 'px-6 py-4',       // Large content areas
    card: 'px-5 py-3',          // Cards and containers
    pill: 'px-4 py-2',          // Pills and badges
    button: 'px-3 py-1.5',      // Buttons
    tiny: 'px-2 py-1'           // Tags and small elements
  },
  
  // Typography system
  text: {
    xs: 'text-xs font-medium',      // 12px - labels, meta
    sm: 'text-sm font-normal',      // 14px - body text
    base: 'text-base font-normal',  // 16px - emphasis
    lg: 'text-lg font-medium'       // 18px - headings
  },
  
  // Animation presets
  animation: {
    spring: { type: "spring", stiffness: 260, damping: 20 },
    smooth: { duration: 0.3, ease: [0.19, 1, 0.22, 1] },
    water: { duration: 0.4, ease: [0.19, 1, 0.22, 1] }
  },
  
  // Hover states
  hover: {
    scale: 'hover:scale-[1.02] active:scale-[0.98]',
    glow: 'hover:shadow-lg hover:shadow-white/[0.05]',
    brightness: 'hover:brightness-110'
  }
};

// Enhanced message types (matching SimpleChatDebug)
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
  success: boolean;
  timestamp: number;
  error?: string;
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result';
  timestamp: number;
  data: Message | ToolCall | ToolResult;
}

// 🔄 UNIFIED DATA NORMALIZATION SYSTEM
// Handles both Supabase session data and SSE events consistently

// Enhanced metadata interfaces for source tracking
interface SSEMetadata {
  messageId?: string;
  eventType?: string;
  toolName?: string;
  toolArgs?: any;
  output?: string;
  delta?: string;
}

interface SupabaseMetadata {
  messageId?: string;
  writeId?: string;
  contentIndex?: number;
  originalMessage?: any;
}

interface UnifiedToolCall {
  id: string;
  name: string;
  parameters: any; // Unified from 'input' (Supabase) and 'arguments' (SSE)
  timestamp: number;
  source: 'supabase' | 'sse';
  originalRole?: 'user' | 'assistant';
  messageId?: string;
  rawData?: {
    sse?: any;
    supabase?: any;
  };
}

interface UnifiedToolResult {
  id: string;
  toolCallId: string;
  toolName?: string;
  result: any;
  success: boolean;
  timestamp: number;
  source: 'supabase' | 'sse';
  originalRole?: 'user' | 'assistant';
  messageId?: string;
  error?: string;
  rawData?: {
    sse?: any;
    supabase?: any;
  };
}

interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  source: 'supabase' | 'sse';
  isStreaming?: boolean;
  isComplete?: boolean;
  messageId?: string;
  writeId?: string;
  rawData?: {
    sse?: any;
    supabase?: any;
  };
}

interface UnifiedTimelineEvent {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result';
  timestamp: number;
  data: UnifiedMessage | UnifiedToolCall | UnifiedToolResult;
  source: 'supabase' | 'sse';
  metadata?: {
    sse?: SSEMetadata;
    supabase?: SupabaseMetadata;
  };
}

// Verification interfaces
interface VerificationDiscrepancy {
  type: string;
  sseEvent?: UnifiedTimelineEvent;
  supabaseEvent?: UnifiedTimelineEvent;
  description: string;
  details?: any;
}

interface VerificationResult {
  isEquivalent: boolean;
  discrepancies: VerificationDiscrepancy[];
  statistics: {
    sseEventCount: number;
    supabaseEventCount: number;
    matchedPairs: number;
    unmatchedSSE: string[];
    unmatchedSupabase: string[];
  };
}

// 🎬 REPLAY SYSTEM INTERFACES
interface ReplayState {
  isPlaying: boolean;
  currentEventIndex: number;
  speed: number; // Multiplier: 0.5x, 1x, 2x, 4x
  totalEvents: number;
  startTime: number | null;
  pausedAt: number | null;
}

interface ReplayEvent {
  event: UnifiedTimelineEvent;
  originalIndex: number;
  relativeTimestamp: number; // Milliseconds from start of conversation
}

interface ReplayControls {
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  seekTo: (eventIndex: number) => void;
}

// 🔧 UNIFIED PARSING FUNCTIONS
// Convert both Supabase and SSE data to unified format

function parseSupabaseMessage(msg: any, index: number): UnifiedTimelineEvent[] {
  const events: UnifiedTimelineEvent[] = [];
  const baseTimestamp = msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now() + index * 1000;
  
  if (!msg.content || !Array.isArray(msg.content)) {
    return events;
  }

  // Process each content item in the message
  msg.content.forEach((contentItem: any, contentIndex: number) => {
    const itemTimestamp = baseTimestamp + contentIndex * 100; // Slight offset for ordering
    
    switch (contentItem.type) {
      case 'text':
        if (contentItem.text && contentItem.text.trim()) {
          events.push({
            id: `${msg.id || index}-text-${contentIndex}`,
            type: 'message',
            timestamp: itemTimestamp,
            source: 'supabase',
            data: {
              id: `${msg.id || index}-text-${contentIndex}`,
              role: msg.role,
              content: contentItem.text,
              timestamp: itemTimestamp,
              source: 'supabase',
              messageId: msg.id,
              writeId: msg.extra?.write_id,
              rawData: { supabase: msg }
            },
            metadata: {
              supabase: {
                messageId: msg.id,
                writeId: msg.extra?.write_id,
                contentIndex,
                originalMessage: msg
              }
            }
          });
        }
        break;
        
      case 'tool_use':
        events.push({
          id: contentItem.id || `${msg.id || index}-tool-use-${contentIndex}`,
          type: 'tool_call',
          timestamp: itemTimestamp,
          source: 'supabase',
          data: {
            id: contentItem.id || `${msg.id || index}-tool-use-${contentIndex}`,
            name: contentItem.name,
            parameters: contentItem.input, // Map 'input' to 'parameters'
            timestamp: itemTimestamp,
            source: 'supabase',
            originalRole: msg.role,
            messageId: msg.id,
            rawData: { supabase: msg }
          },
          metadata: {
            supabase: {
              messageId: msg.id,
              writeId: msg.extra?.write_id,
              contentIndex,
              originalMessage: msg
            }
          }
        });
        break;
        
      case 'tool_result':
        // Extract tool name and parse result data
        let toolName = 'unknown';
        let result = contentItem.content;
        let success = !contentItem.is_error; // Use is_error flag if present
        let error: string | undefined;
        
        // Handle different tool result formats
        if (Array.isArray(contentItem.content) && contentItem.content.length > 0) {
          const firstContent = contentItem.content[0];
          if (firstContent.text) {
            try {
              const parsed = JSON.parse(firstContent.text);
              if (parsed.success !== undefined) {
                success = parsed.success;
              }
              if (parsed.error) {
                error = parsed.error;
              }
              if (parsed.message) {
                result = parsed.message;
              } else {
                result = parsed;
              }
            } catch {
              result = firstContent.text;
              // Check for error patterns in text
              if (firstContent.text.toLowerCase().includes('error') || 
                  firstContent.text.toLowerCase().includes('failed')) {
                success = false;
                error = firstContent.text;
              }
            }
          }
        }
        
        // Handle is_error flag from Supabase
        if (contentItem.is_error) {
          success = false;
          if (!error && Array.isArray(result) && result[0]?.text) {
            error = result[0].text;
          }
        }
        
        events.push({
          id: `${contentItem.tool_use_id || msg.id || index}-result-${contentIndex}`,
          type: 'tool_result',
          timestamp: itemTimestamp,
          source: 'supabase',
          data: {
            id: `${contentItem.tool_use_id || msg.id || index}-result-${contentIndex}`,
            toolCallId: contentItem.tool_use_id || 'unknown',
            toolName,
            result,
            success,
            timestamp: itemTimestamp,
            source: 'supabase',
            originalRole: msg.role,
            messageId: msg.id,
            error,
            rawData: { supabase: msg }
          },
          metadata: {
            supabase: {
              messageId: msg.id,
              writeId: msg.extra?.write_id,
              contentIndex,
              originalMessage: msg
            }
          }
        });
        break;
    }
  });
  
  return events;
}

function parseSSEEvent(eventData: any): UnifiedTimelineEvent | null {
  try {
    const timestamp = Date.now();
    
    // Handle real SSE event structure from the provided examples
    if (eventData.type === 'agent_event' && eventData.payload) {
      const { event_type, data, message_id } = eventData.payload;
      
      switch (event_type) {
        case 'chunk':
          if (data.delta || data.content) {
            return {
              id: `sse-chunk-${message_id}-${timestamp}`,
              type: 'message',
              timestamp,
              source: 'sse',
              data: {
                id: `sse-chunk-${message_id}-${timestamp}`,
                role: 'assistant',
                content: data.content || data.delta || '',
                timestamp,
                source: 'sse',
                isStreaming: true,
                messageId: message_id,
                rawData: { sse: eventData }
              },
              metadata: {
                sse: {
                  messageId: message_id,
                  eventType: event_type,
                  delta: data.delta
                }
              }
            };
          }
          break;
          
        case 'tool_call':
          if (data.tool_call) {
            return {
              id: data.tool_call.id || `sse-tool-call-${timestamp}`,
              type: 'tool_call',
              timestamp,
              source: 'sse',
              data: {
                id: data.tool_call.id || `sse-tool-call-${timestamp}`,
                name: data.tool_call.name,
                parameters: data.tool_call.arguments, // Map 'arguments' to 'parameters'
                timestamp,
                source: 'sse',
                messageId: message_id,
                rawData: { sse: eventData }
              },
              metadata: {
                sse: {
                  messageId: message_id,
                  eventType: event_type,
                  toolName: data.tool_name,
                  toolArgs: data.tool_args
                }
              }
            };
          }
          break;
          
        case 'tool_result':
          if (data.result) {
            let success = data.success !== false;
            let result = data.result;
            let error: string | undefined;
            
            // Extract result content from nested structure
            if (data.result.content && Array.isArray(data.result.content)) {
              const firstContent = data.result.content[0];
              if (firstContent?.text) {
                try {
                  const parsed = JSON.parse(firstContent.text);
                  if (parsed.success !== undefined) {
                    success = parsed.success;
                  }
                  if (parsed.error) {
                    error = parsed.error;
                  }
                  result = parsed;
                } catch {
                  result = firstContent.text;
                }
              }
            }
            
            // Use direct success flag and output from SSE
            if (data.success !== undefined) {
              success = data.success;
            }
            if (data.output) {
              try {
                const parsed = JSON.parse(data.output);
                result = parsed;
              } catch {
                result = data.output;
              }
            }
            
            return {
              id: `${data.result.tool_use_id}-result`,
              type: 'tool_result',
              timestamp,
              source: 'sse',
              data: {
                id: `${data.result.tool_use_id}-result`,
                toolCallId: data.result.tool_use_id,
                toolName: 'unknown', // SSE doesn't always include tool name in result
                result,
                success,
                timestamp,
                source: 'sse',
                messageId: message_id,
                error,
                rawData: { sse: eventData }
              },
              metadata: {
                sse: {
                  messageId: message_id,
                  eventType: event_type,
                  output: data.output
                }
              }
            };
          }
          break;
      }
    }
    
    // Handle legacy/mock SSE event structure for backward compatibility
    switch (eventData.type) {
      case 'chunk':
        if (eventData.content && eventData.content.trim()) {
          return {
            id: `sse-chunk-${timestamp}`,
            type: 'message',
            timestamp,
            source: 'sse',
            data: {
              id: `sse-chunk-${timestamp}`,
              role: 'assistant',
              content: eventData.content,
              timestamp,
              source: 'sse',
              isStreaming: true,
              rawData: { sse: eventData }
            }
          };
        }
        break;
        
      case 'tool_call':
        if (eventData.toolCall) {
          return {
            id: eventData.toolCall.id || `sse-tool-call-${timestamp}`,
            type: 'tool_call',
            timestamp,
            source: 'sse',
            data: {
              id: eventData.toolCall.id || `sse-tool-call-${timestamp}`,
              name: eventData.toolCall.name,
              parameters: eventData.toolCall.input || eventData.toolCall.arguments,
              timestamp,
              source: 'sse',
              rawData: { sse: eventData }
            }
          };
        }
        break;
        
      case 'tool_result':
        if (eventData.toolResult) {
          return {
            id: eventData.toolResult.id || `sse-tool-result-${timestamp}`,
            type: 'tool_result',
            timestamp,
            source: 'sse',
            data: {
              id: eventData.toolResult.id || `sse-tool-result-${timestamp}`,
              toolCallId: eventData.toolResult.toolCallId || 'unknown',
              toolName: eventData.toolResult.toolName || 'unknown',
              result: eventData.toolResult.result,
              success: eventData.toolResult.success !== false,
              timestamp,
              source: 'sse',
              error: eventData.toolResult.error,
              rawData: { sse: eventData }
            }
          };
        }
        break;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing SSE event:', error);
    return null;
  }
}

// 🧪 VERIFICATION SYSTEM
// Compares SSE and Supabase data for equivalence

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

function groupEventsByType(events: UnifiedTimelineEvent[]): Record<string, UnifiedTimelineEvent[]> {
  return events.reduce((groups, event) => {
    if (!groups[event.type]) {
      groups[event.type] = [];
    }
    groups[event.type].push(event);
    return groups;
  }, {} as Record<string, UnifiedTimelineEvent[]>);
}

function verifyToolCalls(
  sseToolCalls: UnifiedTimelineEvent[],
  supabaseToolCalls: UnifiedTimelineEvent[]
): VerificationDiscrepancy[] {
  const discrepancies: VerificationDiscrepancy[] = [];
  
  for (const sseEvent of sseToolCalls) {
    const sseCall = sseEvent.data as UnifiedToolCall;
    const matchingSupabase = supabaseToolCalls.find(
      sb => (sb.data as UnifiedToolCall).id === sseCall.id
    );
    
    if (!matchingSupabase) {
      discrepancies.push({
        type: 'missing_supabase_tool_call',
        sseEvent,
        description: `SSE tool call ${sseCall.id} not found in Supabase`
      });
      continue;
    }
    
    const supabaseCall = matchingSupabase.data as UnifiedToolCall;
    
    // Verify tool call equivalence
    if (sseCall.name !== supabaseCall.name) {
      discrepancies.push({
        type: 'tool_name_mismatch',
        sseEvent,
        supabaseEvent: matchingSupabase,
        description: `Tool name mismatch: SSE=${sseCall.name}, Supabase=${supabaseCall.name}`
      });
    }
    
    if (!deepEqual(sseCall.parameters, supabaseCall.parameters)) {
      discrepancies.push({
        type: 'tool_parameters_mismatch',
        sseEvent,
        supabaseEvent: matchingSupabase,
        description: `Tool parameters mismatch for ${sseCall.id}`,
        details: {
          sse: sseCall.parameters,
          supabase: supabaseCall.parameters
        }
      });
    }
  }
  
  return discrepancies;
}

function verifyToolResults(
  sseToolResults: UnifiedTimelineEvent[],
  supabaseToolResults: UnifiedTimelineEvent[]
): VerificationDiscrepancy[] {
  const discrepancies: VerificationDiscrepancy[] = [];
  
  for (const sseEvent of sseToolResults) {
    const sseResult = sseEvent.data as UnifiedToolResult;
    const matchingSupabase = supabaseToolResults.find(
      sb => (sb.data as UnifiedToolResult).toolCallId === sseResult.toolCallId
    );
    
    if (!matchingSupabase) {
      discrepancies.push({
        type: 'missing_supabase_tool_result',
        sseEvent,
        description: `SSE tool result for ${sseResult.toolCallId} not found in Supabase`
      });
      continue;
    }
    
    const supabaseResult = matchingSupabase.data as UnifiedToolResult;
    
    // Verify tool result equivalence
    if (sseResult.success !== supabaseResult.success) {
      discrepancies.push({
        type: 'tool_result_success_mismatch',
        sseEvent,
        supabaseEvent: matchingSupabase,
        description: `Success status mismatch: SSE=${sseResult.success}, Supabase=${supabaseResult.success}`
      });
    }
    
    // Compare result content (more lenient for different formats)
    const sseResultStr = JSON.stringify(sseResult.result);
    const supabaseResultStr = JSON.stringify(supabaseResult.result);
    
    if (sseResultStr !== supabaseResultStr) {
      discrepancies.push({
        type: 'tool_result_content_mismatch',
        sseEvent,
        supabaseEvent: matchingSupabase,
        description: `Result content mismatch for ${sseResult.toolCallId}`,
        details: {
          sse: sseResult.result,
          supabase: supabaseResult.result
        }
      });
    }
  }
  
  return discrepancies;
}

function verifyEventEquivalence(
  sseEvents: UnifiedTimelineEvent[],
  supabaseEvents: UnifiedTimelineEvent[]
): VerificationResult {
  const results: VerificationResult = {
    isEquivalent: true,
    discrepancies: [],
    statistics: {
      sseEventCount: sseEvents.length,
      supabaseEventCount: supabaseEvents.length,
      matchedPairs: 0,
      unmatchedSSE: [],
      unmatchedSupabase: []
    }
  };
  
  // Group events by type
  const sseByType = groupEventsByType(sseEvents);
  const supabaseByType = groupEventsByType(supabaseEvents);
  
  // Verify tool calls
  const toolCallDiscrepancies = verifyToolCalls(
    sseByType.tool_call || [],
    supabaseByType.tool_call || []
  );
  
  // Verify tool results  
  const toolResultDiscrepancies = verifyToolResults(
    sseByType.tool_result || [],
    supabaseByType.tool_result || []
  );
  
  // Compile results
  results.discrepancies.push(...toolCallDiscrepancies);
  results.discrepancies.push(...toolResultDiscrepancies);
  
  results.isEquivalent = results.discrepancies.length === 0;
  
  // Calculate statistics
  results.statistics.matchedPairs = Math.min(
    (sseByType.tool_call?.length || 0) + (sseByType.tool_result?.length || 0),
    (supabaseByType.tool_call?.length || 0) + (supabaseByType.tool_result?.length || 0)
  );
  
  return results;
}

// 🎬 REPLAY SYSTEM FUNCTIONS
// Prepare events for chronological replay with realistic timing

function prepareEventsForReplay(events: UnifiedTimelineEvent[]): ReplayEvent[] {
  if (events.length === 0) return [];
  
  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate relative timestamps from the first event
  const startTimestamp = sortedEvents[0].timestamp;
  
  return sortedEvents.map((event, index) => ({
    event,
    originalIndex: index,
    relativeTimestamp: event.timestamp - startTimestamp
  }));
}

function calculateReplayDuration(replayEvents: ReplayEvent[]): number {
  if (replayEvents.length === 0) return 0;
  const lastEvent = replayEvents[replayEvents.length - 1];
  return lastEvent.relativeTimestamp;
}

// Enhanced mock SSE event processor (matching SimpleChatDebug)
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
              success: data.success,
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

// Tool status tracking
interface ActiveTool {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
}

// File operation tracking
interface FileOperation {
  path: string;
  operation: 'created' | 'modified';
  timestamp: number;
}

// Human-readable tool name mapping
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'str_replace_editor': 'Editing files',
  'exa_search': 'Searching the web',
  'exa_get_contents': 'Reading web content',
  'exa_find_similar': 'Finding similar pages',
  'agentic_web_search': 'Running web search',
  'read_file': 'Reading files',
  'read_files': 'Reading files',
  'search_files': 'Searching files',
  'create_file': 'Creating file',
  'write_file': 'Writing file',
  'run_command': 'Running command',
  'think': 'Thinking',
  'decompose_problem_recursively': 'Breaking down problem',
  'log_hypothesis_test_cycle': 'Testing hypothesis',
  'analyze_root_cause': 'Analyzing issue',
  'tree': 'Exploring directory',
  'cat': 'Reading file',
  'grep': 'Searching in files',
  'mv': 'Moving files',
  'cp': 'Copying files',
  'mkdir': 'Creating directory',
  'touch': 'Creating file',
  'bun': 'Running Bun command',
  'bunx': 'Running package command',
  'git_clone': 'Cloning repository',
  'git_pull': 'Pulling changes',
  'git_checkout': 'Switching branch'
};

// Get human-readable tool name
function getToolDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName.replace(/_/g, ' ');
}

// Inline tool status pill component
function InlineToolPill({ tool }: { tool: ActiveTool }) {
  const duration = tool.endTime 
    ? Math.floor((tool.endTime - tool.startTime) / 1000)
    : Math.floor((Date.now() - tool.startTime) / 1000);
    
  return (
    <div className={cn(
      "inline-flex items-center gap-2 transition-all duration-300",
      design.radius.full,
      design.spacing.pill,
      design.text.xs,
      "backdrop-blur-sm border",
      tool.status === 'running' && "bg-blue-500/[0.08] text-blue-300 border-blue-500/20",
      tool.status === 'completed' && "bg-emerald-500/[0.08] text-emerald-300 border-emerald-500/20",
      tool.status === 'failed' && "bg-red-500/[0.08] text-red-300 border-red-500/20"
    )}>
      {tool.status === 'running' && (
        <div className="relative">
          <Loader2 className="w-3 h-3 animate-spin" />
          <div className="absolute inset-0 w-3 h-3 animate-ping opacity-30">
            <Loader2 className="w-3 h-3" />
          </div>
        </div>
      )}
      {tool.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
      {tool.status === 'failed' && <XCircle className="w-3 h-3" />}
      <span>{getToolDisplayName(tool.name)}</span>
      {duration > 0 && (
        <span className="opacity-60">{duration}s</span>
      )}
    </div>
  );
}

// File operation tracking interface
interface FileOperation {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  timestamp: number;
  success?: boolean;
}

// Custom ThinkBlockDisplay component with consistent design
interface ThinkBlockProps {
  content: string;
  timestamp: number;
  id: string;
  defaultExpanded?: boolean;
}

function ThinkBlockDisplay({ content, timestamp, defaultExpanded = false }: ThinkBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <motion.div 
      className="relative"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={design.animation.smooth}
    >
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3",
          design.spacing.card,
          design.glass.bg.colored.purple,
          "border border-purple-500/20",
          design.radius.xl,
          "backdrop-blur-xl",
          "transition-all duration-200",
          design.hover.scale,
          design.hover.glow,
          expanded && "rounded-b-none"
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <Brain className="w-5 h-5 text-purple-400" />
            <Sparkles className="w-3 h-3 text-purple-300 absolute -top-1 -right-1" />
          </div>
          <span className={cn(design.text.xs, "text-purple-400/60")}>
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <ChevronDown className={cn(
          "w-4 h-4 text-purple-400 transition-transform duration-200",
          !expanded && "-rotate-90"
        )} />
      </motion.button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={design.animation.smooth}
            className={cn(
              "overflow-hidden",
              design.glass.bg.subtle,
              "border border-t-0 border-purple-500/20",
              "rounded-b-xl"
            )}
          >
            <div className={cn(design.spacing.card, design.text.sm, "text-purple-200/80 whitespace-pre-wrap")}>
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}



// Dynamic Tool Status Pill - shows current tool being executed
interface DynamicToolStatusPillProps {
  toolCalls: UnifiedToolCall[];
}

function DynamicToolStatusPill({ toolCalls }: DynamicToolStatusPillProps) {
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  
  // Format tool names for display
  const formatToolName = (name: string) => {
    const nameMap: Record<string, string> = {
      'exa_search': 'Searching web',
      'str_replace_editor': 'Editing file',
      'read_files': 'Reading files',
      'search_files': 'Searching files',
      'create_file': 'Creating file',
      'write_file': 'Writing file',
      'spawn_agent_sync': 'Running agent',
      'decompose_problem_recursively': 'Breaking down problem',
      'analyze_root_cause': 'Analyzing issue',
      'log_hypothesis_test_cycle': 'Testing hypothesis',
      'log_ooda_cycle_step': 'Planning next step'
    };
    return nameMap[name.toLowerCase()] || name.replace(/_/g, ' ');
  };
  
  // Cycle through tools
  useEffect(() => {
    if (toolCalls.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentToolIndex((prev) => (prev + 1) % toolCalls.length);
    }, 2000); // Change every 2 seconds
    
    return () => clearInterval(interval);
  }, [toolCalls.length]);
  
  if (toolCalls.length === 0) return null;
  
  const currentTool = toolCalls[currentToolIndex];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={design.animation.smooth}
      className="flex justify-center my-4"
    >
      <motion.div
        className={cn(
          "relative overflow-hidden inline-flex items-center gap-2",
          design.radius.full,
          design.spacing.pill,
          design.glass.bg.strong,
          "backdrop-blur-xl border",
          design.glass.border.medium,
          "transition-all duration-300",
          design.hover.scale,
          design.hover.glow
        )}
      >
        {/* Subtle shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        <div className="relative flex items-center gap-2">
          {/* Animated activity indicator */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className={cn("w-1.5 h-1.5", design.radius.full, "bg-purple-400")}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.span
              key={currentTool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={design.animation.smooth}
              className={cn(design.text.sm, "text-white/80")}
            >
              {formatToolName(currentTool.name)}
            </motion.span>
          </AnimatePresence>
          
          <span className={cn(design.text.xs, "text-white/40")}>
            {currentToolIndex + 1}/{toolCalls.length}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Group events intelligently for better UX
function renderGroupedEvents(events: UnifiedTimelineEvent[], currentReplayEventId?: string): React.ReactNode {
  const groups: React.ReactNode[] = [];
  let i = 0;
  
  while (i < events.length) {
    const event = events[i];
    
    if (event.type === 'message') {
      const message = event.data as UnifiedMessage;
      
      // Collect everything that happens after this message until the next message
      const activityAfterMessage: React.ReactNode[] = [];
      let j = i + 1;
      
      while (j < events.length && events[j].type !== 'message') {
        const activityEvent = events[j];
        
        if (activityEvent.type === 'tool_call') {
          const toolCall = activityEvent.data as UnifiedToolCall;
          
          if (toolCall.name === 'think') {
            // Render think blocks
            activityAfterMessage.push(
              <div key={`think-${j}`}>
                {renderUnifiedTimelineEvent(activityEvent, j, events, currentReplayEventId === activityEvent.id)}
              </div>
            );
          }
          // Tool indicators are now shown in the floating pill
        }
        j++;
      }
      
      // Check if this is the final assistant message
      let isFinalAssistantMessage = false;
      if (message.role === 'assistant') {
        let hasMoreAssistantMessages = false;
        for (let k = j; k < events.length; k++) {
          if (events[k].type === 'message' && (events[k].data as UnifiedMessage).role === 'assistant') {
            hasMoreAssistantMessages = true;
            break;
          }
        }
        isFinalAssistantMessage = !hasMoreAssistantMessages;
      }
      
      // Skip intermediate assistant messages
      const shouldShowMessage = message.role === 'user' || isFinalAssistantMessage;
      
      if (shouldShowMessage) {
        // Collect all tool calls for the pill (excluding think)
        const allToolCalls = events
          .filter(e => e.type === 'tool_call')
          .map(e => e.data as UnifiedToolCall)
          .filter(tc => tc.name !== 'think');
        
        groups.push(
          <div key={`group-${i}`}>
            {/* Show tool status pill before final assistant message */}
            {isFinalAssistantMessage && allToolCalls.length > 0 && (
              <DynamicToolStatusPill toolCalls={allToolCalls} />
            )}
            {renderUnifiedTimelineEvent(event, i, events, currentReplayEventId === event.id)}
            {activityAfterMessage}
          </div>
        );
      } else {
        // For intermediate messages, just show the activity
        groups.push(
          <div key={`activity-${i}`} className="space-y-1">
            {activityAfterMessage}
          </div>
        );
      }
      
      i = j;
    } else {
      i++;
    }
  }
  
  // Add file operations summary at the end
  const fileOps: FileOperation[] = [];
  events.forEach(event => {
    if (event.type === 'tool_call') {
      const toolCall = event.data as UnifiedToolCall;
      const toolResult = events.find(e => 
        e.type === 'tool_result' && 
        (e.data as UnifiedToolResult).toolCallId === toolCall.id
      );
      const op = extractFileOperation(toolCall, toolResult?.data as UnifiedToolResult);
      if (op) fileOps.push(op);
    }
  });
  
  if (fileOps.length > 0) {
    groups.push(<FileOperationsSummary key="file-ops" operations={fileOps} />);
  }
  
  return <>{groups}</>;
}

// 🎨 UNIFIED TIMELINE EVENT RENDERER
// Elegant, user-focused design that would make Jobs & Ive proud
function renderUnifiedTimelineEvent(event: UnifiedTimelineEvent, eventIndex: number, allEvents: UnifiedTimelineEvent[], isCurrentReplayEvent?: boolean): React.ReactNode {
  const key = `unified-${event.id}-${eventIndex}`;
  
  // Tool visibility rules - hide internal/technical tools from users
  const isUserFacingTool = (toolName: string): boolean => {
    const userFacingTools = ['think', 'exa_search', 'str_replace_editor', 'read_files', 'search_files', 'create_file', 'write_file'];
    return userFacingTools.includes(toolName.toLowerCase());
  };
  
  switch (event.type) {
    case 'message':
      const message = event.data as UnifiedMessage;
      
      return (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            boxShadow: isCurrentReplayEvent 
              ? "0 0 20px rgba(59, 130, 246, 0.5)" 
              : "0 0 0px rgba(59, 130, 246, 0)"
          }}
          transition={{ 
            duration: 0.5,
            ease: [0.19, 1, 0.22, 1], // Water-like easing
          }}
          className={cn(
            "flex gap-3 relative",
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
            isCurrentReplayEvent && "ring-2 ring-blue-400/50 rounded-lg p-2 -m-2"
          )}
        >
          {/* Avatar with water ripple effect */}
          <motion.div 
            className="flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="relative">
              {/* Ripple effect for assistant messages */}
              {message.role === 'assistant' && (
                <motion.div 
                  className="absolute inset-0 rounded-full"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(255, 255, 255, 0.1)",
                      "0 0 0 8px rgba(255, 255, 255, 0)",
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              )}
              <div className={cn(
                "w-8 h-8 flex items-center justify-center",
                design.radius.full,
                "backdrop-blur-xl border",
                message.role === 'user' 
                  ? "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/20" 
                  : cn(design.glass.bg.subtle, design.glass.border.subtle)
              )}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-blue-300" />
                ) : (
                  <div className={cn("w-4 h-4", design.radius.full, "bg-gradient-to-br from-white/10 to-white/5")} />
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Message Content with enhanced water theme */}
          <div className="flex-1 max-w-[85%]">
            <div className={cn(
              "relative overflow-hidden", // For water effects
              design.radius['2xl'],
              "backdrop-blur-2xl",
              design.spacing.message,
              message.role === 'user'
                ? "bg-gradient-to-br from-[#0071E3] to-[#0077ED] text-white"
                : cn(design.glass.bg.subtle, "border", design.glass.border.subtle, "text-white/90")
            )}>
              {/* Subtle water surface effect for assistant messages */}
              {message.role === 'assistant' && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              )}
              
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </div>
              
              {/* Elegant tool activity indicator - shows when AI is working */}
              {message.role === 'assistant' && message.isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mt-3 flex items-center gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-1 h-1 rounded-full bg-purple-400"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.div
                      className="w-1 h-1 rounded-full bg-purple-400"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2
                      }}
                    />
                    <motion.div
                      className="w-1 h-1 rounded-full bg-purple-400"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4
                      }}
                    />
                  </div>
                  <span className="text-xs text-purple-300/60 font-medium">
                    Working
                  </span>
                </motion.div>
              )}
              
              {/* Elegant metadata - only show on hover/focus */}
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                whileHover={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10"
              >
                <span className="text-xs text-white/40">
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
                </span>
                {/* Only show source in debug mode */}
                {eventIndex < 0 && ( // This is a hack - in production we'd have a debug flag
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    message.source === 'supabase' 
                      ? "bg-purple-500/20 text-purple-300" 
                      : "bg-green-500/20 text-green-300"
                  )}>
                    {message.source}
                  </span>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      );
      
    case 'tool_call':
      const toolCall = event.data as UnifiedToolCall;
      
      // Special handling for think blocks - the only tool we show prominently
      if (toolCall.name === 'think') {
        return (
          <motion.div 
            key={key} 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 0.4,
              ease: [0.19, 1, 0.22, 1] // Water-like easing
            }}
            className="flex gap-3"
          >
            <div className="flex-shrink-0">
              <motion.div 
                className="relative w-8 h-8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  delay: 0.1 
                }}
              >
                {/* Subtle pulsing glow */}
                <motion.div 
                  className={cn("absolute inset-0", design.radius.full, "bg-purple-500/20")}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.2, 0.5]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className={cn(
                  "relative w-8 h-8 flex items-center justify-center",
                  design.radius.full,
                  design.glass.bg.colored.purple,
                  "border border-purple-500/20",
                  "backdrop-blur-xl"
                )}>
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
              </motion.div>
            </div>
            <div className="flex-1 max-w-[85%]">
              <ThinkBlockDisplay
                content={toolCall.parameters?.thought || 'Processing...'}
                timestamp={toolCall.timestamp}
                id={toolCall.id}
                defaultExpanded={false}
              />
            </div>
          </motion.div>
        );
      }
      
      // For all other tools - return null (they'll be tracked in file operations if relevant)
      return null;
      
    case 'tool_result':
      const toolResult = event.data as UnifiedToolResult;
      
      // Skip non-user-facing tool results
      if (toolResult.toolName && !isUserFacingTool(toolResult.toolName)) {
        return null;
      }
      
      // Don't show individual tool results - they're aggregated elsewhere
      return null;
      
    default:
      return null;
  }
}

// Inline Tool Activity Indicator - shows between messages
interface InlineToolActivityProps {
  toolCalls: UnifiedToolCall[];
  isActive: boolean;
}

function InlineToolActivity({ toolCalls, isActive }: InlineToolActivityProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (toolCalls.length === 0) return null;
  
  // Format tool names for display
  const formatToolName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Exa Search', 'Searching')
      .replace('Str Replace Editor', 'Editing Files')
      .replace('Read Files', 'Reading Files')
      .replace('Search Files', 'Searching Files');
  };
  
  // Get unique tools used
  const uniqueTools = Array.from(new Set(toolCalls.map(tc => tc.name)));
  const currentTool = toolCalls[toolCalls.length - 1]?.name;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3,
        ease: [0.19, 1, 0.22, 1]
      }}
      className="flex gap-3 my-2"
    >
      <div className="flex-shrink-0 w-8" /> {/* Align with message avatars */}
      
      <div className="relative">
        <motion.button
          className={cn(
            "relative overflow-hidden",
            "inline-flex items-center gap-2 px-2.5 py-1 rounded-full",
            "bg-purple-500/[0.08] border border-purple-500/[0.15]",
            "hover:bg-purple-500/[0.12] hover:border-purple-500/[0.25]",
            "transition-all duration-200",
            "text-xs"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Subtle shimmer for active state */}
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/[0.1] to-transparent"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}
          
          {/* Content */}
          <div className="relative flex items-center gap-1.5">
            {isActive ? (
              <div className="flex items-center gap-0.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full bg-purple-400/80"
                    animate={{
                      y: [0, -3, 0]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
            )}
            
            <span className="text-purple-300/90 font-medium">
              {isActive && currentTool 
                ? formatToolName(currentTool) 
                : `${uniqueTools.length} ${uniqueTools.length === 1 ? 'tool' : 'tools'}`
              }
            </span>
            
            <ChevronRight className={cn(
              "w-2.5 h-2.5 text-purple-400/40 transition-transform",
              isExpanded && "rotate-90"
            )} />
          </div>
        </motion.button>
        
        {/* Expanded tool list */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute mt-1 left-0 bg-black/95 backdrop-blur-xl border border-white/[0.08] rounded-lg p-2.5 z-10 min-w-[160px]"
            >
              <div className="space-y-1.5">
                {uniqueTools.map((tool, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="w-1 h-1 rounded-full bg-purple-400/60" />
                    <span className="text-white/70">{formatToolName(tool)}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Floating Tool Status Pill - minimal, elegant tool activity indicator
interface ToolStatusPillProps {
  events: UnifiedTimelineEvent[];
  isActive: boolean;
}

function ToolStatusPill({ events, isActive }: ToolStatusPillProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  
  // Extract tool calls from events
  const toolCalls = events
    .filter(e => e.type === 'tool_call')
    .map(e => e.data as UnifiedToolCall)
    .filter(tc => tc.name !== 'think'); // Don't show think in the pill
  
  // Get the latest active tool
  useEffect(() => {
    if (toolCalls.length > 0) {
      const latestTool = toolCalls[toolCalls.length - 1];
      setCurrentTool(latestTool.name);
    } else {
      setCurrentTool(null);
    }
  }, [toolCalls.length, toolCalls]);
  
  // Don't show if no tools at all
  if (toolCalls.length === 0) return null;
  
  // Format tool name for display
  const formatToolName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Exa Search', 'Searching')
      .replace('Str Replace Editor', 'Editing Files')
      .replace('Read Files', 'Reading Files')
      .replace('Search Files', 'Searching Files');
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
    >
      <motion.div
        className={cn(
          "relative overflow-hidden",
          "flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-black/80 backdrop-blur-xl border border-white/10",
          "cursor-pointer transition-all duration-300",
          isExpanded && "rounded-[20px]"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Subtle shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        <div className="relative flex items-center gap-2">
          {/* Activity indicator - animated when active, static when complete */}
          {isActive ? (
            <div className="flex items-center gap-1">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-purple-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-purple-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2
                }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-purple-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4
                }}
              />
            </div>
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
          
          <span className="text-sm text-white/80 font-medium">
            {isActive ? (currentTool ? formatToolName(currentTool) : 'Working') : 'Complete'}
          </span>
          
          <span className="text-xs text-white/40">
            {toolCalls.length} {toolCalls.length === 1 ? 'tool' : 'tools'}
          </span>
          
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-white/40 rotate-90" />
          </motion.div>
        </div>
      </motion.div>
      
      {/* Expanded tool history */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 overflow-hidden"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg p-3 min-w-[200px] max-w-[300px]">
              <div className="text-xs text-white/60 mb-2">Tool History</div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {toolCalls.slice(-10).reverse().map((tool, index) => (
                  <motion.div
                    key={`${tool.id}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    <span className="text-white/70">{formatToolName(tool.name)}</span>
                    <span className="text-white/30 ml-auto">
                      {new Date(tool.timestamp).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// File operation tracking component - elegant summary of AI's work
function FileOperationsSummary({ operations }: { operations: FileOperation[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (operations.length === 0) return null;
  
  // Group operations by file
  const fileGroups = operations.reduce((acc, op) => {
    if (!acc[op.path]) acc[op.path] = [];
    acc[op.path].push(op);
    return acc;
  }, {} as Record<string, FileOperation[]>);
  
  const fileCount = Object.keys(fileGroups).length;
  const createdFiles = Object.entries(fileGroups).filter(([_, ops]) => 
    ops.some(op => op.type === 'created')
  ).length;
  
  // Extract just the filename from path for cleaner display
  const getFileName = (path: string) => path.split('/').pop() || path;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        delay: 0.3,
        ease: [0.19, 1, 0.22, 1]
      }}
      className="mt-6 mb-2"
    >
      <motion.div
        className={cn(
          "relative overflow-hidden",
          "inline-flex items-center gap-2.5 cursor-pointer",
          design.radius.xl,
          design.spacing.card,
          design.glass.bg.colored.emerald,
          "border border-emerald-500/20 backdrop-blur-xl",
          "transition-all duration-300",
          design.hover.scale,
          design.hover.glow,
          isExpanded && "rounded-b-lg"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Subtle shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 3
          }}
        />
        
        <div className="relative flex items-center gap-2.5">
          <div className="relative">
            <FileText className="w-4 h-4 text-emerald-400" />
            {createdFiles > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full"
              />
            )}
          </div>
          
          <span className="text-sm font-medium bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
            {fileCount} {fileCount === 1 ? 'file' : 'files'} 
            {createdFiles > 0 && ` • ${createdFiles} new`}
          </span>
          
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-1"
          >
            <ChevronRight className="w-3.5 h-3.5 text-emerald-400/60" />
          </motion.div>
        </div>
      </motion.div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              duration: 0.3,
              ease: [0.19, 1, 0.22, 1]
            }}
            className="overflow-hidden"
          >
            <div className={cn(
              "mt-2 ml-4",
              design.spacing.card,
              design.radius.lg,
              design.glass.bg.subtle,
              "border",
              design.glass.border.subtle
            )}>
              <div className="space-y-2">
                {Object.entries(fileGroups).map(([path, ops], index) => {
                  const isNew = ops.some(op => op.type === 'created');
                  const fileName = getFileName(path);
                  
                  return (
                    <motion.div
                      key={path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 group"
                    >
                      <div className="relative">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isNew ? "bg-emerald-400" : "bg-blue-400"
                        )} />
                        {isNew && (
                          <motion.div
                            className="absolute inset-0 rounded-full bg-emerald-400"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 0, 0.5]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity
                            }}
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 flex items-baseline gap-2">
                        <span className="text-sm font-mono text-white/80 group-hover:text-white/90 transition-colors">
                          {fileName}
                        </span>
                        <span className="text-xs text-white/40">
                          {isNew ? 'created' : `modified ${ops.length}x`}
                        </span>
                      </div>
                      
                      <motion.span 
                        className="text-xs text-white/30 font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={{ x: 10 }}
                        animate={{ x: 0 }}
                      >
                        {path}
                      </motion.span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Beautiful, minimal debug interface focused on what matters
export default function ChatDebugRefined() {
  // Use the default ACS client directly
  const [acsClient, setAcsClient] = useState<OrchestACSClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize ACS client on mount
  useEffect(() => {
    const initializeClient = async () => {
      try {
        const client = getDefaultACSClient();
        setAcsClient(client);
        
        // Try to initialize/restore authentication
        const initResult = await client.initialize();
        setIsInitialized(initResult.authenticated);
        
        console.log('🎯 [ChatDebugRefined] ACS Client initialized:', {
          authenticated: initResult.authenticated,
          user: initResult.user,
          error: initResult.error
        });
      } catch (error) {
        console.error('🚨 [ChatDebugRefined] Failed to initialize ACS client:', error);
        setAcsClient(null);
        setIsInitialized(false);
      }
    };
    
    initializeClient();
  }, []);
  
  // 🔄 UNIFIED TIMELINE STATE
  const [unifiedTimeline, setUnifiedTimeline] = useState<UnifiedTimelineEvent[]>([]);
  
  // Keep legacy timeline for backward compatibility during transition
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [showRealData, setShowRealData] = useState(false);
  const [realSessionData, setRealSessionData] = useState<TimelineEvent[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Verification state
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  
  // Real SSE connection state
  const [realSSEConnection, setRealSSEConnection] = useState<EventSource | null>(null);
  const [realSSEEvents, setRealSSEEvents] = useState<UnifiedTimelineEvent[]>([]);
  const [isConnectedToSSE, setIsConnectedToSSE] = useState(false);
  const [sseConnectionError, setSSEConnectionError] = useState<string | null>(null);
  
  // Separate Supabase events for side-by-side comparison
  const [supabaseEvents, setSupabaseEvents] = useState<UnifiedTimelineEvent[]>([]);
  
  // 🎬 REPLAY SYSTEM STATE
  const [replayState, setReplayState] = useState<ReplayState>({
    isPlaying: false,
    currentEventIndex: 0,
    speed: 1,
    totalEvents: 0,
    startTime: null,
    pausedAt: null
  });
  const [replayEvents, setReplayEvents] = useState<ReplayEvent[]>([]);
  const [replayedSupabaseEvents, setReplayedSupabaseEvents] = useState<UnifiedTimelineEvent[]>([]);
  const [replayedSSEEvents, setReplayedSSEEvents] = useState<UnifiedTimelineEvent[]>([]);
  const [replayMode, setReplayMode] = useState<'supabase' | 'sse' | 'both'>('both');
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // New state for better UX
  const [activeTools, setActiveTools] = useState<Map<string, ActiveTool>>(new Map());
  const [activeToolsByType, setActiveToolsByType] = useState<Map<string, ActiveTool>>(new Map()); // Track by tool type, not ID
  const [fileOperations, setFileOperations] = useState<FileOperation[]>([]);
  const [currentThinkBlocks, setCurrentThinkBlocks] = useState<Map<string, any>>(new Map());
  const [currentMessageFiles, setCurrentMessageFiles] = useState<FileOperation[]>([]);
  const [isAIResponding, setIsAIResponding] = useState(false);

  const [autoScroll, setAutoScroll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Update running tool durations
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update durations
      setActiveTools(prev => new Map(prev));
      setActiveToolsByType(prev => new Map(prev));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (realSSEConnection) {
        realSSEConnection.close();
      }
    };
  }, [realSSEConnection]);
  
  // 🎬 REPLAY SYSTEM LOGIC
  
  // Cleanup replay timer on unmount
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
    };
  }, []);
  
  // Prepare events for replay when data changes
  useEffect(() => {
    const allEvents = [...supabaseEvents, ...realSSEEvents];
    if (allEvents.length > 0) {
      const prepared = prepareEventsForReplay(allEvents);
      setReplayEvents(prepared);
      setReplayState(prev => ({
        ...prev,
        totalEvents: prepared.length,
        currentEventIndex: 0
      }));
    }
  }, [supabaseEvents, realSSEEvents]);
  
  // Replay controls
  const replayControls: ReplayControls = {
    play: () => {
      if (replayEvents.length === 0) return;
      
      setReplayState(prev => ({
        ...prev,
        isPlaying: true,
        startTime: Date.now() - (prev.pausedAt || 0)
      }));
      
      // Start replay timer
      const startReplayTimer = () => {
        if (replayTimerRef.current) {
          clearTimeout(replayTimerRef.current);
        }
        
        const processNextEvent = () => {
          setReplayState(currentState => {
            if (!currentState.isPlaying || currentState.currentEventIndex >= replayEvents.length) {
              return currentState;
            }
            
            const nextIndex = currentState.currentEventIndex + 1;
            const currentEvent = replayEvents[currentState.currentEventIndex];
            
            if (currentEvent) {
              // Add event to appropriate replay array based on source and replay mode
              if (currentEvent.event.source === 'supabase' && (replayMode === 'both' || replayMode === 'supabase')) {
                setReplayedSupabaseEvents(prev => [...prev, currentEvent.event]);
              } else if (currentEvent.event.source === 'sse' && (replayMode === 'both' || replayMode === 'sse')) {
                setReplayedSSEEvents(prev => [...prev, currentEvent.event]);
              }
            }
            
            // Calculate delay to next event
            if (nextIndex < replayEvents.length) {
              const nextEvent = replayEvents[nextIndex];
              const currentEventTime = currentEvent?.relativeTimestamp || 0;
              const nextEventTime = nextEvent.relativeTimestamp;
              const delay = Math.max(100, (nextEventTime - currentEventTime) / currentState.speed);
              
              replayTimerRef.current = setTimeout(processNextEvent, delay);
            } else {
              // Replay finished
              return {
                ...currentState,
                isPlaying: false,
                currentEventIndex: replayEvents.length
              };
            }
            
            return {
              ...currentState,
              currentEventIndex: nextIndex
            };
          });
        };
        
        // Start immediately with first event
        processNextEvent();
      };
      
      startReplayTimer();
    },
    
    pause: () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
      
      setReplayState(prev => ({
        ...prev,
        isPlaying: false,
        pausedAt: prev.startTime ? Date.now() - prev.startTime : 0
      }));
    },
    
    reset: () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
      
      setReplayState(prev => ({
        ...prev,
        isPlaying: false,
        currentEventIndex: 0,
        startTime: null,
        pausedAt: null
      }));
      
      setReplayedSupabaseEvents([]);
      setReplayedSSEEvents([]);
    },
    
    setSpeed: (speed: number) => {
      setReplayState(prev => ({
        ...prev,
        speed
      }));
    },
    
    seekTo: (eventIndex: number) => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
      
      const clampedIndex = Math.max(0, Math.min(eventIndex, replayEvents.length));
      
      // Rebuild replayed events up to the seek position, respecting replay mode
      const eventsToReplay = replayEvents.slice(0, clampedIndex);
      const newSupabaseEvents = eventsToReplay
        .filter(re => re.event.source === 'supabase' && (replayMode === 'both' || replayMode === 'supabase'))
        .map(re => re.event);
      const newSSEEvents = eventsToReplay
        .filter(re => re.event.source === 'sse' && (replayMode === 'both' || replayMode === 'sse'))
        .map(re => re.event);
      
      setReplayedSupabaseEvents(newSupabaseEvents);
      setReplayedSSEEvents(newSSEEvents);
      
      setReplayState(prev => ({
        ...prev,
        currentEventIndex: clampedIndex,
        isPlaying: false,
        startTime: null,
        pausedAt: null
      }));
    }
  };
  
  // Reset replay when mode changes
  useEffect(() => {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
    }
    
    setReplayState(prev => ({
      ...prev,
      isPlaying: false,
      currentEventIndex: 0,
      startTime: null,
      pausedAt: null
    }));
    
    setReplayedSupabaseEvents([]);
    setReplayedSSEEvents([]);
  }, [replayMode]);
  
  // Fetch real session data (matching SimpleChatDebug)
  const fetchRealSessionData = async (targetSessionId?: string) => {
    const sessionToFetch = targetSessionId || sessionId;
    setIsLoadingReal(true);
    setApiError(null);
    
    try {
      console.log(`🔍 Fetching live session data: ${sessionToFetch}`);
      
      // Check if ACS client is available and initialized
      if (!acsClient || !isInitialized) {
        throw new Error('ACS client not initialized. Please ensure you are logged in.');
      }
      
      // Use the EXACT same mechanism as the real chat route
      const response = await acsClient.sessions.getSession(sessionToFetch, {
        includeMessages: true
      });
      
      console.log(`✅ Successfully fetched session data:`, response.data);
      
      // 🔍 DEBUG: Log the FULL messages array with proper formatting
      console.log(`📋 [ChatDebugRefined] FULL messages array for session ${sessionToFetch}:`);
      console.log(JSON.stringify(response.data.messages, null, 2));
      
      // 🔄 UNIFIED PARSING: Convert Supabase messages to unified timeline events
      const unifiedEvents: UnifiedTimelineEvent[] = [];
      
      if (response.data.messages && Array.isArray(response.data.messages)) {
        response.data.messages.forEach((msg: any, index: number) => {
          console.log(`🕐 [ChatDebugRefined] Processing message ${index}:`, {
            role: msg.role,
            contentLength: msg.content?.length,
            timestamp: msg.timestamp,
            created_at: msg.created_at
          });
          
          // Use unified parsing function
          const messageEvents = parseSupabaseMessage(msg, index);
          unifiedEvents.push(...messageEvents);
        });
      }
      
      // Sort by timestamp for chronological order
      unifiedEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`🎯 [UNIFIED] Processed ${unifiedEvents.length} unified timeline events from ${response.data.messages?.length || 0} messages`);
      console.log(`📊 [UNIFIED] Event breakdown:`, {
        messages: unifiedEvents.filter(e => e.type === 'message').length,
        toolCalls: unifiedEvents.filter(e => e.type === 'tool_call').length,
        toolResults: unifiedEvents.filter(e => e.type === 'tool_result').length
      });
      
      // Update separate Supabase events for side-by-side comparison
      setSupabaseEvents(unifiedEvents);
      
      // Also update unified timeline for backward compatibility
      setUnifiedTimeline(unifiedEvents);
      
      // Convert to legacy format for backward compatibility
      const legacyEvents: TimelineEvent[] = unifiedEvents.map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data as any // Type assertion for compatibility
      }));
      
      setRealSessionData(legacyEvents);
      setSessionId(sessionToFetch); // Update current session ID
    } catch (error) {
      console.error('Failed to fetch real session data:', error);
      setRealSessionData([{
        id: 'error-msg',
        type: 'message',
        timestamp: Date.now(),
        data: {
          id: 'error-msg',
          role: 'assistant',
          content: `❌ Failed to load session ${sessionToFetch}\n\nError: ${error}\n\nUsing ACS Client: ${acsClient ? 'Available' : 'Not Available'}\nInitialized: ${isInitialized ? 'Yes' : 'No'}\nAuthenticated: ${acsClient?.isAuthenticated() ? 'Yes' : 'No'}\n\nPlease ensure you are logged in and the ACS service is running.`,
          timestamp: Date.now()
        }
      }]);
    } finally {
      setIsLoadingReal(false);
    }
  };

  // Load session with new ID
  const handleLoadSession = async () => {
    if (sessionIdInput.trim()) {
      await fetchRealSessionData(sessionIdInput.trim());
    }
  };

  // Toggle between mock and real data
  const handleToggleData = async () => {
    if (!showRealData && realSessionData.length === 0) {
      await fetchRealSessionData();
    }
    setShowRealData(!showRealData);
    setIsStreaming(false);
  };

  // Connect to real SSE stream for a session
  const connectToRealSSE = async (targetSessionId: string) => {
    console.log(`🔌 [SSE] Connecting to real SSE stream for session: ${targetSessionId}`);
    
    // Disconnect existing connection
    if (realSSEConnection) {
      realSSEConnection.close();
      setRealSSEConnection(null);
    }
    
    try {
      setSSEConnectionError(null);
      setIsConnectedToSSE(false);
      setRealSSEEvents([]);
      
      // Connect to the real Orchestra SSE service
      const sseUrl = `https://orchestra-sse-service.fly.dev/sse/${targetSessionId}`;
      console.log(`🔌 [SSE] Connecting to: ${sseUrl}`);
      
      const eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        console.log('✅ [SSE] Connected to real SSE stream');
        setIsConnectedToSSE(true);
        setSSEConnectionError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          console.log('📨 [SSE] Received event:', event.data);
          const eventData = JSON.parse(event.data);
          
          // Parse the real SSE event using our unified parser
          const unifiedEvent = parseSSEEvent(eventData);
          
          if (unifiedEvent) {
            console.log('🔄 [SSE] Parsed unified event:', unifiedEvent);
            setRealSSEEvents(prev => [...prev, unifiedEvent]);
            
            // Don't add to unified timeline - keep SSE and Supabase separate for side-by-side comparison
          }
        } catch (error) {
          console.error('❌ [SSE] Error parsing event:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ [SSE] Connection error:', error);
        setSSEConnectionError('Failed to connect to SSE stream. The session may not be active or the SSE service may be unavailable.');
        setIsConnectedToSSE(false);
      };
      
      setRealSSEConnection(eventSource);
      
    } catch (error) {
      console.error('❌ [SSE] Failed to connect:', error);
      setSSEConnectionError(`Failed to connect to SSE stream: ${error}`);
      setIsConnectedToSSE(false);
    }
  };
  
  // Disconnect from SSE stream
  const disconnectFromSSE = () => {
    if (realSSEConnection) {
      console.log('🔌 [SSE] Disconnecting from SSE stream');
      realSSEConnection.close();
      setRealSSEConnection(null);
      setIsConnectedToSSE(false);
      setSSEConnectionError(null);
    }
  };

  // Run verification between real SSE and Supabase data
  const runVerification = () => {
    console.log('🧪 [VERIFICATION] Starting data equivalence verification...');
    
    console.log('🧪 [VERIFICATION] Event counts:', {
      sse: realSSEEvents.length,
      supabase: supabaseEvents.length
    });
    
    // Run verification using separate arrays
    const result = verifyEventEquivalence(realSSEEvents, supabaseEvents);
    
    console.log('🧪 [VERIFICATION] Results:', result);
    
    setVerificationResult(result);
    setShowVerification(true);
  };

  // Get current timeline data based on toggle
  const currentTimeline = showRealData ? realSessionData : timeline;

  // Auto-scroll to bottom (disabled)
  useEffect(() => {
    // Auto-scroll disabled per user request
    return;
  }, [unifiedTimeline]);

  // Detect manual scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  // Start the mock SSE simulation (only in mock mode and when explicitly requested)
  useEffect(() => {
    // Don't auto-start simulation - wait for user to request it
    return;
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
    setActiveTools(new Map());
    setActiveToolsByType(new Map());
    setFileOperations([]);
    setCurrentThinkBlocks(new Map());
    setCurrentMessageFiles([]);
    setIsAIResponding(false);
    
    setTimeout(() => {
      const processNextEvent = (index: number) => {
        if (index >= mockOrchestraEvents.length) {
          setIsStreaming(false);
          return;
        }

        const eventData = mockOrchestraEvents[index];
        const processed = processSSEEvent(eventData);
        
        if (processed) {
          // 🔄 UNIFIED PARSING: Convert SSE event to unified format
          const unifiedEvent = parseSSEEvent(eventData);
          
          if (unifiedEvent) {
            // Add to unified timeline
            setUnifiedTimeline(prev => [...prev, unifiedEvent]);
          }
          
          // Legacy processing for backward compatibility
          if (processed.type === "chunk" && processed.content) {
            setIsAIResponding(true);
            setTimeline(prev => [...prev, {
              id: `chunk-${Date.now()}-${Math.random()}`,
              type: "message",
              timestamp: Date.now(),
              data: {
                id: `chunk-${Date.now()}-${Math.random()}`,
                role: "assistant",
                content: processed.content,
                timestamp: Date.now()
              }
            }]);
          } else if (processed.type === "tool_call" && processed.toolCall) {
            const toolCall = processed.toolCall;
            
            // Track think blocks specially
            if (toolCall.name === "think") {
              setCurrentThinkBlocks(prev => new Map(prev).set(toolCall.id, toolCall));
            } else {
              // Track other tools by ID for status updates
              const tool = {
                id: toolCall.id,
                name: toolCall.name,
                status: "running" as const,
                startTime: Date.now()
              };
              
              setActiveTools(prev => new Map(prev).set(toolCall.id, tool));
              
              // Also track by type for UI display (updates existing pill)
              setActiveToolsByType(prev => new Map(prev).set(toolCall.name, tool));
              
              // Track file operations from str_replace_editor
              if (toolCall.name === "str_replace_editor" && toolCall.input?.path) {
                setFileOperations(prev => {
                  const exists = prev.some(op => op.path === toolCall.input.path);
                  if (!exists) {
                    return [...prev, {
                      path: toolCall.input.path,
                      operation: "modified",
                      timestamp: Date.now()
                    }];
                  }
                  return prev;
                });
              }
            }
            
            setTimeline(prev => [...prev, {
              id: `tool-call-${Date.now()}`,
              type: "tool_call",
              timestamp: Date.now(),
              data: toolCall
            }]);
          } else if (processed.type === "tool_result" && processed.toolResult) {
            // Update tool status by ID
            setActiveTools(prev => {
              const newMap = new Map(prev);
              const tool = newMap.get(processed.toolResult!.id);
              if (tool) {
                tool.status = processed.toolResult!.success ? "completed" : "failed";
                tool.endTime = Date.now();
                
                // Also update by type
                setActiveToolsByType(prevType => {
                  const newTypeMap = new Map(prevType);
                  const existingByType = newTypeMap.get(tool.name);
                  if (existingByType && existingByType.id === tool.id) {
                    newTypeMap.set(tool.name, {...tool});
                  }
                  return newTypeMap;
                });
              }
              return newMap;
            });
            
            setTimeline(prev => [...prev, {
              id: `tool-result-${Date.now()}`,
              type: "tool_result",
              timestamp: Date.now(),
              data: processed.toolResult!
            }]);
          } else if (processed.type === "done") {
            setIsStreaming(false);
            setIsAIResponding(false);
            
            // Collect all file operations for this message using functional update
            setFileOperations(currentFileOps => {
              if (currentFileOps.length > 0) {
                setCurrentMessageFiles([...currentFileOps]);
                // Add a special timeline event for file summary
                setTimeline(prev => [...prev, {
                  id: `files-summary-${Date.now()}`,
                  type: "files_summary",
                  timestamp: Date.now(),
                  data: [...currentFileOps]
                }]);
                // Clear file operations for next message
                return [];
              }
              return currentFileOps;
            });
            
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
      {/* Minimal Header - Just Controls */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/50">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-light text-white/60">
                Debug Session
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* 🎬 REPLAY CONTROLS */}
              {replayEvents.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/20 rounded-lg">
                  <button
                    onClick={replayControls.reset}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Reset to beginning"
                  >
                    <SkipBack className="w-3 h-3 text-white/60" />
                  </button>
                  
                  <button
                    onClick={replayState.isPlaying ? replayControls.pause : replayControls.play}
                    disabled={replayEvents.length === 0}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title={replayState.isPlaying ? "Pause replay" : "Start replay"}
                  >
                    {replayState.isPlaying ? (
                      <Pause className="w-3 h-3 text-white/80" />
                    ) : (
                      <Play className="w-3 h-3 text-white/80" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => replayControls.seekTo(replayEvents.length)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Skip to end"
                  >
                    <SkipForward className="w-3 h-3 text-white/60" />
                  </button>
                  
                  {/* Speed Control */}
                  <select
                    value={replayState.speed}
                    onChange={(e) => replayControls.setSpeed(Number(e.target.value))}
                    className="ml-1 px-1 py-0.5 text-xs bg-transparent border border-white/20 rounded text-white/80"
                  >
                    <option value={0.25}>0.25x</option>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                  
                  {/* Progress Indicator */}
                  <div className="flex items-center gap-1 ml-2 text-xs text-white/60">
                    <span>{replayState.currentEventIndex}</span>
                    <span>/</span>
                    <span>{replayState.totalEvents}</span>
                    {replayEvents.length > 0 && (
                      <span className="ml-1 text-white/40">
                        ({Math.round(calculateReplayDuration(replayEvents) / 1000)}s)
                      </span>
                    )}
                  </div>
                  
                  {/* Progress Bar - Clickable for seeking */}
                  <div 
                    className="w-16 h-1 bg-white/20 rounded-full overflow-hidden ml-1 cursor-pointer hover:h-2 transition-all duration-200"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const targetIndex = Math.floor(percentage * replayState.totalEvents);
                      replayControls.seekTo(targetIndex);
                    }}
                    title="Click to seek"
                  >
                    <div 
                      className="h-full bg-blue-400 transition-all duration-200"
                      style={{ 
                        width: `${replayState.totalEvents > 0 ? (replayState.currentEventIndex / replayState.totalEvents) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* SSE Connection Button */}
              <button
                onClick={() => isConnectedToSSE ? disconnectFromSSE() : connectToRealSSE(sessionId)}
                disabled={!sessionId}
                className={cn(
                  "flex items-center gap-2",
                  design.spacing.button,
                  design.text.xs,
                  design.radius.lg,
                  "transition-all duration-200",
                  "border backdrop-blur-sm",
                  isConnectedToSSE
                    ? "bg-red-500/[0.08] border-red-500/20 text-red-300 hover:bg-red-500/[0.12]"
                    : "bg-blue-500/[0.08] border-blue-500/20 text-blue-300 hover:bg-blue-500/[0.12]",
                  design.hover.scale,
                  !sessionId && "opacity-50 cursor-not-allowed"
                )}
              >
                <ChevronRight className={cn("w-3 h-3", isConnectedToSSE && "rotate-90")} />
                {isConnectedToSSE ? 'Disconnect SSE' : 'Connect SSE'}
              </button>
              
              {/* Verification Button */}
              <button
                onClick={runVerification}
                disabled={realSSEEvents.length === 0 || supabaseEvents.length === 0}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                  "border backdrop-blur-sm",
                  "bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20",
                  (realSSEEvents.length === 0 || supabaseEvents.length === 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Sparkles className="w-3 h-3" />
                Verify
              </button>
              
              {/* Session ID Input - Always show */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sessionIdInput}
                  onChange={(e) => setSessionIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadSession()}
                  placeholder="Enter Session ID..."
                  className="px-3 py-1.5 text-xs bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 w-80"
                />
                <button
                  onClick={handleLoadSession}
                  disabled={isLoadingReal || !sessionIdInput.trim()}
                  className={cn(
                    design.spacing.button,
                    design.text.xs,
                    design.radius.lg,
                    "transition-all duration-200",
                    "border backdrop-blur-sm",
                    "bg-blue-500/[0.08] border-blue-500/20 text-blue-300",
                    "hover:bg-blue-500/[0.12]",
                    design.hover.scale,
                    (isLoadingReal || !sessionIdInput.trim()) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isLoadingReal ? 'Loading...' : 'Load Session'}
                </button>
                
                {/* Refresh Supabase Data Button */}
                {sessionId && (
                  <button
                    onClick={() => fetchRealSessionData(sessionId)}
                    disabled={isLoadingReal}
                    className={cn(
                      design.spacing.button,
                      design.text.xs,
                      design.radius.lg,
                      "transition-all duration-200",
                      "border backdrop-blur-sm",
                      design.glass.bg.colored.purple,
                      "border-purple-500/20 text-purple-300",
                      "hover:bg-purple-500/[0.12]",
                      design.hover.scale,
                      isLoadingReal && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    ↻ Refresh
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef} onScroll={handleScroll}>
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          {/* API Error Display */}
          {showRealData && apiError && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-medium">API Error</span>
              </div>
              <div className="text-red-200 text-sm whitespace-pre-wrap">{apiError}</div>
            </div>
          )}
          
          {/* Session Info Display */}
          {!apiError && (supabaseEvents.length > 0 || realSSEEvents.length > 0) && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-green-300 font-medium">Session Data Sources</span>
              </div>
              <div className="text-green-200 text-sm">
                Session: <code className="bg-black/30 px-2 py-1 rounded">{sessionId}</code>
                <br />
                Supabase Events: {supabaseEvents.length}
                <br />
                SSE Events: {realSSEEvents.length}
                {realSSEEvents.length > 0 && supabaseEvents.length > 0 && (
                  <>
                    <br />
                    <span className="text-green-300">✅ Ready for verification</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* SSE Connection Status */}
          {(isConnectedToSSE || sseConnectionError) && (
            <div className={cn(
              "rounded-lg p-4 mb-4 border",
              isConnectedToSSE 
                ? "bg-blue-900/20 border-blue-500/30" 
                : "bg-red-900/20 border-red-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {isConnectedToSSE ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={cn(
                  "font-medium",
                  isConnectedToSSE ? "text-blue-300" : "text-red-300"
                )}>
                  SSE Connection {isConnectedToSSE ? 'Active' : 'Failed'}
                </span>
              </div>
              <div className={cn(
                "text-sm",
                isConnectedToSSE ? "text-blue-200" : "text-red-200"
              )}>
                {isConnectedToSSE ? (
                  <>
                    Connected to: <code className="bg-black/30 px-2 py-1 rounded">
                      https://orchestra-sse-service.fly.dev/sse/{sessionId}
                    </code>
                    <br />
                    Real-time events: {realSSEEvents.length}
                  </>
                ) : (
                  sseConnectionError
                )}
              </div>
            </div>
          )}
          
          {/* Verification Results Display */}
          {showVerification && verificationResult && (
            <div className={cn(
              "rounded-lg p-4 mb-4 border",
              verificationResult.isEquivalent 
                ? "bg-green-900/20 border-green-500/30" 
                : "bg-orange-900/20 border-orange-500/30"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {verificationResult.isEquivalent ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-orange-400" />
                  )}
                  <span className={cn(
                    "font-medium",
                    verificationResult.isEquivalent ? "text-green-300" : "text-orange-300"
                  )}>
                    Data Verification Results
                  </span>
                </div>
                <button
                  onClick={() => setShowVerification(false)}
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "font-medium",
                    verificationResult.isEquivalent ? "text-green-200" : "text-orange-200"
                  )}>
                    Status: {verificationResult.isEquivalent ? 'Equivalent ✅' : 'Discrepancies Found ⚠️'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-white/60">SSE Events:</span>
                    <span className="ml-2 text-white/80">{verificationResult.statistics.sseEventCount}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Supabase Events:</span>
                    <span className="ml-2 text-white/80">{verificationResult.statistics.supabaseEventCount}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Discrepancies:</span>
                    <span className="ml-2 text-white/80">{verificationResult.discrepancies.length}</span>
                  </div>
                </div>
                
                {verificationResult.discrepancies.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-orange-200 font-medium">Discrepancies Found:</div>
                    {verificationResult.discrepancies.slice(0, 5).map((discrepancy, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-xs">
                        <div className="text-orange-300 font-medium">{discrepancy.type}</div>
                        <div className="text-white/70">{discrepancy.description}</div>
                        {discrepancy.details && (
                          <details className="mt-1">
                            <summary className="text-white/50 cursor-pointer">Details</summary>
                            <pre className="text-xs text-white/60 mt-1 overflow-x-auto">
                              {JSON.stringify(discrepancy.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                    {verificationResult.discrepancies.length > 5 && (
                      <div className="text-white/50 text-xs">
                        ... and {verificationResult.discrepancies.length - 5} more discrepancies
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Welcome Message - Show when no session loaded */}
          {supabaseEvents.length === 0 && realSSEEvents.length === 0 && !isLoadingReal && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6">
                <Activity className="w-8 h-8 text-blue-300" />
              </div>
              <h2 className="text-xl font-medium text-white mb-3">
                Orchestra SSE Debug Harness
              </h2>
              <p className="text-white/60 mb-6 max-w-md">
                Enter a session ID above to load conversation data and connect to real-time SSE streams for verification.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-lg">
                <h3 className="text-sm font-medium text-white/80 mb-2">How to use:</h3>
                <ol className="text-xs text-white/60 space-y-1 text-left">
                  <li>1. Enter a session ID in the input field above</li>
                  <li>2. Click "Load Session" to fetch Supabase data</li>
                  <li>3. Click "Connect SSE" to connect to live stream</li>
                  <li>4. Click "Verify" to compare data sources</li>
                </ol>
              </div>
            </div>
          )}
          
          {/* 🔄 SIDE-BY-SIDE DATA COMPARISON WITH REPLAY */}
          {(supabaseEvents.length > 0 || realSSEEvents.length > 0) && (
            <div className="relative">
              {/* Replay Mode Toggle */}
              {replayEvents.length > 0 && (
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/20 rounded-lg">
                    <span className="text-xs text-white/60">Replay Mode:</span>
                    <button
                      onClick={() => setReplayMode('both')}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        replayMode === 'both' 
                          ? "bg-blue-500/20 text-blue-300" 
                          : "text-white/60 hover:text-white/80"
                      )}
                    >
                      Both
                    </button>
                    <button
                      onClick={() => setReplayMode('supabase')}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        replayMode === 'supabase' 
                          ? "bg-purple-500/20 text-purple-300" 
                          : "text-white/60 hover:text-white/80"
                      )}
                    >
                      Supabase Only
                    </button>
                    <button
                      onClick={() => setReplayMode('sse')}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        replayMode === 'sse' 
                          ? "bg-green-500/20 text-green-300" 
                          : "text-white/60 hover:text-white/80"
                      )}
                    >
                      SSE Only
                    </button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column: Supabase Data */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <h3 className="text-lg font-medium text-white">Supabase Data</h3>
                    <span className="text-xs text-white/60 bg-purple-500/20 px-2 py-1 rounded-full">
                      {replayState.isPlaying || replayState.currentEventIndex > 0 
                        ? `${replayedSupabaseEvents.length}/${supabaseEvents.length}` 
                        : `${supabaseEvents.length}`} events
                    </span>
                    {replayState.isPlaying && (
                      <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full animate-pulse">
                        🎬 REPLAYING
                      </span>
                    )}
                  </div>
                  
                  {(replayState.isPlaying || replayState.currentEventIndex > 0 ? replayedSupabaseEvents : supabaseEvents).length === 0 ? (
                    <div className="text-center py-8 text-white/40 border border-white/10 rounded-lg">
                      {supabaseEvents.length === 0 ? (
                        <>
                          No Supabase data loaded
                          <br />
                          <span className="text-xs">Load a session to see database events</span>
                        </>
                      ) : (
                        <>
                          Replay not started
                          <br />
                          <span className="text-xs">Click play to begin replay</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {renderGroupedEvents(
                        replayState.isPlaying || replayState.currentEventIndex > 0 
                          ? replayedSupabaseEvents 
                          : supabaseEvents,
                        replayState.isPlaying && replayState.currentEventIndex < replayEvents.length 
                          ? replayEvents[replayState.currentEventIndex]?.event.id 
                          : undefined
                      )}
                    </div>
                  )}
                </div>
                
                {/* Right Column: SSE Stream */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      isConnectedToSSE ? "bg-green-500 animate-pulse" : "bg-gray-500"
                    )}></div>
                    <h3 className="text-lg font-medium text-white">SSE Stream</h3>
                    <span className="text-xs text-white/60 bg-green-500/20 px-2 py-1 rounded-full">
                      {replayState.isPlaying || replayState.currentEventIndex > 0 
                        ? `${replayedSSEEvents.length}/${realSSEEvents.length}` 
                        : `${realSSEEvents.length}`} events
                    </span>
                    {isConnectedToSSE && (
                      <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
                        🔴 LIVE
                      </span>
                    )}
                    {replayState.isPlaying && (
                      <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full animate-pulse">
                        🎬 REPLAYING
                      </span>
                    )}
                  </div>
                  
                  {(replayState.isPlaying || replayState.currentEventIndex > 0 ? replayedSSEEvents : realSSEEvents).length === 0 ? (
                    <div className="text-center py-8 text-white/40 border border-white/10 rounded-lg">
                      {realSSEEvents.length === 0 ? (
                        isConnectedToSSE ? (
                          <>
                            Connected - waiting for events
                            <br />
                            <span className="text-xs">Events will appear here in real-time</span>
                          </>
                        ) : (
                          <>
                            No SSE connection
                            <br />
                            <span className="text-xs">Connect to SSE to see real-time events</span>
                          </>
                        )
                      ) : (
                        <>
                          Replay not started
                          <br />
                          <span className="text-xs">Click play to begin replay</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {renderGroupedEvents(
                        replayState.isPlaying || replayState.currentEventIndex > 0 
                          ? replayedSSEEvents 
                          : realSSEEvents,
                        replayState.isPlaying && replayState.currentEventIndex < replayEvents.length 
                          ? replayEvents[replayState.currentEventIndex]?.event.id 
                          : undefined
                      )}
                    </div>
                  )}
                </div>
              </div>
              

            </div>
          )}
          
          {/* 🔧 LEGACY TIMELINE RENDERING (for backward compatibility) */}
          {false && currentTimeline.map((event, eventIndex) => {
            if (event.type === 'message') {
              const message = event.data as Message;
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "border backdrop-blur-sm",
                      message.role === 'user' 
                        ? "bg-blue-500/10 border-blue-500/30" 
                        : "bg-white/5 border-white/20"
                    )}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-blue-300" />
                      ) : (
                        <Bot className="w-4 h-4 text-white/60" />
                      )}
                    </div>
                  </div>
                  
                  {/* Message Content */}
                  <div className={cn(
                    "flex-1 max-w-[85%]",
                    message.role === 'user' && "flex justify-end"
                  )}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3",
                      "backdrop-blur-sm transition-all duration-200",
                      message.role === 'user'
                        ? "bg-blue-500/10 border border-blue-500/30 text-white"
                        : "bg-white/5 border border-white/10 text-white/90"
                    )}>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                      <div className={cn(
                        "text-xs mt-2 opacity-50",
                        message.role === 'user' ? "text-right" : "text-left"
                      )}>
                        {(() => {
                          try {
                            const date = new Date(message.timestamp);
                            return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleTimeString();
                          } catch {
                            return 'Unknown time';
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else if (event.type === 'tool_call') {
              const toolCall = event.data as ToolCall;
              
              // Think blocks get special treatment
              if (toolCall.name === 'think') {
                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8" /> {/* Spacer to align with messages */}
                    </div>
                    <div className="flex-1 max-w-[85%]">
                      <ThinkBlockDisplay
                        content={toolCall.input?.thought || 'Processing...'}
                        timestamp={toolCall.timestamp}
                        id={toolCall.id}
                        defaultExpanded={false}
                      />
                    </div>
                  </div>
                );
              }
              
              // Check if this is the first call of this tool type in the timeline
              const toolTypeFirstCall = currentTimeline
                .slice(0, eventIndex)
                .filter(e => e.type === 'tool_call' && (e.data as ToolCall).name === toolCall.name)
                .length === 0;
              
              // Only show pill for the first occurrence of each tool type
              if (toolTypeFirstCall) {
                const toolByType = activeToolsByType.get(toolCall.name);
                return (
                  <div key={`tool-${toolCall.name}`} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8" /> {/* Spacer */}
                    </div>
                    <div className="flex-1 max-w-[85%]">
                      <div className="py-2">
                        {toolByType && <InlineToolPill tool={toolByType} />}
                      </div>
                    </div>
                  </div>
                );
              }
              
              return null; // Don't show duplicate pills for same tool type
            } else if (event.type === 'tool_result') {
              const toolResult = event.data as ToolResult;
              
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8" /> {/* Spacer */}
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div className={cn(
                      "rounded-xl border p-3 mt-2 backdrop-blur-sm",
                      toolResult.success 
                        ? "bg-green-900/20 border-green-500/30" 
                        : "bg-red-900/20 border-red-500/30"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        {toolResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className={cn(
                          "text-xs font-medium",
                          toolResult.success ? "text-green-300" : "text-red-300"
                        )}>
                          {toolResult.toolName} {toolResult.success ? 'completed' : 'failed'}
                        </span>
                        <span className="text-xs text-white/40 ml-auto">
                          {(() => {
                            try {
                              const date = new Date(toolResult.timestamp);
                              return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleTimeString();
                            } catch {
                              return 'Unknown time';
                            }
                          })()}
                        </span>
                      </div>
                      
                      {toolResult.success && toolResult.result && (
                        <div className="text-sm text-white/80 whitespace-pre-wrap font-mono bg-black/20 rounded p-2 max-h-32 overflow-y-auto">
                          {typeof toolResult.result === 'string' 
                            ? toolResult.result 
                            : JSON.stringify(toolResult.result, null, 2)}
                        </div>
                      )}
                      
                      {!toolResult.success && toolResult.error && (
                        <div className="text-sm text-red-200 whitespace-pre-wrap font-mono bg-black/20 rounded p-2 max-h-32 overflow-y-auto">
                          {toolResult.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else if (event.type === 'files_summary') {
              const files = event.data as FileOperation[];
              if (files.length === 0) return null;
              
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8" /> {/* Spacer */}
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3 mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-white/40" />
                        <span className="text-xs font-medium text-white/60">Files modified</span>
                      </div>
                      <div className="space-y-1">
                        {files.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              file.operation === 'created' ? "bg-green-400" : "bg-blue-400"
                            )} />
                            <span className="text-white/40">{file.operation}</span>
                            <span className="text-white/80 font-mono">{file.path}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            return null;
          })}

          {/* Elegant Typing Indicator */}
          {isStreaming && !showRealData && (
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/20 backdrop-blur-sm">
                  <Bot className="w-4 h-4 text-white/40" />
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>



      {/* Minimal Footer */}
      <div className="border-t border-white/10 backdrop-blur-xl bg-black/50 px-6 py-2">
        <div className="flex items-center justify-center">
          <span className="text-xs text-white/30">Debug Interface</span>
        </div>
      </div>
    </div>
  );
}