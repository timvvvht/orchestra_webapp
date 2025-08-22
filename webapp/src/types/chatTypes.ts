// src/types/chatTypes.ts
// Centralized type definitions for chat domain/UI-facing structures.

export enum ChatRole {
  User = "user",
  Assistant = "assistant",
  System = "system",
  Error = "error",
  Tool = "tool",
}

export interface TextPart {
  type: "text";
  text: string;
}

export interface ToolUsePart {
  type: "tool_use";
  id: string; // Corresponds to tool_call_id in DB message, or a specific part id
  name: string;
  input: any;
}

export interface ToolResultPart {
  type: "tool_result";
  tool_use_id: string; // Corresponds to responding_to_tool_use_id in DB message
  content: string; // Or any, if it can be structured
  is_error?: boolean;
}

// This RichContentPart is the structure expected by the UI and store state.
export type RichContentPart = TextPart | ToolUsePart | ToolResultPart;

// Tool interaction represents a complete or in-progress tool interaction
export interface ToolInteraction {
  status: "running" | "completed" | "failed";
  toolCall: ToolUsePart;
  toolResult?: ToolResultPart;
  startTime?: number; // Unix timestamp when tool call started
  endTime?: number; // Unix timestamp when tool result completed
}

// This ChatMessage is the structure expected by the UI and store state.
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: RichContentPart[];
  createdAt: number; // Unix timestamp (milliseconds)
  isStreaming?: boolean;
  model?: string;
  thinking?: boolean;
  reasoning?: string[];
  delivered?: boolean;
  read?: boolean;
  status?:
    | "optimistic"
    | "sending"
    | "sent"
    | "error"
    | "delivered_to_rust"
    | "persisted_db";
  error?: string;
  type?: "checkpoint" | "message"; // Message type for special rendering
  meta?: Record<string, any>; // Additional metadata for special message types
  debugSourceEvent?: {
    type: string;
    triggerEventId?: string;
  };
  images: string[];
}

// This SessionMeta is the structure expected by the UI and store state (for session list).
export interface SessionMeta {
  id: string;
  name: string;
  avatar: string;
  lastUpdated: number; // Unix timestamp (milliseconds)
  createdAt: number; // Unix timestamp (milliseconds) - Added
  unreadCount: number;
  display_title?: string | null;
  agent_config_id?: string | null; // Added
  parent_session_id?: string | null;
  fork_message_id?: string | null;
}

// This ChatSession is the structure expected by the UI and store state (for an active chat).
export interface ChatSession {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  messages: ChatMessage[];
  model: string;
  tools: string[]; // Names or IDs of tools
  createdAt: number; // Unix timestamp (milliseconds)
  lastUpdated: number; // Unix timestamp (milliseconds)
  systemPrompt?: string;
  temperature?: number;
  agent_config_id?: string | null; // From Supabase table
  user_id?: string | null; // From Supabase table
  metadata?: Record<string, any>; // Store other Supabase metadata here
  initialAgentSnapshot?: Record<string, any> | null; // From Supabase initial_agent_snapshot field
  // Forking-related fields
  parentSessionId?: string | null; // ID of the parent session if this is a fork
  forkMessageId?: string | null; // ID of the message where this conversation was forked
  displayTitle?: string | null; // Optional descriptive title for this fork

  // New fields for AI context caching
  fullHistory?: ChatMessage[];
  fullHistoryStatus?: "idle" | "loading" | "loaded" | "error";

  // Project context - agent working directory for this session
  agent_cwd?: string | null; // Maps to agent_cwd column in database
}

// --- Service Data Transfer Object shapes (if different from store shapes) ---
// These types are for what the ChatService functions will primarily deal with when interacting with Supabase rows.
// The service will then map these to the UI/Store types above.

/**
 * Represents a minimal message history item from the Python worker.
 * Used for converting worker history items to full ChatMessage objects.
 */
export interface WorkerHistoryItem {
  id?: string;
  role?: string;
  content?: RichContentPart[];
  timestamp?: number | string;
  model?: string;
}

// Make sure this interface is compatible with Json type from supabase.ts
export interface SupabaseRichContentPart {
  type: "text" | "image_url" | "tool_use" | "tool_output";
  text?: string;
  image_url?: { url: string; detail?: "low" | "high" | "auto" };
  tool_use_id?: string;
  tool_name?: string;
  tool_input?: any;
  tool_use_id_for_output?: string;
  output?: any;
  status?: "ok" | "error";
  [key: string]: any; // Add index signature to make it compatible with Json type
}

// Type for a row from Supabase 'chat_messages' table
export interface SupabaseDbChatMessage {
  id: string;
  session_id: string;
  role: string; // Raw role from DB, might need mapping to ChatRole enum
  content: SupabaseRichContentPart[]; // Or Json if not strictly typed from DB
  timestamp: string; // ISO 8601 timestamp string from DB
  model_used?: string | null;
  tool_call_id?: string | null;
  responding_to_tool_use_id?: string | null;
}

// Type for a row from Supabase 'chat_sessions' table
export interface SupabaseDbChatSession {
  id: string;
  user_id?: string | null;
  agent_config_id?: string | null;
  name: string;
  avatar_url?: string | null;
  created_at: string; // ISO 8601 timestamp string
  last_message_at?: string | null; // ISO 8601 timestamp string
  metadata?: Record<string, any> | null;
  initial_agent_snapshot?: Record<string, any> | null;
  // Forking-related fields
  parent_session_id?: string | null;
  fork_message_id?: string | null;
  display_title?: string | null;
  // Project context - agent working directory
  agent_cwd?: string | null; // Maps to agent_cwd column in database
}

// Types for data payload when creating/updating via service, matching DB structure
// These are what the service layer uses to prepare data FOR Supabase
export type DbNewChatSession = Partial<
  Pick<
    SupabaseDbChatSession,
    | "name"
    | "avatar_url"
    | "agent_config_id"
    | "metadata"
    | "user_id"
    | "parent_session_id"
    | "fork_message_id"
    | "display_title"
    | "agent_cwd"
  > & { id?: string; initial_agent_snapshot?: Record<string, any> | null }
>;
export type DbUpdateChatSession = Partial<
  Pick<
    SupabaseDbChatSession,
    "name" | "avatar_url" | "metadata" | "last_message_at"
  > & { initial_agent_snapshot?: Record<string, any> | null }
>;
// This one is for preparing data to send TO the database, so it takes the common ChatMessage type
// but transforms it into something the DB insert expects (e.g. string timestamp, specific content structure)
export type DbNewChatMessage = {
  id?: string; // Optional: service can generate
  session_id: string;
  role: string; // raw string for DB
  content: SupabaseRichContentPart[]; // raw content for DB
  timestamp?: string; // Optional: service can generate ISO string
  model_used?: string | null;
  tool_call_id?: string | null;
  responding_to_tool_use_id?: string | null;
};

// add at bottom or appropriate section
export interface TokenEvent {
  type: "token";
  sessionId: string;
  messageId: string;
  delta: string;
  seq: number;
}
export interface ToolCallEvent {
  type: "tool_call";
  sessionId: string;
  messageId: string;
  toolCall: any;
}
export interface ToolResultEvent {
  type: "tool_result";
  sessionId: string;
  messageId: string;
  result: any;
}
export interface DoneEvent {
  type: "done";
  sessionId: string;
}
export interface FinalHistoryEvent {
  type: "final_message_history";
  sessionId: string;
  messageId: string;
  history: any[];
}
export type AgentEvent =
  | TokenEvent
  | ToolCallEvent
  | ToolResultEvent
  | DoneEvent
  | FinalHistoryEvent;

// Forking-related types
export interface ForkRequest {
  messageId: string;
  name?: string;
  displayTitle?: string;
}

export interface ForkInfo {
  id: string;
  name: string;
  displayTitle?: string;
  createdAt: number;
  forkMessageId: string;
}

export interface ConversationAncestry {
  id: string;
  name: string;
  displayTitle?: string;
  depthLevel: number;
}

export interface ForkedMessage extends ChatMessage {
  isFromParent: boolean;
}

// API response types for forking functions
export interface GetForkedConversationResponse {
  message_id: string;
  session_id: string;
  role: string;
  content: any;
  message_timestamp: string;
  model_used?: string;
  tool_call_id?: string;
  responding_to_tool_use_id?: string;
  metadata?: any;
  is_from_parent: boolean;
}

export interface GetConversationForksResponse {
  fork_id: string;
  fork_name: string;
  fork_display_title?: string;
  fork_created_at: string;
  fork_message_id: string;
}

export interface GetForkAncestryResponse {
  ancestor_id: string;
  ancestor_name: string;
  ancestor_display_title?: string;
  depth_level: number;
}

// Session metadata type for complete session configuration
export interface SessionMetadata {
  model: string;
  tools: string[];
  specialty: string;
  avatar: string;
  system_prompt: string;
  temperature: number;
  [key: string]: any; // Allow additional metadata fields
}
