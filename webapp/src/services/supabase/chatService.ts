import { getCurrentUserId } from "@/lib/userUtils";
import { supabase } from "./supabaseClient";
import {
  ChatMessage,
  ChatRole,
  ChatSession,
  DbNewChatMessage,
  DbNewChatSession,
  DbUpdateChatSession,
  RichContentPart,
  SessionMeta,
  SupabaseDbChatMessage,
  SupabaseDbChatSession,
  SupabaseRichContentPart,
  TextPart,
  ToolUsePart,
  ToolResultPart,
  ForkRequest,
  ForkInfo,
  ConversationAncestry,
  ForkedMessage,
  GetForkedConversationResponse,
  GetConversationForksResponse,
  GetForkAncestryResponse,
  ChatMessagePayloadFE,
  ChatMessageContentPart,
} from "@/types/chatTypes";
import { Json } from "@/types/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";
import {
  buildSessionMetadata,
  SessionMetadataInput,
} from "@/utils/buildSessionMetadata";

// Define Supabase table types using generic helpers
type SupabaseChatSessionRow = Tables<"chat_sessions">;
type SupabaseChatMessageRow = Tables<"chat_messages">;
type SupabaseInsertChatMessage = TablesInsert<"chat_messages">;
type SupabaseInsertChatSession = TablesInsert<"chat_sessions">;
type SupabaseUpdateChatSession = TablesUpdate<"chat_sessions">;

import { v4 as uuidv4 } from "uuid";
import { getOrSetAnonymousUserId } from "@/lib/authUtils";

// Add this interface definition
export interface GetChatMessagesOptions {
  limit?: number;
  orderBy?: {
    column: string;
    ascending: boolean;
  };
  cursor?: {
    timestamp: string; // ISO string
    id?: string; // For tie-breaking
    direction: "olderThan" | "newerThan";
  };
}

// Module-level timestamp tracking for unique, strictly increasing timestamps
let lastGeneratedTs = 0;
const nextIsoTimestamp = (): string => {
  let now = Date.now();
  if (now <= lastGeneratedTs) now = lastGeneratedTs + 1;
  lastGeneratedTs = now;
  return new Date(now).toISOString();
};

// Helper function for safe date parsing to epoch milliseconds
const parseDateSafelyToEpochMs = (
  dateString: string | null | undefined
): number => {
  if (!dateString) {
    return NaN;
  }
  const date = new Date(dateString);
  const time = date.getTime();
  return time;
};
/**
 * Updates the display_title for a chat session
 */
export const updateSessionTitle = async (
  sessionId: string,
  displayTitle: string
): Promise<void> => {
  try {
    const currentUserId = await getCurrentUserId();
    const { error } = await supabase
      .from("chat_sessions")
      .update({ display_title: displayTitle })
      .eq("id", sessionId)
      .eq("user_id", currentUserId);

    if (error) throw error;
    console.log(
      `[chatService] Updated session title for ${sessionId}: "${displayTitle}"`
    );
  } catch (error) {
    console.error(
      `[chatService] Error updating session title for ${sessionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Maps a Supabase ChatSession to the frontend SessionMeta type
 * @param dbSession The Supabase ChatSession to map
 * @returns The mapped SessionMeta
 */
const mapToSessionMeta = (
  dbSession: SupabaseChatSessionRow & {
    metadata_avatar_url?: string;
    metadata_agent_name?: string;
  }
): SessionMeta => {
  // Use safe date parsing to handle invalid timestamps
  const createdAt = parseDateSafelyToEpochMs(dbSession.created_at);
  const lastUpdated = parseDateSafelyToEpochMs(
    dbSession.last_message_at || dbSession.created_at
  );

  return {
    id: dbSession.id,
    name: dbSession.name,
    avatar: dbSession.metadata_avatar_url || "assets/robots/robot1.png",
    createdAt: isNaN(createdAt) ? Date.now() : createdAt, // Fallback to current time if invalid
    lastUpdated: isNaN(lastUpdated) ? Date.now() : lastUpdated, // Fallback to current time if invalid
    unreadCount: 0,
    display_title: dbSession.display_title,
    agent_config_id: dbSession.agent_config_id || null, // Added/Ensured
    parent_session_id: dbSession.parent_session_id || null, // Ensure this is mapped
    fork_message_id: dbSession.fork_message_id || null, // Ensure this is mapped
  };
};

/**
 * Maps a Supabase ChatSession and messages to the frontend ChatSession type
 * @param dbSession The Supabase ChatSession to map
 * @param messages The messages for this session
 * @returns The mapped ChatSession
 */
const mapToChatSession = (
  dbSession: SupabaseChatSessionRow,
  messages: ChatMessage[] = []
): ChatSession => {
  const metadata = (dbSession.metadata as Record<string, any>) || {};

  // Use safe date parsing to handle invalid timestamps
  const createdAt = parseDateSafelyToEpochMs(dbSession.created_at);
  const lastUpdated = parseDateSafelyToEpochMs(
    dbSession.last_message_at || dbSession.created_at
  );

  return {
    id: dbSession.id,
    name: dbSession.name,
    avatar: metadata.avatar || "assets/robots/robot1.png",
    specialty: metadata.specialty || "General Assistant",
    messages: messages,
    model: metadata.model || "gpt-4o-mini",
    tools: metadata.tools || [],
    createdAt: isNaN(createdAt) ? Date.now() : createdAt, // Fallback to current time if invalid
    lastUpdated: isNaN(lastUpdated) ? Date.now() : lastUpdated, // Fallback to current time if invalid
    systemPrompt: metadata.system_prompt,
    temperature: metadata.temperature,
    agent_config_id: dbSession.agent_config_id,
    user_id: dbSession.user_id,
    metadata: metadata,
    initialAgentSnapshot:
      (dbSession.initial_agent_snapshot as Record<string, any>) || null,
    // Forking-related fields
    parentSessionId: dbSession.parent_session_id,
    forkMessageId: dbSession.fork_message_id,
    displayTitle: dbSession.display_title,
    // New fields for AI context caching
    fullHistory: undefined, // Initialize fullHistory cache
    fullHistoryStatus: "idle", // Initial status for the cache
  };
};

/**
 * Safely converts Supabase Json content to RichContentPart[]
 * @param content The Json content from Supabase
 * @returns Properly typed RichContentPart array
 */
const convertJsonToRichContent = (content: Json): RichContentPart[] => {
  if (!Array.isArray(content)) {
    // If not an array, create a single text part with string representation
    return [{ type: "text", text: String(content) }];
  }

  console.log(
    "[chatService] Converting content array with",
    content.length,
    "items"
  );

  // Map each item in the array to a valid RichContentPart
  return content.map((item, index) => {
    console.log(
      `[chatService] Converting item ${index}:`,
      JSON.stringify(item).slice(0, 25)
    );
    if (typeof item !== "object" || item === null) {
      // Handle primitive values
      return { type: "text", text: String(item) } as TextPart;
    }

    // Check if item has the expected structure for a RichContentPart
    if ("type" in item) {
      const type = item.type as string;

      if (type === "text" && "text" in item) {
        return { type: "text", text: String(item.text) } as TextPart;
      }

      if (type === "tool_use") {
        // Handle both database format and frontend format
        const toolUsePart = {
          type: "tool_use",
          id: String(item.id || item.tool_use_id || ""),
          name: String(item.name || item.tool_name || ""),
          input: item.input || item.tool_input || {},
        } as ToolUsePart;
        console.log("[chatService] Converted tool_use:", toolUsePart);
        return toolUsePart;
      }

      if (type === "tool_result" || type === "tool_output") {
        // Handle content properly - preserve object structure instead of stringifying
        const rawContent = item.content || item.output || "";

        const toolResultPart = {
          type: "tool_result",
          tool_use_id: String(
            item.tool_use_id_for_output || item.tool_use_id || ""
          ),
          content: rawContent, // Keep as original type instead of stringifying
          is_error: Boolean(item.status === "error" || item.is_error || false),
        } as ToolResultPart;
        console.log(
          "[chatService] Converted tool_result (preserving object):",
          toolResultPart
        );
        return toolResultPart;
      }
    }

    // Fallback: convert to text part
    console.warn(
      "[chatService] convertJsonToRichContent: Unrecognized content part, converting to text:",
      {
        type: item.type,
        keys: Object.keys(item),
        item: JSON.stringify(item),
      }
    );
    return { type: "text", text: JSON.stringify(item) } as TextPart;
  });
};

/**
 * Maps a Supabase ChatMessage to the frontend ChatMessage type
 * @param dbMessage The Supabase ChatMessage to map
 * @returns The mapped ChatMessage
 */
const mapToChatMessage = (
  dbMessage: SupabaseChatMessageRow & { message_metadata?: any }
): ChatMessage => {
  // Assuming ChatMessage type in @/types/chatTypes will be (or is) updated to use 'createdAt: number;'
  // instead of 'timestamp: number;'.
  // Also assumes dbMessage includes 'created_at' if 'timestamp' might be null.
  // The select clauses for functions calling mapToChatMessage must ensure 'created_at' is fetched.

  let msgCreatedAt: number;
  let parsedPrimaryTimestamp = parseDateSafelyToEpochMs(dbMessage.timestamp);

  if (isNaN(parsedPrimaryTimestamp)) {
    console.warn(
      `[ChatService] mapToChatMessage: Message ${dbMessage.id} missing 'timestamp'. Defaulting to epoch start (0).`
    );
    msgCreatedAt = 0;
  } else {
    msgCreatedAt = parsedPrimaryTimestamp;
  }

  const mappedMessage = {
    id: dbMessage.id,
    sessionId: dbMessage.session_id,
    role: dbMessage.role as ChatRole,
    content: convertJsonToRichContent(dbMessage.content),
    createdAt: msgCreatedAt, // Standardized field name
    model: dbMessage.model_used || undefined,
    thinking: false,
    isStreaming: false,
    delivered: true,
    read: true,
    // Any other fields defined in ChatMessage type
  };
  return mappedMessage as ChatMessage; // Ensure ChatMessage type aligns with this structure
};

/**
 * Maps a frontend ChatSession to a Supabase InsertChatSession
 * @param sessionData The frontend ChatSession data to map
 * @returns The mapped InsertChatSession
 */
const mapToInsertChatSession = (
  sessionData: Partial<
    Pick<
      ChatSession,
      | "name"
      | "avatar"
      | "agent_config_id"
      | "specialty"
      | "model"
      | "tools"
      | "systemPrompt"
      | "temperature"
      | "user_id"
      | "initialAgentSnapshot"
    >
  >
): SupabaseInsertChatSession => {
  const metadata: Record<string, any> = {};
  if (sessionData.specialty) metadata.specialty = sessionData.specialty;
  if (sessionData.model) metadata.model = sessionData.model;
  if (sessionData.tools) metadata.tools = sessionData.tools;
  if (sessionData.systemPrompt)
    metadata.system_prompt = sessionData.systemPrompt;
  if (sessionData.temperature) metadata.temperature = sessionData.temperature;
  if (sessionData.avatar) metadata.avatar = sessionData.avatar;

  // user_id is required in the schema
  if (!sessionData.user_id) {
    throw new Error("user_id is required for creating a chat session");
  }

  return {
    id: uuidv4(), // Generate a new UUID
    name: sessionData.name || "New Chat",
    user_id: sessionData.user_id,
    agent_config_id: sessionData.agent_config_id || null,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
    initial_agent_snapshot: sessionData.initialAgentSnapshot || null,
  };
};

// Maps a frontend ChatMessage (from chatTypes.ts) to a Supabase InsertChatMessage (from Supabase schema types)
const mapToInsertChatMessage = (
  messageData: Omit<
    ChatMessage,
    | "id"
    | "timestamp"
    | "isStreaming"
    | "thinking"
    | "reasoning"
    | "delivered"
    | "read"
    | "debugSourceEvent"
  >
): SupabaseInsertChatMessage => {
  const supabaseContent: SupabaseRichContentPart[] = messageData.content.map(
    (part) => {
      if (part.type === "text") {
        return { type: "text", text: part.text } as SupabaseRichContentPart;
      }
      if (part.type === "tool_use") {
        return {
          type: "tool_use",
          tool_use_id: part.id,
          tool_name: part.name,
          tool_input: part.input,
        } as SupabaseRichContentPart;
      }
      if (part.type === "tool_result") {
        return {
          type: "tool_output",
          tool_use_id_for_output: part.tool_use_id,
          output: part.content,
          status: part.is_error ? "error" : "ok",
        } as SupabaseRichContentPart;
      }
      console.warn(
        "[chatService] Unknown RichContentPart type during mapToInsertChatMessage:",
        part
      );
      return {
        type: "text",
        text: "[Unsupported part type in store message]",
      } as SupabaseRichContentPart;
    }
  );

  // Create metadata for any additional properties
  const metadata: Record<string, any> = {};

  return {
    id: uuidv4(), // Generate ID here as per original service structure
    session_id: messageData.sessionId,
    role: messageData.role as string,
    content: supabaseContent,
    timestamp: nextIsoTimestamp(), // Generate unique, strictly increasing timestamp
    model_used: messageData.model || null,
    tool_call_id:
      messageData.content.find((p) => p.type === "tool_use")?.id || null,
    responding_to_tool_use_id:
      messageData.content.find((p) => p.type === "tool_result")?.tool_use_id ||
      null,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  };
};

/**
 * Creates a new chat session in Supabase with complete metadata
 * @param sessionData The chat session data to create
 * @returns The created chat session
 */
export const createChatSession = async (
  sessionData: DbNewChatSession // Accepts DbNewChatSession which includes an optional id
): Promise<ChatSession> => {
  try {
    // Build complete metadata using the builder utility
    const metadataInput: SessionMetadataInput = {
      ...(sessionData.metadata || {}),
      // Map avatar_url to avatar for the metadata builder
      avatar: sessionData.avatar_url || undefined,
    };

    const completeMetadata = buildSessionMetadata(metadataInput);

    console.log(`[chatService] Creating session with complete metadata:`, {
      sessionName: sessionData.name,
      metadataFields: Object.keys(completeMetadata),
    });

    // Directly prepare insertData, respecting the incoming id if provided
    const insertData: SupabaseInsertChatSession = {
      id: sessionData.id || uuidv4(), // Use provided ID (e.g., liveSessionId) or generate new
      name: sessionData.name || "New Chat",
      user_id: await getCurrentUserId(),
      agent_config_id: sessionData.agent_config_id || null,
      metadata: completeMetadata, // Always use complete metadata
      initial_agent_snapshot: sessionData.initial_agent_snapshot || null,
      // created_at and last_message_at are typically handled by DB defaults or triggers
    };

    console.log(
      `[chatService] Creating chat session: ${insertData.name} (${insertData.id})`
    );
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to create chat session");

    console.log(
      `[chatService] Created chat session: ${data.name} (${data.id}) with complete metadata`
    );
    return mapToChatSession(data); // mapToChatSession will need the messages argument if we want them here
    // For a new session, it's fine to return with empty messages initially.
    // mapToChatSession(data, []) would be explicit.
  } catch (error) {
    console.error("[chatService] Error creating chat session:", error);
    throw error;
  }
};

/**
 * Gets a chat session by ID from Supabase, ensuring it belongs to the current user
 * @param sessionId The ID of the chat session to get
 * @returns The chat session or null if not found or not owned by current user
 */
export const getChatSession = async (
  sessionId: string,
  options: { messageLimit?: number } = {}
): Promise<ChatSession | null> => {
  try {
    const currentUserId = await getCurrentUserId();
    const { messageLimit = 100 } = options; // Default to last 100 messages for performance

    // 🚀 PARALLEL OPTIMIZATION: Execute both queries simultaneously
    const [sessionResult, messagesResult] = await Promise.all([
      supabase
        .from("chat_sessions")
        .select(
          `
                    id,
                    user_id,
                    name,
                    metadata,
                    agent_config_id,
                    created_at,
                    last_message_at,
                    initial_agent_snapshot,
                    parent_session_id,
                    fork_message_id,
                    display_title
                `
        )
        .eq("id", sessionId)
        .eq("user_id", currentUserId)
        .single(),
      supabase
        .from("chat_messages")
        .select(
          `
                    id,
                    session_id,
                    role,
                    content,
                    timestamp,
                    model_used,
                    tool_call_id,
                    responding_to_tool_use_id,
                    message_metadata:metadata
                `
        )
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: false })
        .limit(messageLimit),
    ]);

    if (sessionResult.error) {
      if (sessionResult.error.code === "PGRST116") return null; // No rows returned
      throw sessionResult.error;
    }
    if (!sessionResult.data) return null;

    if (messagesResult.error) throw messagesResult.error;

    // Reverse messages to get chronological order (we queried DESC for performance)
    const messages = messagesResult.data
      ? messagesResult.data.reverse().map(mapToChatMessage)
      : [];

    console.log(
      `[chatService] Fetched chat session for ID ${sessionId} (user: ${currentUserId}) with ${messages.length} messages`
    );
    return mapToChatSession(sessionResult.data, messages);
  } catch (error) {
    console.error(
      `[chatService] Error fetching chat session for ID ${sessionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Gets all chat sessions from Supabase for the current user (without messages)
 * @returns An array of chat sessions belonging to the current user
 */
export const getAllChatSessions = async (): Promise<ChatSession[]> => {
  try {
    const currentUserId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("chat_sessions")
      .select(
        `
                id,
                user_id,
                name,
                metadata,
                agent_config_id,
                created_at,
                last_message_at,
                initial_agent_snapshot,
                parent_session_id,
                fork_message_id,
                display_title
            `
      )
      .eq("user_id", currentUserId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;
    if (!data) return [];

    console.log(
      `[chatService] Fetched ${data.length} chat sessions for user: ${currentUserId}`
    );
    // Map to ChatSession with empty messages array (lazy loading)
    return data.map((session) => mapToChatSession(session, []));
  } catch (error) {
    console.error("[chatService] Error fetching chat sessions:", error);
    throw error;
  }
};

/**
 * Gets all chat session metadata from Supabase for the current user
 * @returns An array of chat session metadata belonging to the current user
 */
export const getAllChatSessionMetas = async (): Promise<SessionMeta[]> => {
  try {
    const currentUserId = getOrSetAnonymousUserId();
    const { data, error } = await supabase
      .from("chat_sessions")
      .select(
        `
                id,
                name,
                last_message_at,
                created_at,
                display_title,
                metadata_avatar_url:metadata->>avatar_url,
                metadata_agent_name:metadata->>agent_name,
                parent_session_id,
                fork_message_id
            `
      )
      .eq("user_id", currentUserId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;
    if (!data) return [];

    console.log(
      `[chatService] Fetched ${data.length} chat session metas for user: ${currentUserId}`
    );
    return data.map(mapToSessionMeta);
  } catch (error) {
    console.error("[chatService] Error fetching chat session metas:", error);
    throw error;
  }
};

/**
 * 🚀 BATCH OPTIMIZATION: Gets multiple chat sessions in a single optimized query
 * @param sessionIds Array of session IDs to fetch
 * @param options Options for message loading
 * @returns Array of chat sessions (null for sessions not found)
 */
export const getChatSessionsBatch = async (
  sessionIds: string[],
  options: { messageLimit?: number } = {}
): Promise<(ChatSession | null)[]> => {
  if (sessionIds.length === 0) return [];

  try {
    const currentUserId = getOrSetAnonymousUserId();
    const { messageLimit = 100 } = options;

    // 🚀 PARALLEL BATCH OPTIMIZATION: Single query for all sessions + messages
    const [sessionsResult, messagesResult] = await Promise.all([
      supabase
        .from("chat_sessions")
        .select(
          `
                    id,
                    user_id,
                    name,
                    metadata,
                    agent_config_id,
                    created_at,
                    last_message_at,
                    initial_agent_snapshot,
                    parent_session_id,
                    fork_message_id,
                    display_title
                `
        )
        .in("id", sessionIds)
        .eq("user_id", currentUserId),
      supabase
        .from("chat_messages")
        .select(
          `
                    id,
                    session_id,
                    role,
                    content,
                    timestamp,
                    model_used,
                    tool_call_id,
                    responding_to_tool_use_id,
                    message_metadata:metadata
                `
        )
        .in("session_id", sessionIds)
        .order("timestamp", { ascending: true })
        .limit(messageLimit * sessionIds.length), // Rough limit across all sessions
    ]);

    if (sessionsResult.error) throw sessionsResult.error;
    if (messagesResult.error) throw messagesResult.error;

    // Group messages by session_id for efficient lookup
    const messagesBySession = new Map<string, ChatMessage[]>();
    messagesResult.data?.forEach((msg) => {
      const sessionId = msg.session_id;
      if (!messagesBySession.has(sessionId)) {
        messagesBySession.set(sessionId, []);
      }
      messagesBySession.get(sessionId)!.push(mapToChatMessage(msg));
    });

    // Apply message limit per session and maintain order
    messagesBySession.forEach((messages, sessionId) => {
      if (messages.length > messageLimit) {
        messagesBySession.set(sessionId, messages.slice(-messageLimit));
      }
    });

    // Map sessions to results, maintaining input order
    const results = sessionIds.map((sessionId) => {
      const sessionData = sessionsResult.data?.find((s) => s.id === sessionId);
      if (!sessionData) return null;

      const messages = messagesBySession.get(sessionId) || [];
      return mapToChatSession(sessionData, messages);
    });

    console.log(
      `[chatService] Batch fetched ${results.filter((r) => r !== null).length}/${sessionIds.length} sessions`
    );
    return results;
  } catch (error) {
    console.error("[chatService] Error fetching sessions batch:", error);
    throw error;
  }
};

/**
 * Updates a chat session in Supabase
 * @param sessionId The ID of the chat session to update
 * @param updates The updates to apply to the chat session
 * @returns The updated chat session
 */
export const updateChatSession = async (
  sessionId: string,
  updates: Partial<
    Pick<
      ChatSession,
      | "name"
      | "avatar"
      | "specialty"
      | "model"
      | "tools"
      | "systemPrompt"
      | "temperature"
      | "lastUpdated"
      | "initialAgentSnapshot"
    >
  >
): Promise<ChatSession> => {
  try {
    const currentUserId = getOrSetAnonymousUserId();
    // First, get the current session to merge metadata properly, ensuring it belongs to current user
    const { data: currentSession, error: fetchError } = await supabase
      .from("chat_sessions")
      .select(
        `
                id,
                user_id,
                name,
                metadata,
                agent_config_id,
                created_at,
                last_message_at,
                initial_agent_snapshot,
                parent_session_id,
                fork_message_id,
                display_title
            `
      )
      .eq("id", sessionId)
      .eq("user_id", currentUserId)
      .single();

    if (fetchError) throw fetchError;
    if (!currentSession)
      throw new Error(
        `Chat session with ID ${sessionId} not found or not owned by current user`
      );

    // Prepare the update data
    const updateData: SupabaseUpdateChatSession = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.lastUpdated)
      updateData.last_message_at = new Date(updates.lastUpdated).toISOString();
    if (updates.initialAgentSnapshot)
      updateData.initial_agent_snapshot = updates.initialAgentSnapshot;

    // Merge metadata
    const currentMetadata =
      (currentSession.metadata as Record<string, any>) || {};
    const newMetadata: Record<string, any> = { ...currentMetadata };

    if (updates.specialty) newMetadata.specialty = updates.specialty;
    if (updates.model) newMetadata.model = updates.model;
    if (updates.tools) newMetadata.tools = updates.tools;
    if (updates.systemPrompt !== undefined)
      newMetadata.system_prompt = updates.systemPrompt;
    if (updates.temperature !== undefined)
      newMetadata.temperature = updates.temperature;
    if (updates.avatar) newMetadata.avatar = updates.avatar;

    updateData.metadata =
      Object.keys(newMetadata).length > 0 ? newMetadata : null;

    // Update the session, ensuring it belongs to current user
    const { data, error } = await supabase
      .from("chat_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", currentUserId)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      throw new Error(`Failed to update chat session with ID ${sessionId}`);

    // Get the messages for the updated session
    const { data: messagesData, error: messagesError } = await supabase
      .from("chat_messages")
      .select(
        `
                id,
                session_id,
                role,
                content,
                timestamp,
                model_used,
                tool_call_id,
                responding_to_tool_use_id,
                message_metadata:metadata
            `
      )
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    if (messagesError) throw messagesError;

    const messages = messagesData ? messagesData.map(mapToChatMessage) : [];

    console.log(
      `[chatService] Updated chat session for ID ${sessionId}:`,
      data
    );
    return mapToChatSession(data, messages);
  } catch (error) {
    console.error(
      `[chatService] Error updating chat session for ID ${sessionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Deletes a chat session from Supabase, ensuring it belongs to the current user
 * @param sessionId The ID of the chat session to delete
 */
export const deleteChatSession = async (sessionId: string): Promise<void> => {
  try {
    const currentUserId = getOrSetAnonymousUserId();
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", currentUserId);

    if (error) throw error;

    console.log(
      `[chatService] Deleted chat session with ID: ${sessionId} (user: ${currentUserId})`
    );
  } catch (error) {
    console.error(
      `[chatService] Error deleting chat session with ID ${sessionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Saves a chat message to Supabase
 * @param messageData The chat message data to save
 * @returns The saved chat message
 */
export const saveChatMessage = async (
  messageData: Omit<ChatMessage, "id" | "timestamp">
): Promise<ChatMessage> => {
  try {
    const insertData = mapToInsertChatMessage(messageData);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to save chat message");

    // Update the session's last_message_at timestamp
    await supabase
      .from("chat_sessions")
      .update({ last_message_at: data.timestamp })
      .eq("id", messageData.sessionId);

    console.log("[chatService] Saved chat message:", data);
    return mapToChatMessage(data);
  } catch (error) {
    console.error("[chatService] Error saving chat message:", error);
    throw error;
  }
};

/**
 * Saves multiple chat messages to Supabase in a batch
 * @param messagesData The chat messages data to save
 * @returns The saved chat messages
 */
export const saveChatMessageBatch = async (
  messagesData: Omit<ChatMessage, "id" | "timestamp">[]
): Promise<ChatMessage[]> => {
  if (messagesData.length === 0) return [];

  try {
    const insertData = messagesData.map(mapToInsertChatMessage);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert(insertData)
      .select();

    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error("Failed to save chat messages batch");

    // Update the session's last_message_at timestamp with the latest message timestamp
    const latestMessage = data.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp)
        ? current
        : latest;
    }, data[0]);

    await supabase
      .from("chat_sessions")
      .update({ last_message_at: latestMessage.timestamp })
      .eq("id", latestMessage.session_id);

    console.log(`[chatService] Saved ${data.length} chat messages in batch`);
    return data.map(mapToChatMessage);
  } catch (error) {
    console.error("[chatService] Error saving chat message batch:", error);
    throw error;
  }
};

/**
 * Gets chat messages for a session from Supabase
 * @param sessionId The ID of the session to get messages for
 * @param options Options for pagination and filtering
 * @returns The chat messages
 */
export const getChatMessages = async (
  sessionId: string,
  options: GetChatMessagesOptions = {}
): Promise<ChatMessage[]> => {
  console.log(
    `[ChatService] getChatMessages called for ${sessionId} with options:`,
    options
  );
  try {
    let query = supabase
      .from("chat_messages")
      .select(
        "id, session_id, role, content, timestamp, model_used, tool_call_id, responding_to_tool_use_id, message_metadata:metadata"
      )
      .eq("session_id", sessionId);

    const effectiveOrderBy = options.orderBy || {
      column: "timestamp",
      ascending: false,
    }; // Default to newest first

    query = query.order(effectiveOrderBy.column, {
      ascending: effectiveOrderBy.ascending,
    });

    if (effectiveOrderBy.column === "timestamp") {
      query = query.order("id", { ascending: effectiveOrderBy.ascending });
    }

    if (options.cursor && options.cursor.timestamp) {
      const cursorTimestamp = options.cursor.timestamp;
      if (options.cursor.direction === "olderThan") {
        // Fetching messages older than the cursor
        // If orderBy is newest first (ascending: false), then olderThan means timestamp < cursorTimestamp
        query = query.lt(effectiveOrderBy.column, cursorTimestamp);
      } else if (options.cursor.direction === "newerThan") {
        // Fetching messages newer than the cursor
        // If orderBy is newest first (ascending: false), then newerThan means timestamp > cursorTimestamp
        query = query.gt(effectiveOrderBy.column, cursorTimestamp);
      }
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    console.log(`FULL SUPABASE DATA:`, JSON.stringify(data, null, 2));
    if (error) {
      console.error("[ChatService] Supabase query error", error);
      throw error;
    }
    if (!data) return [];

    return data.map((dbMsg) =>
      mapToChatMessage(
        dbMsg as SupabaseChatMessageRow & { message_metadata?: any }
      )
    );
  } catch (error) {
    console.error("[ChatService] Error in getChatMessages", error);
    throw error;
  }
};

export const getAllChatMessages = async (
  sessionId: string
): Promise<ChatMessage[]> => {
  console.log(
    `[ChatService] getAllChatMessages called for session: ${sessionId}`
  );
  const currentUserId = getOrSetAnonymousUserId();

  // First verify the user owns this session for security
  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session || session.user_id !== currentUserId) {
    console.error(
      "[ChatService] Session not found or access denied for session " +
        sessionId +
        " (user: " +
        currentUserId +
        ")"
    );
    throw new Error(`Session not found or access denied`);
  }

  const selectColumns =
    "id, session_id, role, content, timestamp, model_used, tool_call_id, responding_to_tool_use_id";

  const { data, error } = await supabase
    .from("chat_messages")
    .select(selectColumns)
    .eq("session_id", sessionId) // Only filter by session_id since we verified ownership above
    .order("timestamp", { ascending: true });

  if (error) {
    console.error(
      "[ChatService] Error fetching all chat messages for session " +
        sessionId +
        " (user: " +
        currentUserId +
        "):",
      error
    );
    throw error;
  }

  if (!data) {
    console.warn(
      "[ChatService] No data returned when fetching all messages for session " +
        sessionId +
        " (user: " +
        currentUserId +
        ")"
    );
    return [];
  }

  const mappedMessages: ChatMessage[] = data.map((dbMsg) =>
    mapToChatMessage(
      dbMsg as SupabaseChatMessageRow & { message_metadata?: any }
    )
  );
  console.log(
    `[ChatService] getAllChatMessages: Fetched and mapped ${mappedMessages.length} messages for session ${sessionId}.`
  );
  // log tool result parts
  mappedMessages.forEach((msg) => {
    console.log(
      `[ChatService] getAllChatMessages: Message ${msg.id} has ${msg.content.length} parts.`
    );
    msg.content.forEach((part) => {
      if (part.type === "tool_result") {
        // log FULL message
        console.log(
          `[ChatService] getAllChatMessages: Tool result part ${part.tool_use_id} has content:`,
          part.content
        );
      }
    });
  });
  return mappedMessages;
};

// ===== CONVERSATION FORKING FUNCTIONS =====

/**
 * Creates a forked conversation from an existing session at a specific message
 * @param parentSessionId The ID of the parent session to fork from
 * @param forkRequest The fork request containing messageId, name, and displayTitle
 * @returns The created forked session
 */
export const forkConversation = async (
  parentSessionId: string,
  forkRequest: ForkRequest
): Promise<ChatSession> => {
  try {
    const currentUserId = getOrSetAnonymousUserId();

    // First, verify the parent session belongs to the current user
    const { data: parentSession, error: parentError } = await supabase
      .from("chat_sessions")
      .select(
        `
                id,
                user_id,
                name,
                metadata,
                agent_config_id,
                created_at,
                last_message_at,
                initial_agent_snapshot,
                parent_session_id,
                fork_message_id,
                display_title
            `
      )
      .eq("id", parentSessionId)
      .eq("user_id", currentUserId)
      .single();

    if (parentError || !parentSession) {
      throw new Error("Parent session not found or not owned by current user");
    }

    // Verify the fork message exists in the parent session
    const { data: forkMessage, error: messageError } = await supabase
      .from("chat_messages")
      .select("id, timestamp")
      .eq("id", forkRequest.messageId)
      .eq("session_id", parentSessionId)
      .single();

    if (messageError || !forkMessage) {
      throw new Error("Fork message not found in parent session");
    }

    // Build complete metadata for the forked session
    const parentMetadata =
      (parentSession.metadata as Record<string, any>) || {};
    const completeMetadata = buildSessionMetadata(parentMetadata);

    console.log(
      `[chatService] Creating fork with complete metadata inherited from parent`
    );

    // Create the forked session
    const forkSessionData: SupabaseInsertChatSession = {
      id: uuidv4(),
      name: forkRequest.name || `Fork of ${parentSession.name}`,
      display_title: forkRequest.displayTitle || null,
      user_id: currentUserId,
      agent_config_id: parentSession.agent_config_id,
      metadata: completeMetadata, // Always use complete metadata
      initial_agent_snapshot: parentSession.initial_agent_snapshot,
      parent_session_id: parentSessionId,
      fork_message_id: forkRequest.messageId,
    };

    const { data: newSession, error: createError } = await supabase
      .from("chat_sessions")
      .insert(forkSessionData)
      .select(
        `
            id,
            user_id,
            name,
            metadata,
            agent_config_id,
            created_at,
            last_message_at,
            initial_agent_snapshot,
            parent_session_id,
            fork_message_id,
            display_title
        `
      )
      .single();

    if (createError || !newSession) {
      throw new Error("Failed to create forked session");
    }

    console.log(
      `[chatService] Created forked session ${newSession.id} from parent ${parentSessionId} at message ${forkRequest.messageId}`
    );

    // Return the new session (with empty messages array initially)
    return mapToChatSession(newSession, []);
  } catch (error) {
    console.error(
      `[chatService] Error forking conversation from ${parentSessionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Gets all messages for a forked conversation, including parent messages up to the fork point
 * @param sessionId The ID of the forked session
 * @returns Array of messages with isFromParent flag
 */
export const getForkedConversationMessages = async (
  sessionId: string
): Promise<ForkedMessage[]> => {
  try {
    const currentUserId = getOrSetAnonymousUserId();

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session || session.user_id !== currentUserId) {
      throw new Error("Session not found or unauthorized");
    }

    // Use the SQL function to get forked conversation messages
    // Workaround for problematic Supabase RPC type inference:
    // Cast `supabase.rpc` to `any` to bypass type checks.
    // The root cause is likely outdated/incorrect Supabase generated types.
    // Regenerate types with `supabase gen types typescript` for a proper fix.
    const { data: rawData, error } = await (supabase.rpc as any)(
      "get_forked_conversation",
      { target_session_id: sessionId }
    );

    if (error) throw error;
    if (!rawData) return [];

    // Map the response to ForkedMessage objects
    const messages: ForkedMessage[] = (
      rawData as GetForkedConversationResponse[]
    ).map((row: GetForkedConversationResponse) => ({
      id: row.message_id,
      sessionId: row.session_id,
      role: row.role.toLowerCase() as ChatRole,
      content: convertJsonToRichContent(row.content),
      timestamp: new Date(row.message_timestamp).getTime(),
      model: row.model_used || undefined,
      isFromParent: row.is_from_parent,
      thinking: false,
      delivered: true,
      read: true,
    }));

    console.log(
      `[chatService] Fetched ${messages.length} messages for forked conversation ${sessionId}`
    );
    return messages;
  } catch (error) {
    console.error(
      `[chatService] Error fetching forked conversation messages for ${sessionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Gets all forks of a conversation
 * @param sessionId The ID of the session to get forks for
 * @returns Array of fork information
 */
export const getConversationForks = async (
  sessionId: string
): Promise<ForkInfo[]> => {
  try {
    const currentUserId = getOrSetAnonymousUserId();

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session || session.user_id !== currentUserId) {
      throw new Error("Session not found or unauthorized");
    }

    // Use the SQL function to get conversation forks
    const { data, error } = await supabase.rpc("get_conversation_forks", {
      session_id: sessionId,
    });

    if (error) throw error;
    if (!data) return [];

    // Map the response to ForkInfo objects
    const forks: ForkInfo[] = data.map((row: GetConversationForksResponse) => ({
      id: row.fork_id,
      name: row.fork_name,
      displayTitle: row.fork_display_title || undefined,
      createdAt: new Date(row.fork_created_at).getTime(),
      forkMessageId: row.fork_message_id,
    }));

    console.log(
      `[chatService] Found ${forks.length} forks for conversation ${sessionId}`
    );
    return forks;
  } catch (error) {
    console.error(
      `[chatService] Error fetching conversation forks for ${sessionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Gets the ancestry chain of a forked conversation for breadcrumb navigation
 * @param sessionId The ID of the session to get ancestry for
 * @returns Array of ancestor information ordered from root to current
 */
export const getForkAncestry = async (
  sessionId: string
): Promise<ConversationAncestry[]> => {
  try {
    const currentUserId = getOrSetAnonymousUserId();

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session || session.user_id !== currentUserId) {
      throw new Error("Session not found or unauthorized");
    }

    // Use the SQL function to get fork ancestry
    const { data, error } = await supabase.rpc("get_fork_ancestry", {
      session_id: sessionId,
    });

    if (error) throw error;
    if (!data) return [];

    // Map the response to ConversationAncestry objects
    const ancestry: ConversationAncestry[] = data.map(
      (row: GetForkAncestryResponse) => ({
        id: row.ancestor_id,
        name: row.ancestor_name,
        displayTitle: row.ancestor_display_title || undefined,
        depthLevel: row.depth_level,
      })
    );

    console.log(
      `[chatService] Found ${ancestry.length} ancestors for session ${sessionId}`
    );
    return ancestry;
  } catch (error) {
    console.error(
      `[chatService] Error fetching fork ancestry for ${sessionId}:`,
      error
    );
    throw error;
  }
};
