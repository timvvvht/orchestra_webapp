import { create } from 'zustand';
// Removed: import { persist } from 'zustand/middleware';
import * as ChatService from '@/services/supabase/chatService'; // For Supabase interactions
import * as ChatApi from '@/api/chatApi'; // Kept for live backend interactions (Tauri)
import { useActivityFeed } from './activityStore';
import * as AgentEventService from '@/services/AgentEventService';
import { useSettingsStore } from '@/stores/settingsStore'; // Added for vault path
import { getUserName } from '@/utils/userPreferences'; // Added for username from user preferences
import { useAgentConfigStore } from '@/stores/agentConfigStore';
// Need this import for type casting
import { AgentConfigBE } from '@/types/agent';
import { generateToolId, normalizeToolIds, matchToolResultToCall } from '@/utils/toolIdGenerator';

// Import centralized types
import { ChatRole } from '@/types/chatTypes';
import type {
    RichContentPart,
    TextPart,
    ToolUsePart,
    ToolResultPart, // Keep if RichContentPart is defined via these, or just RichContentPart if it's self-contained in chatTypes.ts
    ChatMessage,
    SessionMeta,
    ChatSession,
    // We might still need NewDbChatMessage or a similar type for preparing data for the service if its input expects a specific shape.
    // For now, focusing on importing the core domain types.
    SupabaseDbChatMessage, // For mapping incoming history if needed & for type hints
    DbNewChatMessage, // For preparing messages TO the service
    DbNewChatSession, // For preparing new sessions TO the service
    DbUpdateChatSession, // For preparing session updates TO the service
    SupabaseRichContentPart, // For mapping content to/from DB structure
    WorkerHistoryItem, // For typing worker history items
    // Forking-related types
    ForkRequest,
    ForkInfo,
    ConversationAncestry,
    ForkedMessage
} from '@/types/chatTypes';

let hasSubscribedToAgentEvents = false;

function dedupKey(p: any): string {
    // If the event has a unique event_id from the backend, use it directly
    if (p.event_id) {
        return p.event_id;
    }

    // Fallback to the old logic for events without event_id
    const knownGenericIds = ['-result', '-call', '']; // IDs that should trigger unique key generation for results

    // Handle chunk/token first (uses seq for uniqueness)
    if (p.type === 'token' || p.type === 'chunk') {
        return `${p.sessionId}:${p.type}:${p.messageId ?? 'no_id_stream'}:${p.seq}`;
    }

    if (p.type === 'tool_call') {
        // For tool_call, p.toolCall.id is the frontend-generated unique ID.
        // Use this if available and not a generic/empty string.
        if (p.toolCall?.id && p.toolCall.id.trim() !== '' && !knownGenericIds.includes(p.toolCall.id.trim())) {
            return `${p.sessionId}:tool_call:${p.toolCall.id}`;
        }
        // If toolCall.id is generic/empty, or not present, generate a UUID for this specific event instance.
        return `${p.sessionId}:tool_call:${crypto.randomUUID()}`;
    }

    if (p.type === 'tool_result') {
        // If the messageId for a tool_result is one of the known generic IDs or missing,
        // it means we can't use it for reliable deduplication of distinct results.
        // In this case, generate a UUID for this specific event instance to ensure it's processed.
        if (!p.messageId || knownGenericIds.includes(p.messageId.trim())) {
            // This ensures each incoming tool_result event gets a unique key if its own ID is generic,
            // allowing multiple distinct results (even with the same generic messageId from backend) to be processed.
            return `${p.sessionId}:tool_result:${crypto.randomUUID()}`;
        }
        // If messageId is present and NOT generic, use it, as it might be a specific ID from the backend.
        return `${p.sessionId}:tool_result:${p.messageId}`;
    }

    // Special handling for final_message_history to prevent duplicates
    if (p.type === 'final_message_history') {
        // Use a stable key based on session and message count to deduplicate
        const historyLength = p.history?.length || 0;
        return `${p.sessionId}:final_message_history:${historyLength}`;
    }

    // Default case for other event types: use messageId if available.
    // If messageId is missing for these other types, generate a UUID as a fallback.
    return `${p.sessionId}:${p.type}:${p.messageId ?? crypto.randomUUID()}`;
}

function upsert(arr: ChatMessage[], msg: ChatMessage) {
    const idx = arr.findIndex(m => m.id === msg.id);
    if (idx === -1) arr.push(msg);
    else arr[idx] = msg;
}

// Internal type definitions for ChatRole, RichContentPart, ChatMessage, SessionMeta, ChatSession are now imported from ../types/chatTypes.ts
// Ensure ChatRole enum is also exported from chatTypes.ts if it's not already.

/**
 * Convert a minimal worker-history item to a full ChatMessage.
 */
function normaliseWorkerHistoryItem(raw: WorkerHistoryItem, sessionId: string): ChatMessage {
    const roleStr = (raw.role ?? 'system').toLowerCase();
    const role: ChatRole = (Object.values(ChatRole) as string[]).includes(roleStr) ? (roleStr as ChatRole) : ChatRole.System;

    const tsRaw = raw.timestamp;
    const timestamp = typeof tsRaw === 'number' ? tsRaw : tsRaw ? new Date(tsRaw as string).getTime() : Date.now();

    return {
        id: raw.id ?? crypto.randomUUID(),
        sessionId,
        role,
        content: Array.isArray(raw.content) ? raw.content : [],
        timestamp,
        model: raw.model ?? undefined,
        isStreaming: false
    };
}

// Mapper for final_message_history event (data from backend, potentially SupabaseDbChatMessage like)
function mapSupabaseDbMessageToChatMessage(dbMsg: SupabaseDbChatMessage): ChatMessage {
    // Basic mapping, content needs careful handling
    const role = dbMsg.role.toLowerCase() as ChatRole;
    // TODO: Review content mapping against actual SupabaseRichContentPart structure from generated types if it differs.
    const contentUi: RichContentPart[] = dbMsg.content
        ? dbMsg.content.map((part: SupabaseRichContentPart) => {
              if (part.type === 'text' && typeof part.text === 'string') {
                  return { type: 'text', text: part.text } as TextPart;
              } else if (part.type === 'tool_use' && part.tool_use_id && part.tool_name) {
                  return { type: 'tool_use', id: part.tool_use_id, name: part.tool_name, input: part.tool_input } as ToolUsePart;
              } else if (part.type === 'tool_output' && part.tool_use_id_for_output) {
                  return {
                      type: 'tool_result',
                      tool_use_id: part.tool_use_id_for_output,
                      content: typeof part.output === 'string' ? part.output : JSON.stringify(part.output),
                      is_error: part.status === 'error'
                  } as ToolResultPart;
              }
              console.warn('[chatStore] mapSupabaseDbMessageToChatMessage: Unhandled or incomplete SupabaseRichContentPart', part);
              return { type: 'text', text: part.text || '[Unparseable Supabase Content]' } as TextPart;
          })
        : [{ type: 'text', text: '[No Content]' }];

    return {
        id: dbMsg.id,
        sessionId: dbMsg.session_id,
        role: Object.values(ChatRole).includes(role) ? role : ChatRole.System, // Fallback role
        content: contentUi,
        timestamp: new Date(dbMsg.timestamp).getTime(),
        model: dbMsg.model_used || undefined
    };
}

// Helper to map store's ChatMessage to DbNewChatMessage for service interaction
function mapStoreChatMessageToDbNewChatMessage(
    storeMsg: ChatMessage,
    targetSessionId?: string // Optional: for cloning to a new session ID
): DbNewChatMessage {
    const contentForDb: SupabaseRichContentPart[] = storeMsg.content.map(part => {
        if (part.type === 'text') {
            return { type: 'text', text: part.text };
        }
        if (part.type === 'tool_use') {
            return {
                type: 'tool_use',
                tool_use_id: part.id,
                tool_name: part.name,
                tool_input: part.input
            };
        }
        if (part.type === 'tool_result') {
            return {
                type: 'tool_output',
                tool_use_id_for_output: part.tool_use_id,
                output: part.content,
                status: part.is_error ? 'error' : 'ok'
            };
        }
        console.warn(`[chatStore] mapStoreChatMessageToDbNewChatMessage: Unknown RichContentPart type: ${(part as any).type}`);
        return { type: 'text', text: `[Unsupported content part: ${(part as any).type}]` };
    });

    const dbMessage: DbNewChatMessage = {
        session_id: targetSessionId || storeMsg.sessionId,
        role: storeMsg.role.toString(),
        content: contentForDb,
        model_used: storeMsg.model || null
    };

    if (storeMsg.role === ChatRole.Assistant && storeMsg.content.length > 0) {
        const firstPart = storeMsg.content[0];
        if (firstPart.type === 'tool_use') dbMessage.tool_call_id = firstPart.id;
    }
    if (storeMsg.role === ChatRole.Tool && storeMsg.content.length > 0) {
        const firstPart = storeMsg.content[0];
        if (firstPart.type === 'tool_result') dbMessage.responding_to_tool_use_id = firstPart.tool_use_id;
    }
    return dbMessage;
}

// This function prepares a ChatMessage for ChatService.saveChatMessage
function prepareMessageForService(storeMsg: ChatMessage): Omit<ChatMessage, 'id' | 'timestamp'> {
    return {
        sessionId: storeMsg.sessionId,
        role: storeMsg.role,
        content: storeMsg.content,
        model: storeMsg.model
    };
}

// This function prepares multiple ChatMessages for ChatService.saveChatMessageBatch
function prepareMessageBatchForService(storeMsgs: ChatMessage[], targetSessionId?: string): Omit<ChatMessage, 'id' | 'timestamp'>[] {
    return storeMsgs.map(msg => ({
        sessionId: targetSessionId || msg.sessionId,
        role: msg.role,
        content: msg.content,
        model: msg.model
    }));
}

interface ChatStoreState {
    sessions: Record<string, SessionMeta>;
    chats: Record<string, ChatSession>;
    currentSessionId?: string;
    isInitialized: boolean;
    processedEventKeys: Map<string, number>; // Changed to Map with timestamp for TTL
    messagesLoadingState: Record<string, 'idle' | 'loading' | 'loaded' | 'error'>; // Added for message loading state

    initialize: () => Promise<void>;
    createSession: (agentConfigId: string, name?: string, template?: Partial<ChatSession>) => Promise<string>;
    sendMessage: (content: string, targetSessionId?: string, codingMode?: { enabled: boolean; codebasePath?: string }) => Promise<void>;
    setCurrentSession: (sessionId: string) => void;
    cloneSession: (sessionId: string, newName: string) => Promise<string>; // TODO: Integrate Supabase
    deleteSession: (sessionId: string) => Promise<void>;
    updateChatSessionConfig: (
        // TODO: Integrate Supabase for metadata updates
        sessionId: string,
        newConfig: Partial<Pick<ChatSession, 'name' | 'avatar' | 'model' | 'tools' | 'systemPrompt' | 'temperature'>>
    ) => void;
    cleanupProcessedEventKeys: () => void; // Added to prevent memory leaks
    loadMessagesForSession: (sessionId: string) => Promise<void>; // Added for lazy loading messages
    restoreBackendSession: (sessionId: string, agentConfigId: string) => Promise<void>; // Added for session restoration
    
    // Forking-related actions
    forkConversation: (parentSessionId: string, messageId: string, name?: string, displayTitle?: string) => Promise<ChatSession>;
    loadForkedMessages: (sessionId: string) => Promise<void>;
    getConversationForks: (sessionId: string) => Promise<ForkInfo[]>;
    getForkAncestry: (sessionId: string) => Promise<ConversationAncestry[]>;
}

// --- Helper Functions for Data Mapping ---
// These functions were previously used to map service DTOs to store types.
// Since src/services/supabase/chatService.ts now directly returns types matching the store's state
// (by using the centralized types from ../types/chatTypes.ts), these mappers in the store are no longer needed.
// The main mapping now happens:
//    1. Inside the service: Supabase DB Row -> Centralized Domain/Store Type
//    2. Inside the store (e.g., mapStoreMessageToSupabaseNewMessage): Centralized Domain/Store Type -> Payload for Service (e.g. Omit<ChatMessage,...>)

// --- Zustand Store Definition ---
// Removed the 'persist' middleware. Supabase is now the source of truth for historical data.
export const useChatStore = create<ChatStoreState>()((set, get) => ({
    sessions: {},
    chats: {},
    isInitialized: false,
    processedEventKeys: new Map<string, number>(), // Initialize Map with timestamp tracking
    messagesLoadingState: {}, // Initialize messages loading state

    async initialize() {
        console.log('[chatStore] initialize() called. isInitialized:', get().isInitialized, ', hasSubscribed (runtime):', hasSubscribedToAgentEvents);

        // Initialize AgentEventService listener (if not already done)
        if (!hasSubscribedToAgentEvents) {
            try {
                console.log('[chatStore] Attempting to start AgentEventService listener and subscribe...');
                // Ensure AgentEventService.startAgentEventListener() is safe to call multiple times or is idempotent.
                await AgentEventService.startAgentEventListener();

                const agentHandler: AgentEventService.EventHandler = async rawPayload => {
                    // Add logging to debug tool_result issue
                    if (rawPayload.type === 'tool_result') {
                        console.log('[chatStore] tool_result event received in handler:', rawPayload);
                    }

                    // Step 6.3: Deduplication logic
                    const key = dedupKey(rawPayload); // Use rawPayload as it has seq

                    // Enhanced logging for debugging event storm
                    if (rawPayload.type === 'tool_result' || rawPayload.type === 'final_message_history') {
                        // console.log(
                        //     `[chatStore] ${rawPayload.type} dedup key:`,
                        //     key,
                        //     'Already processed:',
                        //     useChatStore.getState().processedEventKeys.has(key)
                        // );
                    }

                    const state = useChatStore.getState();
                    const now = Date.now();

                    if (state.processedEventKeys.has(key)) {
                        // Log all duplicate events during debugging
                        // console.log(`[chatStore] DUPLICATE event skipped: type=${rawPayload.type}, key=${key}`);
                        return;
                    }

                    // Add to processed keys with timestamp
                    state.processedEventKeys.set(key, now);

                    // Auto-cleanup every 100 events to prevent memory bloat
                    if (state.processedEventKeys.size % 100 === 0) {
                        const TTL = 5 * 60 * 1000; // 5 minutes
                        for (const [k, timestamp] of state.processedEventKeys.entries()) {
                            if (now - timestamp > TTL) {
                                state.processedEventKeys.delete(k);
                            }
                        }
                        console.log(`[chatStore] Cleaned up old event keys, size now: ${state.processedEventKeys.size}`);
                    }

                    // Log event processing for debugging
                    if (rawPayload.type === 'final_message_history') {
                        console.log(`[chatStore] Processing ${rawPayload.type} event (first time), key=${key}`);
                    }

                    const payload = rawPayload as AgentEventService.RawAgentEventPayload;

                    if (payload.type === 'tool_result') {
                        console.log('[chatStore] tool_result passed dedup, proceeding to process');
                    }

                    const storeSet = useChatStore.setState;
                    const storeGet = useChatStore.getState;

                    let currentChatSession = storeGet().chats[payload.sessionId];
                    if (!currentChatSession) {
                        console.warn(`[chatStore] Event for unknown session ${payload.sessionId}. Creating minimal session on-demand.`);
                        // Create minimal session on-demand to handle race condition
                        const minimalSession: ChatSession = {
                            id: payload.sessionId,
                            name: 'Live Session',
                            avatar: 'assets/robots/robot1.png',
                            specialty: 'AI Assistant',
                            messages: [],
                            model: 'gpt-4o-mini',
                            tools: [],
                            createdAt: Date.now(),
                            lastUpdated: Date.now()
                        };
                        const minimalSessionMeta: SessionMeta = {
                            id: payload.sessionId,
                            name: 'Live Session',
                            avatar: 'assets/robots/robot1.png',
                            lastUpdated: Date.now(),
                            unreadCount: 0
                        };

                        // Update store with minimal session
                        storeSet(state => ({
                            sessions: { ...state.sessions, [payload.sessionId]: minimalSessionMeta },
                            chats: { ...state.chats, [payload.sessionId]: minimalSession },
                            currentSessionId: state.currentSessionId || payload.sessionId
                        }));

                        // Re-fetch the session
                        currentChatSession = storeGet().chats[payload.sessionId];
                        console.log(`[chatStore] Created minimal session for ${payload.sessionId}`);
                    }
                    console.log('💥 [STORE] Raw payload from AgentEventService in chatStore:', payload);
                    const eventTimestamp = Date.now();

                    // --- Activity Feed Logic (example, adapt as needed) ---
                    const { addEvent } = useActivityFeed.getState();
                    const currentSessionMeta = storeGet().sessions[payload.sessionId];
                    const baseActivityEvent = {
                        agentId: payload.sessionId,
                        agentName: currentSessionMeta?.name || 'Agent',
                        agentColor: 'from-blue-500 to-cyan-600',
                        timestamp: eventTimestamp,
                        avatarPath: currentSessionMeta?.avatar
                    };
                    if (payload.type === 'tool_call' && payload.toolCall) {
                        addEvent({
                            ...baseActivityEvent,
                            id: payload.toolCall.id || crypto.randomUUID(),
                            action: 'executed tool',
                            target: payload.toolCall.name,
                            details: typeof payload.toolCall.arguments === 'string' ? payload.toolCall.arguments : JSON.stringify(payload.toolCall.arguments),
                            eventType: 'tool_call'
                        });
                    } else if (payload.type === 'tool_result') {
                        addEvent({
                            ...baseActivityEvent,
                            id: crypto.randomUUID(),
                            action: 'tool result',
                            target: payload.messageId || 'unknown_tool',
                            details: typeof payload.result === 'string' ? payload.result.slice(0, 120) : JSON.stringify(payload.result, null, 2).slice(0, 120),
                            eventType: 'tool_result'
                        });
                    } else if (payload.type === 'done') {
                        addEvent({ ...baseActivityEvent, id: crypto.randomUUID(), action: 'completed response', eventType: 'complete' });
                    } else if (payload.type === 'error') {
                        addEvent({ ...baseActivityEvent, id: crypto.randomUUID(), action: 'encountered error', details: payload.error, eventType: 'error' });
                    }
                    // --- End Activity Feed Logic ---

                    // --- Event Processing Logic for chat messages ---
                    storeSet(state => {
                        // Re-fetch chat from state in case it was modified by another async operation (though less likely here)
                        const chat = state.chats[payload.sessionId];
                        if (!chat) {
                            if (payload.type === 'tool_result') {
                                console.log('[chatStore] tool_result - EARLY RETURN: No chat found for session', payload.sessionId);
                            }
                            return state;
                        }

                        let messageId = payload.messageId || `${payload.sessionId}-synthetic-${Date.now()}`;
                        let existingMessageIndex = chat.messages.findIndex(m => m.id === messageId);
                        let assistantMessage: ChatMessage | undefined = existingMessageIndex !== -1 ? chat.messages[existingMessageIndex] : undefined;

                        // Logic for handling various agent events and updating message state
                        if (payload.type === 'tool_result') {
                            console.log('[chatStore] INSIDE setState - processing tool_result event');
                        }

                        if ((payload.type === 'chunk' || payload.type === 'token') && payload.delta) {
                            // Defensive programming: ignore pure whitespace chunks
                            if (!payload.delta.trim()) {
                                console.log('[chatStore] Ignoring whitespace-only chunk event');
                                return state;
                            }

                            if (!assistantMessage) {
                                assistantMessage = {
                                    id: messageId,
                                    sessionId: payload.sessionId,
                                    role: ChatRole.Assistant,
                                    content: [{ type: 'text', text: payload.delta }],
                                    timestamp: eventTimestamp,
                                    thinking: false, // show text immediately
                                    isStreaming: true,
                                    debugSourceEvent: { type: payload.type, triggerEventId: payload.messageId }
                                };
                                upsert(chat.messages, assistantMessage); // Step 6.4
                            } else {
                                assistantMessage.isStreaming = true;
                                assistantMessage.thinking = false; // show text immediately
                                assistantMessage.timestamp = eventTimestamp;
                                const lastPart = assistantMessage.content[assistantMessage.content.length - 1];
                                if (lastPart?.type === 'text') {
                                    lastPart.text += payload.delta;
                                } else {
                                    assistantMessage.content.push({ type: 'text', text: payload.delta });
                                }
                            }
                        } else if (payload.type === 'tool_call' && payload.toolCall) {
                            console.log(`[chatStore] STORE_SET_TRACE: Event type 'tool_call'. Payload:`, JSON.stringify(payload));
                            let messageIdToUse = payload.messageId || `${payload.sessionId}-synthetic-${Date.now()}`;
                            let existingMsgForToolCall = chat.messages.find(m => m.id === messageIdToUse);

                            console.log(`[chatStore] STORE_SET_TRACE: tool_call - messageIdToUse for lookup/creation: "${messageIdToUse}"`);
                            console.log(
                                `[chatStore] STORE_SET_TRACE: tool_call - assistantMessage before logic (based on messageIdToUse):`,
                                JSON.stringify(existingMsgForToolCall)
                            );
                            console.log(
                                `[chatStore] STORE_SET_TRACE: tool_call - chat.messages BEFORE upsert (IDs):`,
                                JSON.stringify(chat.messages.map(m => m.id))
                            );

                            // Generate a proper tool ID if one isn't provided
                            const toolCallIndex = existingMsgForToolCall?.content.filter(p => p.type === 'tool_use').length || 0;
                            const generatedToolId = generateToolId(
                                payload.toolCall.id,
                                payload.toolCall.name,
                                payload.toolCall.arguments,
                                messageIdToUse,
                                toolCallIndex
                            );

                            const toolUseContent: ToolUsePart = {
                                type: 'tool_use',
                                id: generatedToolId,
                                name: payload.toolCall.name,
                                input: payload.toolCall.arguments
                            };

                            let finalAssistantMessageForUpsert: ChatMessage | undefined = existingMsgForToolCall;

                            if (!finalAssistantMessageForUpsert) {
                                finalAssistantMessageForUpsert = {
                                    id: messageIdToUse,
                                    sessionId: payload.sessionId,
                                    role: ChatRole.Assistant,
                                    content: [toolUseContent],
                                    timestamp: eventTimestamp,
                                    thinking: false,
                                    isStreaming: true,
                                    debugSourceEvent: { type: payload.type, triggerEventId: payload.messageId }
                                };
                                console.log(
                                    `[chatStore] STORE_SET_TRACE: tool_call - CREATING new assistant message:`,
                                    JSON.stringify(finalAssistantMessageForUpsert)
                                );
                                upsert(chat.messages, finalAssistantMessageForUpsert);
                            } else {
                                // Check if this exact tool call already exists (by name and input)
                                const isDuplicate = finalAssistantMessageForUpsert.content.some(
                                    part =>
                                        part.type === 'tool_use' &&
                                        part.name === payload.toolCall?.name &&
                                        JSON.stringify(part.input) === JSON.stringify(payload.toolCall?.arguments)
                                );

                                if (!isDuplicate) {
                                    finalAssistantMessageForUpsert.content.push(toolUseContent);
                                    console.log(
                                        `[chatStore] STORE_SET_TRACE: tool_call - ADDING new tool use to existing message ID "${finalAssistantMessageForUpsert.id}":`,
                                        JSON.stringify(toolUseContent)
                                    );
                                } else {
                                    console.log(
                                        `[chatStore] STORE_SET_TRACE: tool_call - SKIPPING duplicate tool call (${payload.toolCall.name}) in message "${finalAssistantMessageForUpsert.id}"`
                                    );
                                }

                                finalAssistantMessageForUpsert.thinking = false;
                                finalAssistantMessageForUpsert.isStreaming = true;
                                finalAssistantMessageForUpsert.timestamp = eventTimestamp;
                                upsert(chat.messages, finalAssistantMessageForUpsert);
                            }

                            console.log(
                                `[chatStore] STORE_SET_TRACE: tool_call - chat.messages AFTER upsert (IDs):`,
                                JSON.stringify(chat.messages.map(m => m.id))
                            );
                        } else if (payload.type === 'tool_result') {
                            console.log(`[chatStore] Processing tool_result event:`, {
                                messageId: payload.messageId,
                                result: payload.result,
                                error: payload.error,
                                sessionId: payload.sessionId
                            });

                            // Find the most recent assistant message with tool calls
                            let toolMessageFoundAndUpdated = false;
                            let resultIndex = 0; // Track which result this is for sequential matching

                            // Count existing tool results to determine the index
                            for (let i = chat.messages.length - 1; i >= 0; i--) {
                                const msg = chat.messages[i];
                                if (msg.role === ChatRole.Assistant && msg.content) {
                                    resultIndex = msg.content.filter(p => p.type === 'tool_result').length;
                                    break;
                                }
                            }

                            for (let i = chat.messages.length - 1; i >= 0; i--) {
                                const msg = chat.messages[i];
                                if (msg.role === ChatRole.Assistant && msg.content) {
                                    // Get all tool uses in this message
                                    const toolUses = msg.content.filter(p => p.type === 'tool_use');

                                    if (toolUses.length > 0) {
                                        // Try to match the result to a tool call
                                        const matchedToolId = matchToolResultToCall(
                                            payload.messageId,
                                            toolUses.map(tu => ({ id: tu.id, name: tu.name })),
                                            resultIndex
                                        );

                                        if (matchedToolId) {
                                            const toolUseIdx = msg.content.findIndex(p => p.type === 'tool_use' && p.id === matchedToolId);

                                            if (toolUseIdx !== -1) {
                                                // Format the result content properly
                                                let resultContent = '';
                                                if (typeof payload.result === 'string') {
                                                    resultContent = payload.result;
                                                } else if (payload.result?.content) {
                                                    // Handle structured result with content array
                                                    if (Array.isArray(payload.result.content)) {
                                                        resultContent = payload.result.content.map((item: any) => item.text || JSON.stringify(item)).join('\n');
                                                    } else {
                                                        resultContent = JSON.stringify(payload.result.content);
                                                    }
                                                } else {
                                                    resultContent = JSON.stringify(payload.result, null, 2);
                                                }

                                                msg.content.splice(toolUseIdx + 1, 0, {
                                                    type: 'tool_result',
                                                    tool_use_id: matchedToolId,
                                                    content: resultContent,
                                                    is_error: !!payload.error
                                                });
                                                msg.timestamp = eventTimestamp;
                                                assistantMessage = msg;
                                                toolMessageFoundAndUpdated = true;
                                                console.log(`[chatStore] tool_result matched to tool_use id ${matchedToolId}`);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            /* ───────────────────────────────────────────────
                               Sequential-fallback pairing for placeholder ids
                               ─────────────────────────────────────────────── */
                            const placeholderIds = ['', '-result', '-call'];
                            const useSequential = placeholderIds.includes(payload.messageId ?? '');

                            console.log(`[chatStore] tool_result sequential matching check:`, {
                                messageId: payload.messageId,
                                useSequential,
                                toolMessageFoundAndUpdated
                            });

                            if (useSequential && !toolMessageFoundAndUpdated) {
                                outer: for (let i = chat.messages.length - 1; i >= 0; i--) {
                                    const msg = chat.messages[i];
                                    if (msg.role !== ChatRole.Assistant) continue;

                                    const toolUses = msg.content.filter(p => p.type === 'tool_use') as ToolUsePart[];

                                    console.log(`[chatStore] Checking message ${msg.id} for unpaired tool uses:`, {
                                        toolUseCount: toolUses.length,
                                        toolUseIds: toolUses.map(tu => tu.id)
                                    });

                                    for (const use of toolUses) {
                                        const alreadyHas = msg.content.some(p => p.type === 'tool_result' && (p as ToolResultPart).tool_use_id === use.id);
                                        if (!alreadyHas) {
                                            msg.content.push({
                                                type: 'tool_result',
                                                tool_use_id: use.id, // keep internal consistency
                                                content: typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result, null, 2),
                                                is_error: !!payload.error
                                            });
                                            msg.timestamp = eventTimestamp;
                                            toolMessageFoundAndUpdated = true;
                                            console.log('[chatStore] tool_result paired sequentially with tool_use id', use.id || '<empty>');
                                            break outer;
                                        }
                                    }
                                }
                            }

                            /* final fallback – stand-alone tool message */
                            if (!toolMessageFoundAndUpdated) {
                                console.warn(
                                    `[chatStore] tool_result: No matching ToolUsePart for tool_call_id ${payload.messageId}. Storing as new 'tool' message.`
                                );
                                const toolResponseMsg: ChatMessage = {
                                    id: crypto.randomUUID(),
                                    sessionId: payload.sessionId,
                                    role: ChatRole.Tool,
                                    content: [
                                        {
                                            type: 'tool_result',
                                            tool_use_id: payload.messageId,
                                            content: typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result, null, 2),
                                            is_error: !!payload.error
                                        }
                                    ],
                                    timestamp: eventTimestamp,
                                    debugSourceEvent: { type: payload.type, triggerEventId: payload.messageId }
                                };
                                upsert(chat.messages, toolResponseMsg);
                                ChatService.saveChatMessage(prepareMessageForService(toolResponseMsg))
                                    .then(() => console.log(`[chatStore] Tool response message ${toolResponseMsg.id} saved to Supabase.`))
                                    .catch(err => console.error(`[chatStore] Error saving tool response ${toolResponseMsg.id} to Supabase:`, err));
                            }
                            // REMOVED DUPLICATE TOOL_RESULT HANDLING BLOCK
                            // This entire "NEW LOGIC" block was causing duplicate tool results
                            // The first tool_result handler above is sufficient
                        } else if (payload.type === 'done') {
                            // payload.messageId is now "SESSION_ID-current" from the backend change
                            let messageIdFromDoneEvent = payload.messageId;
                            console.log(`[chatStore] DONE event received. payload.messageId: "${messageIdFromDoneEvent}"`);

                            // Cleanup processed event keys periodically
                            useChatStore.getState().cleanupProcessedEventKeys();

                            let directMatchAssistantMessage: ChatMessage | undefined = undefined;
                            if (messageIdFromDoneEvent) {
                                // Check if messageIdFromDoneEvent is not undefined/null
                                directMatchAssistantMessage = chat.messages.find(m => m.id === messageIdFromDoneEvent);
                            }

                            if (directMatchAssistantMessage) {
                                console.log(
                                    `[chatStore] DONE event (direct match by "${messageIdFromDoneEvent}"): Found assistantMessage. Clearing flags for ID "${directMatchAssistantMessage.id}".`
                                );
                                directMatchAssistantMessage.isStreaming = false;
                                directMatchAssistantMessage.thinking = false;
                                directMatchAssistantMessage.timestamp = eventTimestamp;
                                ChatService.saveChatMessage(prepareMessageForService(directMatchAssistantMessage))
                                    .then(() =>
                                        console.log(
                                            `[chatStore] DONE event (direct match): Assistant message ${directMatchAssistantMessage?.id} saved to Supabase.`
                                        )
                                    )
                                    .catch(err =>
                                        console.error(
                                            `[chatStore] DONE event (direct match): Error saving assistant message ${directMatchAssistantMessage?.id} to Supabase:`,
                                            err
                                        )
                                    );
                            } else {
                                // Heuristic: No direct match for done event's messageId, or messageId was null/undefined.
                                // Clear thinking flags for ALL assistant messages that HAVE tool_uses and are thinking.
                                console.warn(
                                    `[chatStore] DONE event: No assistantMessage found directly by ID "${messageIdFromDoneEvent}". Applying REFINED heuristic for messages with tool_uses.`
                                );
                                let updatedAnyMessage = false;
                                chat.messages.forEach(msg => {
                                    if (msg.role === ChatRole.Assistant && msg.thinking) {
                                        // Only check if thinking
                                        const hasToolUse = msg.content.some(part => part.type === 'tool_use');
                                        if (hasToolUse) {
                                            console.log(
                                                `[chatStore] DONE event (REFINED heuristic): Clearing thinking flag for assistant message ID "${msg.id}" (has tool_use). Was thinking: ${msg.thinking}`
                                            );
                                            msg.thinking = false; // Primarily clear thinking
                                            msg.isStreaming = false; // Also clear streaming as a precaution
                                            msg.timestamp = eventTimestamp;
                                            ChatService.saveChatMessage(prepareMessageForService(msg))
                                                .then(() =>
                                                    console.log(`[chatStore] DONE event (REFINED heuristic): Assistant message ${msg.id} saved to Supabase.`)
                                                )
                                                .catch(err =>
                                                    console.error(
                                                        `[chatStore] DONE event (REFINED heuristic): Error saving assistant message ${msg.id} to Supabase:`,
                                                        err
                                                    )
                                                );
                                            updatedAnyMessage = true;
                                        }
                                    }
                                });
                                if (!updatedAnyMessage) {
                                    // If no assistant messages with tool_uses were thinking, fall back to clearing the last known streaming/thinking message (original aggressive heuristic)
                                    console.warn(
                                        `[chatStore] DONE event (REFINED heuristic): No thinking assistant messages with tool_uses found. Falling back to original aggressive heuristic.`
                                    );
                                    chat.messages.forEach(msg => {
                                        if (msg.role === ChatRole.Assistant && (msg.isStreaming || msg.thinking)) {
                                            // console.log(
                                            //     `[chatStore] DONE event (FALLBACK heuristic): Clearing flags for assistant message ID "${msg.id}". Was thinking: ${msg.thinking}, Was streaming: ${msg.isStreaming}`
                                            // );
                                            msg.isStreaming = false;
                                            msg.thinking = false;
                                            msg.timestamp = eventTimestamp;
                                            ChatService.saveChatMessage(prepareMessageForService(msg));
                                            updatedAnyMessage = true;
                                        }
                                    });
                                }
                                if (!updatedAnyMessage) {
                                    // console.warn(`[chatStore] DONE event (FALLBACK heuristic): No streaming/thinking assistant messages found to update.`);
                                }
                            }
                        } else if (payload.type === 'final_message_history' && Array.isArray(payload.history)) {
                            // // This event provides the complete message history from the backend.
                            // // Instead of replacing everything, we'll merge intelligently.
                            // console.log(`[chatStore] Processing final_message_history for session ${payload.sessionId}, ${payload.history.length} messages.`);
                            // // Track how many messages we had before
                            // const messageCountBefore = chat.messages.length;
                            // const history: ChatMessage[] = payload.history
                            //     .map((raw: any) => normaliseWorkerHistoryItem(raw, payload.sessionId))
                            //     .map(m => ({ ...m, isStreaming: false, thinking: false })); // Ensure flags are reset for history items
                            // // Create a map of existing messages by ID for efficient lookup
                            // const existingMessageIds = new Set(chat.messages.map(m => m.id));
                            // // Only add messages that don't already exist
                            // let newMessagesCount = 0;
                            // history.forEach(msg => {
                            //     if (!existingMessageIds.has(msg.id)) {
                            //         upsert(chat.messages, msg);
                            //         newMessagesCount++;
                            //     }
                            // });
                            // // Sort messages by timestamp to ensure correct order
                            // chat.messages.sort((a, b) => a.timestamp - b.timestamp);
                            // console.log(`[chatStore] final_message_history: Had ${messageCountBefore} messages, received ${history.length}, added ${newMessagesCount} new messages`);
                            // if (newMessagesCount > 0) {
                            //     // Only save the new messages
                            //     const newMessages = history.filter(msg => !existingMessageIds.has(msg.id));
                            //     const batch = newMessages.map(m => prepareMessageForService(m));
                            //     ChatService.saveChatMessageBatch(batch)
                            //         .then(() => console.log(`[chatStore] Batch of ${batch.length} new history messages for session ${payload.sessionId} saved.`))
                            //         .catch(err => console.error(`[chatStore] Error batch-saving new history for ${payload.sessionId}:`, err));
                            // }
                        } else if (payload.type === 'error') {
                            const errorMessage: ChatMessage = {
                                id: messageId,
                                sessionId: payload.sessionId,
                                role: ChatRole.Error,
                                content: [{ type: 'text', text: payload.error || 'An unknown error occurred.' }],
                                timestamp: eventTimestamp,
                                debugSourceEvent: { type: payload.type, triggerEventId: payload.messageId }
                            };
                            upsert(chat.messages, errorMessage); // Step 6.4
                            // Optionally persist error messages to Supabase
                            // ChatService.saveChatMessage(mapStoreMessageToSupabaseNewMessage(errorMessage));
                        }

                        const updatedSessionMetaForStore = state.sessions[payload.sessionId]
                            ? { ...state.sessions[payload.sessionId], lastUpdated: eventTimestamp }
                            : undefined;

                        // Clone messages array to refresh reference and trigger React updates
                        const chatWithClonedMessages = { ...chat, messages: [...chat.messages] };

                        return {
                            chats: { ...state.chats, [payload.sessionId]: chatWithClonedMessages },
                            ...(updatedSessionMetaForStore && { sessions: { ...state.sessions, [payload.sessionId]: updatedSessionMetaForStore } })
                        };
                    });
                };

                AgentEventService.subscribeToAllEvents(agentHandler, 'chatStore'); // Step 6.6
                hasSubscribedToAgentEvents = true;
                console.log('[chatStore] Successfully subscribed to AgentEventService.');
            } catch (error) {
                console.error('[chatStore] Error during AgentEventService subscription:', error);
            }
        }
        // Load initial data from Supabase if not already initialized by this new logic.
        // The `isInitialized` flag prevents re-fetching on every store recreation if state is not persisted.
        if (get().isInitialized) {
            console.log('[chatStore] Store already initialized with data from Supabase.');
            return;
        }

        try {
            console.log('[chatStore] Initializing store: Fetching session metas from Supabase...');
            const storeSessionMetas = await ChatService.getAllChatSessionMetas(); // Service returns SessionMeta[] (store type)

            if (!storeSessionMetas || storeSessionMetas.length === 0) {
                console.log('[chatStore] No existing sessions found in Supabase.');
                set({ isInitialized: true }); // Mark as initialized even if no data
                return;
            }

            // 🚀 PHASE 1: INSTANT SIDEBAR (TTFP Optimization)
            // Show sidebar immediately with session metadata only
            console.log(`[chatStore] Phase 1: Loading sidebar data for ${storeSessionMetas.length} sessions...`);
            const startTime = performance.now();
            
            // Create lightweight chat sessions for immediate sidebar display
            const newStoreSessions: Record<string, SessionMeta> = {};
            const newStoreChats: Record<string, ChatSession> = {};
            
            storeSessionMetas.forEach(meta => {
                newStoreSessions[meta.id] = meta;
                
                // Create lightweight session for sidebar (no messages yet)
                newStoreChats[meta.id] = {
                    id: meta.id,
                    name: meta.name,
                    avatar: meta.avatar,
                    specialty: 'Loading...', // Will be updated when full data loads
                    messages: [], // Empty initially - loaded on demand
                    model: 'Unknown',
                    tools: [],
                    createdAt: meta.lastUpdated,
                    lastUpdated: meta.lastUpdated,
                    agent_config_id: null, // Will be updated when full data loads
                    user_id: null
                };
            });

            // 🚀 IMMEDIATE UI UPDATE: Show sidebar instantly
            set({
                sessions: newStoreSessions,
                chats: newStoreChats,
                currentSessionId: storeSessionMetas[0]?.id,
                isInitialized: true // Mark as initialized so UI shows immediately
            });

            const phase1Time = performance.now();
            console.log(`[chatStore] Phase 1 complete in ${Math.round(phase1Time - startTime)}ms. Sidebar visible with ${Object.keys(newStoreSessions).length} sessions.`);

            // 🚀 PHASE 2: CRITICAL BACKEND RESTORATION (High Priority)
            // Restore sessions in backend immediately to prevent send failures
            console.log(`[chatStore] Phase 2: Critical backend restoration for ${storeSessionMetas.length} sessions...`);
            
            // First, get agent_config_ids for all sessions (lightweight query)
            const sessionIds = storeSessionMetas.map(meta => meta.id);
            const sessionConfigPromise = ChatService.getChatSessionsBatch(sessionIds, { messageLimit: 0 }) // No messages, just metadata
                .then(sessions => {
                    // Restore all sessions with agent_config_id in backend immediately
                    const restorationPromises = sessions.map(async (session, index) => {
                        if (session && session.agent_config_id) {
                            try {
                                await ChatApi.restoreSession(session.id, session.agent_config_id);
                                console.log(`[chatStore] CRITICAL: Session ${session.id} restored in backend`);
                                return { sessionId: session.id, success: true };
                            } catch (error) {
                                console.error(`[chatStore] CRITICAL: Failed to restore session ${session.id}:`, error);
                                return { sessionId: session.id, success: false, error };
                            }
                        } else {
                            const meta = storeSessionMetas[index];
                            console.warn(`[chatStore] CRITICAL: Session ${meta.id} missing agent_config_id, cannot restore`);
                            return { sessionId: meta.id, success: false, error: 'No agent_config_id' };
                        }
                    });
                    
                    return Promise.allSettled(restorationPromises);
                })
                .then(results => {
                    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
                    const failed = results.length - successful;
                    console.log(`[chatStore] CRITICAL: Backend restoration complete. ${successful} successful, ${failed} failed.`);
                    
                    if (failed > 0) {
                        console.warn(`[chatStore] CRITICAL: ${failed} sessions failed to restore. Users may see send errors for these sessions.`);
                    }
                });

            // 🚀 PHASE 3: BACKGROUND MESSAGE LOADING (Lower Priority)
            // Load full message data in background without blocking UI
            console.log(`[chatStore] Phase 3: Background message loading...`);
            
            const backgroundLoadPromises = storeSessionMetas.map(async (storeMeta) => {
                try {
                    // Load full session data (including messages)
                    const fullStoreChatSession = await ChatService.getChatSession(storeMeta.id, { messageLimit: 20 });
                    
                    if (fullStoreChatSession) {
                        // Update store with full data (non-blocking)
                        set(state => ({
                            chats: {
                                ...state.chats,
                                [storeMeta.id]: {
                                    ...state.chats[storeMeta.id],
                                    ...fullStoreChatSession,
                                    messages: fullStoreChatSession.messages // Update with actual messages
                                }
                            }
                        }));

                        console.log(`[chatStore] Background loaded session ${storeMeta.id} with ${fullStoreChatSession.messages.length} messages`);
                    }
                } catch (error) {
                    console.warn(`[chatStore] Background loading failed for session ${storeMeta.id}:`, error);
                    // Session already visible in sidebar with basic data, so this is non-critical
                }
            });

            // Don't await - let it load in background
            Promise.allSettled(backgroundLoadPromises).then(() => {
                const phase2Time = performance.now();
                console.log(`[chatStore] Phase 2 complete in ${Math.round(phase2Time - phase1Time)}ms. Full session data loaded in background.`);
                console.log(`[chatStore] Total initialization time: ${Math.round(phase2Time - startTime)}ms (TTFP: ${Math.round(phase1Time - startTime)}ms)`);
            });
        } catch (error) {
            console.error('[chatStore] Failed to initialize store from Supabase:', error);
            set({ isInitialized: true }); // Still mark as initialized to prevent re-attempts on error
        }
    },

    async createSession(agentConfigId: string, name = 'New Chat', templateOverrides = {}) {
        // 1. Call ChatApi to inform the live backend (Rust/Python) about the new session.
        // This is assumed to return an ID that the live backend will use.
        let liveSessionId: string;
        try {
            // ──────────────────────────────────────────────────────────────
            // Ensure tool_groups contain the key `type` (Serde expects it).
            // ──────────────────────────────────────────────────────────────
            const rawPayload = useAgentConfigStore.getState().agentConfigs[agentConfigId] ?? null;

            const normalizedPayload = rawPayload
                ? {
                      ...rawPayload,
                      tool_groups: (rawPayload.tool_groups || []).map(tg => ({
                          ...tg,
                          // keep existing key but also provide `type`
                          type: (tg as any).type ?? (tg as any).group_type ?? 'CUSTOM'
                      }))
                  }
                : null;

            const liveSession = await ChatApi.startChatSession({
                name: name,
                agentId: agentConfigId,
                avatar: templateOverrides.avatar || 'assets/robots/robot1.png'
            });
            liveSessionId = liveSession.id; // Extract the ID string from the session object
            console.log(`[chatStore] Backend session created with ID: ${liveSessionId}`);
        } catch (error) {
            console.error(`[chatStore] Failed to create backend session for agent ${agentConfigId}:`, error);
            throw error; // Re-throw to allow proper error handling in UI
        }

        const id = liveSessionId; // Use the ID from the live backend for Supabase to keep them synced.
        const now = Date.now();
        const userId = getUserName();

        // Define the initial structure for the session in the store and for Supabase
        const baseSessionDetails: Partial<ChatSession> = {
            name: name,
            avatar: 'assets/robots/robot1.png', // Default avatar
            specialty: 'General Assistant', // Default specialty
            model: 'gpt-4o-mini', // Default model
            tools: [], // Default tools
            systemPrompt: 'You are a helpful assistant.', // Default prompt
            temperature: 0.7, // Default temperature
            ...templateOverrides // Apply any overrides
        };
        // 2. Persist session metadata to Supabase
        const supabaseSessionData: DbNewChatSession = {
            id: id, // Crucial: Use the same ID as the live backend
            name: baseSessionDetails.name!,
            avatar_url: baseSessionDetails.avatar!,
            agent_config_id: agentConfigId,
            user_id: userId, // Pass user_id if available
            metadata: {
                // Store additional details in metadata JSONB field
                specialty: baseSessionDetails.specialty,
                model: baseSessionDetails.model,
                tools: baseSessionDetails.tools,
                systemPrompt: baseSessionDetails.systemPrompt,
                temperature: baseSessionDetails.temperature
                // Add any other relevant fields from templateOverrides or defaults
            }
            // created_at and last_message_at will be set by DB or by message saves
        };

        try {
            await ChatService.createChatSession(supabaseSessionData);
            console.log(`[chatStore] Session ${id} metadata persisted to Supabase.`);
        } catch (dbError) {
            console.error(`[chatStore] Failed to save new session ${id} metadata to Supabase:`, dbError);
            // Optionally, you might want to inform the live backend to terminate the session if DB persistence fails critically.
            // For now, we proceed with optimistic update in store, but this could lead to inconsistency.
            // Consider re-throwing or specific error handling if DB persistence is mandatory for session viability.
        }

        // 3. Optimistically update the Zustand store
        const storeSessionMeta: SessionMeta = {
            id,
            name: baseSessionDetails.name!,
            avatar: baseSessionDetails.avatar!,
            lastUpdated: now,
            unreadCount: 0
        };
        const storeChatSession: ChatSession = {
            id,
            name: baseSessionDetails.name!,
            avatar: baseSessionDetails.avatar!,
            specialty: baseSessionDetails.specialty!,
            messages: [], // New session starts with no messages
            model: baseSessionDetails.model!,
            tools: baseSessionDetails.tools!,
            createdAt: now,
            lastUpdated: now,
            systemPrompt: baseSessionDetails.systemPrompt,
            temperature: baseSessionDetails.temperature,
            agent_config_id: agentConfigId,
            user_id: userId
        };

        set(state => ({
            sessions: { ...state.sessions, [id]: storeSessionMeta },
            chats: { ...state.chats, [id]: storeChatSession },
            currentSessionId: id // Automatically switch to the new session
        }));

        return id; // Return the new session ID
    },

    async sendMessage(content: string, targetSessionId?: string, codingMode?: { enabled: boolean; codebasePath?: string }) {
        const sessionIdToUse = targetSessionId || get().currentSessionId;

        if (!sessionIdToUse) {
            console.error('[chatStore] sendMessage: No session ID provided or set as current.');
            return;
        }

        // Check if the session has agent_config_id before attempting to send
        const session = get().chats[sessionIdToUse];
        if (session && !session.agent_config_id) {
            console.warn(`[chatStore] Session ${sessionIdToUse} is missing agent_config_id. This session cannot send new messages.`);
            const errorMessage: ChatMessage = {
                id: crypto.randomUUID(),
                sessionId: sessionIdToUse,
                role: ChatRole.Error,
                content: [
                    {
                        type: 'text',
                        text: `This chat session was created before proper session management was implemented and cannot send new messages. Please create a new session to continue chatting. Your message history is preserved.`
                    }
                ],
                timestamp: Date.now()
            };
            set(state => {
                const chat = state.chats[sessionIdToUse];
                if (!chat) return state;
                return { chats: { ...state.chats, [sessionIdToUse]: { ...chat, messages: [...chat.messages, errorMessage] } } };
            });
            return;
        }

        const currentUser = null; // TODO: Get user details if needed for role or user_id on message
        const msgId = crypto.randomUUID();
        const now = Date.now();

        // 1. Optimistically update the store with the user's message
        const userMessage: ChatMessage = {
            id: msgId,
            sessionId: sessionIdToUse,
            role: ChatRole.User,
            content: [{ type: 'text', text: content }],
            timestamp: now,
            delivered: true, // Optimistically assume delivered to store
            read: true // User's own message is considered read by them
        };

        set(state => {
            const chat = state.chats[sessionIdToUse];
            if (!chat) return state;
            // Step 6.5 (Optional): Use upsert for user messages
            const newMessages = [...chat.messages];
            upsert(newMessages, userMessage);
            const updatedMessages = newMessages;

            const updatedChat = { ...chat, messages: updatedMessages, lastUpdated: now };
            const updatedSessionMeta = { ...state.sessions[sessionIdToUse], lastUpdated: now, unreadCount: 0 };
            return {
                chats: { ...state.chats, [sessionIdToUse]: updatedChat },
                sessions: { ...state.sessions, [sessionIdToUse]: updatedSessionMeta }
            };
        });

        // 2. Persist the user's message to Supabase
        const payloadForService = prepareMessageForService(userMessage);
        try {
            await ChatService.saveChatMessage(payloadForService);
            console.log(`[chatStore] User message ${msgId} for session ${sessionIdToUse} saved to Supabase.`);
        } catch (dbError) {
            console.error(`[chatStore] Failed to save user message ${msgId} for session ${sessionIdToUse} to Supabase:`, dbError);
            // Optional: UI feedback or retry logic for failed DB save
            // Message is already in store optimistically.
        }

        // 3. Send the message to the live backend (Rust/Python via Tauri)
        try {
            // Get the current conversation history including the new message
            const currentChat = get().chats[sessionIdToUse];
            if (!currentChat) {
                throw new Error(`Chat session ${sessionIdToUse} not found in store`);
            }
            
            // 🚀 ENSURE COMPLETE MESSAGE HISTORY: Load all messages if not already loaded
            let conversationMessages = currentChat.messages;
            
            // If messages are empty or minimal (from TTFP optimization), load full history
            if (!conversationMessages || conversationMessages.length <= 1) { // <= 1 because we just added the user message
                console.log(`[chatStore] Loading full message history for session ${sessionIdToUse} before sending...`);
                try {
                    await get().loadMessagesForSession(sessionIdToUse);
                    const updatedChat = get().chats[sessionIdToUse];
                    conversationMessages = updatedChat?.messages || [];
                    console.log(`[chatStore] Loaded ${conversationMessages.length} messages for session ${sessionIdToUse}`);
                } catch (loadError) {
                    console.warn(`[chatStore] Failed to load messages for session ${sessionIdToUse}:`, loadError);
                    // Continue with available messages (might be empty for new sessions)
                }
            }
            
            console.log(`[chatStore] Sending ${conversationMessages.length} messages to backend for session ${sessionIdToUse}`);
            console.log(`[chatStore] Message summary:`, conversationMessages.map(m => `${m.role}: ${m.content.length} parts`));
            
            // Check if we need to send coding mode metadata
            if (codingMode && codingMode.enabled) {
                const metadata = {
                    coding_mode: {
                        enabled: true,
                        codebase_path: codingMode.codebasePath || ''
                    }
                };
                await ChatApi.sendChatMessageWithMetadata(sessionIdToUse, conversationMessages, metadata);
                console.log(`[chatStore] Message sent to live backend with coding mode for session ${sessionIdToUse}.`);
            } else {
                await ChatApi.sendChatMessage(sessionIdToUse, conversationMessages);
                console.log(`[chatStore] Message sent to live backend for session ${sessionIdToUse}.`);
            }
        } catch (apiError) {
            console.error(`[chatStore] Error sending message to live backend for session ${sessionIdToUse}:`, apiError);

            // Check if this is a "session not found" error that might be resolved by session restoration
            const errorMsgContent = apiError instanceof Error ? apiError.message : String(apiError);
            const isSessionNotFoundError =
                errorMsgContent.includes('Session') && (
                    errorMsgContent.includes('not found') || 
                    errorMsgContent.includes('need to be restored') ||
                    errorMsgContent.includes('SessionCtx') ||
                    errorMsgContent.includes('AppState.sessions')
                );

            if (isSessionNotFoundError) {
                console.log(`[chatStore] Attempting session restoration for ${sessionIdToUse}...`);
                try {
                    // Get the session from our store to find the agent config ID
                    const session = get().chats[sessionIdToUse];

                    // DEBUG: Log the full session object to see what's missing
                    console.log(`[chatStore] DEBUG: Full session object for ${sessionIdToUse}:`, JSON.stringify(session, null, 2));
                    console.log(`[chatStore] DEBUG: Session agent_config_id:`, session?.agent_config_id);
                    console.log(`[chatStore] DEBUG: Session keys:`, session ? Object.keys(session) : 'session is null/undefined');

                    if (session && session.agent_config_id) {
                        // Case 1: Session exists in store with agent_config_id
                        console.log(`[chatStore] Attempting to restore session ${sessionIdToUse} with agent_config_id: ${session.agent_config_id}`);
                        await get().restoreBackendSession(sessionIdToUse, session.agent_config_id);
                        console.log(`[chatStore] Session ${sessionIdToUse} restored successfully. Retrying message send...`);
                        
                    } else if (session && !session.agent_config_id) {
                        // Case 2: Session exists in store but missing agent_config_id - load from Supabase
                        console.log(`[chatStore] Session ${sessionIdToUse} missing agent_config_id, loading from Supabase...`);
                        const fullSession = await ChatService.getChatSession(sessionIdToUse, { messageLimit: 0 });
                        
                        if (fullSession && fullSession.agent_config_id) {
                            // Update store with complete session data
                            set(state => ({
                                chats: {
                                    ...state.chats,
                                    [sessionIdToUse]: {
                                        ...state.chats[sessionIdToUse],
                                        ...fullSession
                                    }
                                }
                            }));
                            
                            // Now restore with the loaded agent_config_id
                            console.log(`[chatStore] Attempting to restore session ${sessionIdToUse} with loaded agent_config_id: ${fullSession.agent_config_id}`);
                            await get().restoreBackendSession(sessionIdToUse, fullSession.agent_config_id);
                            console.log(`[chatStore] Session ${sessionIdToUse} loaded and restored successfully. Retrying message send...`);
                        } else {
                            throw new Error(`Session ${sessionIdToUse} has no agent_config_id in Supabase`);
                        }
                        
                    } else if (!session) {
                        // Case 3: Session doesn't exist in store at all - load completely from Supabase
                        console.log(`[chatStore] Session ${sessionIdToUse} not found in store, loading from Supabase...`);
                        const fullSession = await ChatService.getChatSession(sessionIdToUse, { messageLimit: 20 });
                        
                        if (fullSession && fullSession.agent_config_id) {
                            // Add session to store
                            const sessionMeta: SessionMeta = {
                                id: fullSession.id,
                                name: fullSession.name,
                                avatar: fullSession.avatar,
                                lastUpdated: fullSession.lastUpdated,
                                unreadCount: 0
                            };
                            
                            set(state => ({
                                sessions: { ...state.sessions, [sessionIdToUse]: sessionMeta },
                                chats: { ...state.chats, [sessionIdToUse]: fullSession }
                            }));
                            
                            // Restore session in backend
                            console.log(`[chatStore] Attempting to restore session ${sessionIdToUse} with loaded agent_config_id: ${fullSession.agent_config_id}`);
                            await get().restoreBackendSession(sessionIdToUse, fullSession.agent_config_id);
                            console.log(`[chatStore] Session ${sessionIdToUse} loaded from Supabase and restored successfully. Retrying message send...`);
                        } else {
                            throw new Error(`Session ${sessionIdToUse} not found in Supabase or missing agent_config_id`);
                        }
                    }
                    
                    // After successful restoration, retry sending the message
                    console.log(`[chatStore] Retrying message send after restoration for session ${sessionIdToUse}...`);
                    const retryChat = get().chats[sessionIdToUse];
                    if (!retryChat) {
                        throw new Error(`Chat session ${sessionIdToUse} not found in store during retry`);
                    }
                    
                    // 🚀 DUPLICATE FIX: Reuse original message instead of rebuilding entire history
                    // Find the original user message that we're trying to send
                    const originalUserMessage = retryChat.messages.find(m => m.id === msgId);
                    if (!originalUserMessage) {
                        throw new Error(`Original user message ${msgId} not found in session ${sessionIdToUse} during retry`);
                    }
                    
                    // Only send the pending user message, not the entire history
                    const retryPayload = [originalUserMessage];
                    
                    console.log(`[chatStore] Retrying with original message ID ${msgId} for session ${sessionIdToUse}`);
                    console.log(`[chatStore] Retry message summary:`, retryPayload.map(m => `${m.role}: ${m.content.length} parts (ID: ${m.id})`));
                    
                    if (codingMode && codingMode.enabled) {
                        const metadata = {
                            coding_mode: {
                                enabled: true,
                                codebase_path: codingMode.codebasePath || ''
                            }
                        };
                        await ChatApi.sendChatMessageWithMetadata(sessionIdToUse, retryPayload, metadata);
                    } else {
                        await ChatApi.sendChatMessage(sessionIdToUse, retryPayload);
                    }
                    console.log(`[chatStore] Message sent successfully after session restoration for ${sessionIdToUse}.`);
                    return; // Success, exit early
                } catch (restoreError) {
                    console.error(`[chatStore] Failed to restore session ${sessionIdToUse}:`, restoreError);
                    
                    // Check if this is specifically due to missing agent_config_id
                    const session = get().chats[sessionIdToUse];
                    if (session && !session.agent_config_id) {
                        console.error(
                            `[chatStore] Cannot restore session ${sessionIdToUse}: missing agent_config_id in session data. Session exists: ${!!session}, agent_config_id: ${
                                session?.agent_config_id
                            }`
                        );

                        // FALLBACK: For sessions without agent_config_id, offer to recreate the session
                        const errorMessage: ChatMessage = {
                            id: crypto.randomUUID(),
                            sessionId: sessionIdToUse,
                            role: ChatRole.Error,
                            content: [
                                {
                                    type: 'text',
                                    text: `This chat session was created before proper session management was implemented and cannot be restored. Please create a new session to continue chatting. Your message history is preserved but new messages cannot be sent to this session.`
                                }
                            ],
                            timestamp: Date.now()
                        };
                        set(state => {
                            const chat = state.chats[sessionIdToUse];
                            if (!chat) return state;
                            return { chats: { ...state.chats, [sessionIdToUse]: { ...chat, messages: [...chat.messages, errorMessage] } } };
                        });
                        return; // Exit early to avoid further error handling
                    }
                    // Fall through to show generic error message
                }
            }

            // Handle error from live backend: add an error message to the chat, etc.
            const errorMessage: ChatMessage = {
                id: crypto.randomUUID(),
                sessionId: sessionIdToUse,
                role: ChatRole.Error,
                content: [{ type: 'text', text: `Failed to send: ${errorMsgContent}` }],
                timestamp: Date.now()
            };
            set(state => {
                const chat = state.chats[sessionIdToUse];
                if (!chat) return state;
                return { chats: { ...state.chats, [sessionIdToUse]: { ...chat, messages: [...chat.messages, errorMessage] } } };
            });
        }
    },

    setCurrentSession(sessionId: string) {
        const state = get();
        if (!state.sessions[sessionId]) {
            console.warn(`[chatStore] setCurrentSession: Session ID ${sessionId} not found in sessions meta. Attempting to load from DB if needed.`);
            // Potentially fetch from DB if not found, though initialize should have loaded it.
            // For now, just warn and proceed if it exists in chats.
        }

        if (!state.chats[sessionId]) {
            console.warn(`[chatStore] setCurrentSession: Chat data for ${sessionId} not found. It should have been loaded during initialize.`);
            // If initialize failed for this session, this could happen.
            // Consider fetching on demand here as a fallback, or ensure initialize is robust.
            // For now, we proceed assuming `initialize` loads all available chat sessions or `createSession` adds it.
            // Creating a placeholder if truly missing to avoid UI errors, but this indicates a state issue.
            const sessionMeta = state.sessions[sessionId];
            if (sessionMeta) {
                set(s => ({
                    chats: {
                        ...s.chats,
                        [sessionId]: {
                            id: sessionMeta.id,
                            name: sessionMeta.name,
                            avatar: sessionMeta.avatar,
                            messages: [],
                            specialty: 'Unknown',
                            model: 'Unknown',
                            tools: [],
                            createdAt: sessionMeta.lastUpdated,
                            lastUpdated: sessionMeta.lastUpdated
                        } as ChatSession // Create a placeholder
                    },
                    currentSessionId: sessionId,
                    sessions: { ...s.sessions, [sessionId]: { ...sessionMeta, unreadCount: 0 } }
                }));
            } else {
                console.error(`[chatStore] Cannot set current session: ${sessionId} - no meta found.`);
                return;
            }
        } else {
            set(s => ({
                currentSessionId: sessionId,
                sessions: { ...s.sessions, [sessionId]: { ...s.sessions[sessionId], unreadCount: 0 } }
            }));
        }
        
        console.log(`[chatStore] Current session set to: ${sessionId}`);
        
        // 🚀 LAZY LOADING: Automatically load messages for the selected session
        const currentSession = get().chats[sessionId];
        if (currentSession && (!currentSession.messages || currentSession.messages.length === 0)) {
            console.log(`[chatStore] Triggering lazy load of messages for session ${sessionId}`);
            // Don't await - load in background
            get().loadMessagesForSession(sessionId).catch(error => 
                console.warn(`[chatStore] Failed to lazy load messages for session ${sessionId}:`, error)
            );
        }
    },

    async deleteSession(sessionId: string) {
        console.log(`[chatStore] Attempting to delete session: ${sessionId}`);
        // 1. Inform the live backend (if necessary for cleanup on that side)
        try {
            await ChatApi.deleteSession(sessionId); // Assumes this API call exists and is needed
            console.log(`[chatStore] Session ${sessionId} deletion signal sent to live backend.`);
        } catch (apiError) {
            console.error(`[chatStore] Error signaling deletion to live backend for session ${sessionId}:`, apiError);
            // Decide if this error should halt the process or just be logged
        }

        // 2. Delete from Supabase
        try {
            await ChatService.deleteChatSession(sessionId);
            console.log(`[chatStore] Session ${sessionId} deleted from Supabase.`);
        } catch (dbError) {
            console.error(`[chatStore] Error deleting session ${sessionId} from Supabase:`, dbError);
            throw dbError; // Re-throw to inform UI or caller of the failure
        }

        // 3. Optimistically update the store
        set(state => {
            const { [sessionId]: _, ...remainingSessions } = state.sessions;
            const { [sessionId]: __, ...remainingChats } = state.chats;
            let newCurrentSessionId = state.currentSessionId;
            if (newCurrentSessionId === sessionId) {
                const sessionIds = Object.keys(remainingSessions);
                newCurrentSessionId = sessionIds.length > 0 ? sessionIds[0] : undefined; // Switch to first available or none
            }
            return { sessions: remainingSessions, chats: remainingChats, currentSessionId: newCurrentSessionId };
        });
        console.log(`[chatStore] Session ${sessionId} removed from local store.`);
    },

    // TODO: Implement Supabase integration for cloneSession if it involves creating new DB records
    async cloneSession(sessionId: string, newName: string): Promise<string> {
        console.warn('[chatStore] cloneSession called but Supabase integration is not fully implemented here.');
        const sourceSession = get().chats[sessionId];
        if (!sourceSession) throw new Error('Session not found for cloning');

        // This likely needs to:
        // 1. Create a new session in the live backend (ChatApi) - existing logic?
        // 2. Create a new session in Supabase (ChatService) with a new ID, copying relevant data.
        // 3. Update store state.
        // The current ChatApi.cloneAgentTemplate might be for a different purpose (agent configs, not chat sessions)
        // For now, mimicking old behavior but it will be inconsistent without DB operations.
        try {
            // Placeholder: In a real scenario, you might get a new agentConfigId or template details from backend.
            // This assumes cloneAgentTemplate is for agent configs, not chat session directly.
            const clonedTemplate = await ChatApi.cloneAgentTemplate(sessionId, newName);
            const newSessionId = await get().createSession(clonedTemplate.id, newName, {
                avatar: clonedTemplate.avatar,
                specialty: clonedTemplate.specialty,
                model: clonedTemplate.model,
                tools: clonedTemplate.tools
            });
            set(state => {
                const newSession = state.chats[newSessionId];
                if (!newSession) return state;
                const messagesToCopy = sourceSession.messages
                    .filter(msg => msg.role === ChatRole.System || msg.role === ChatRole.User || msg.role === ChatRole.Assistant) // Copy assistant too
                    .map(msg => ({ ...msg, id: crypto.randomUUID(), sessionId: newSessionId, timestamp: Date.now() }));
                newSession.messages = messagesToCopy;
                // Batch save these copied messages to Supabase for the newSessionId
                if (messagesToCopy.length > 0) {
                    const messagesToSave = prepareMessageBatchForService(messagesToCopy, newSessionId);
                    ChatService.saveChatMessageBatch(messagesToSave)
                        .then(() => console.log(`[chatStore] Cloned messages for session ${newSessionId} saved to Supabase.`))
                        .catch(err => console.error(`[chatStore] Error saving cloned messages for session ${newSessionId}: `, err));
                }
                return { chats: { ...state.chats, [newSessionId]: newSession } };
            });
            return newSessionId;
        } catch (error) {
            console.error(`[chatStore] Error cloning session ${sessionId}:`, error);
            throw error;
        }
    },

    cleanupProcessedEventKeys: () => {
        // More aggressive cleanup with TTL and size limits
        const MAX_KEYS = 200; // Reduced from 1000
        const TTL = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        const keys = get().processedEventKeys;

        // Remove expired entries
        for (const [key, timestamp] of keys.entries()) {
            if (now - timestamp > TTL) {
                keys.delete(key);
            }
        }

        // If still too many, keep only the most recent
        if (keys.size > MAX_KEYS) {
            const entries = Array.from(keys.entries());
            entries.sort((a, b) => b[1] - a[1]); // Sort by timestamp, newest first

            const toKeep = entries.slice(0, MAX_KEYS);
            keys.clear();
            toKeep.forEach(([key, timestamp]) => keys.set(key, timestamp));
        }

        console.log(`[chatStore] Cleaned up processedEventKeys, size now: ${keys.size}`);
    },

    // TODO: Implement Supabase integration for updating session metadata (name, avatar, etc.)
    updateChatSessionConfig: (
        sessionId: string,
        newConfig: Partial<Pick<ChatSession, 'name' | 'avatar' | 'model' | 'tools' | 'systemPrompt' | 'temperature'>>
    ) => {
        console.warn('[chatStore] updateChatSessionConfig called but Supabase integration is not fully implemented here.');
        set(state => {
            const currentChat = state.chats[sessionId];
            if (!currentChat) {
                console.warn(`[chatStore] updateChatSessionConfig: Session ${sessionId} not found.`);
                return state;
            }
            const updatedChatSession = { ...currentChat, ...newConfig, lastUpdated: Date.now() };

            const currentSessionMeta = state.sessions[sessionId];
            let updatedSessionMeta = currentSessionMeta;
            let metaChanged = false;
            if (newConfig.name && newConfig.name !== currentSessionMeta?.name) {
                updatedSessionMeta = { ...updatedSessionMeta, name: newConfig.name };
                metaChanged = true;
            }
            if (newConfig.avatar && newConfig.avatar !== currentSessionMeta?.avatar) {
                updatedSessionMeta = { ...updatedSessionMeta, avatar: newConfig.avatar };
                metaChanged = true;
            }
            if (metaChanged && updatedSessionMeta) updatedSessionMeta.lastUpdated = Date.now();

            // Call ChatService.updateChatSession here with mapped data for Supabase
            const supabaseUpdateData: DbUpdateChatSession = {};
            if (newConfig.name) supabaseUpdateData.name = newConfig.name;
            if (newConfig.avatar) supabaseUpdateData.avatar_url = newConfig.avatar;
            // For model, tools, systemPrompt, temperature, these would go into the 'metadata' JSONB field
            let metadataUpdates: Record<string, any> | undefined;
            if (newConfig.model || newConfig.tools || newConfig.systemPrompt || newConfig.temperature) {
                metadataUpdates = currentChat.metadata || {}; // Coalesce all falsy metadata values to an empty object
                if (newConfig.model) metadataUpdates.model = newConfig.model;
                if (newConfig.tools) metadataUpdates.tools = newConfig.tools;
                if (newConfig.systemPrompt) metadataUpdates.systemPrompt = newConfig.systemPrompt;
                if (newConfig.temperature) metadataUpdates.temperature = newConfig.temperature;
                supabaseUpdateData.metadata = metadataUpdates;
            }

            if (Object.keys(supabaseUpdateData).length > 0) {
                ChatService.updateChatSession(sessionId, supabaseUpdateData)
                    .then(updatedSupabaseSession => {
                        console.log(`[chatStore] Session ${sessionId} metadata updated in Supabase.`);
                        // Optionally, re-sync store with exact data from Supabase if there are server-side changes
                        // For now, optimistic update is primary.
                    })
                    .catch(err => console.error(`[chatStore] Error updating session ${sessionId} metadata in Supabase: `, err));
            }

            return {
                chats: { ...state.chats, [sessionId]: updatedChatSession },
                sessions: metaChanged && updatedSessionMeta ? { ...state.sessions, [sessionId]: updatedSessionMeta } : state.sessions
            };
        });
        console.log(`[chatStore] Configuration updated locally for session ${sessionId}`, newConfig);
    },

    // Forking-related function implementations
    async forkConversation(parentSessionId: string, messageId: string, name?: string, displayTitle?: string): Promise<ChatSession> {
        try {
            console.log(`[chatStore] Forking conversation from session ${parentSessionId} at message ${messageId}`);
            
            const forkRequest: ForkRequest = {
                messageId,
                name,
                displayTitle
            };
            
            // Call the service to create the fork
            const forkedSession = await ChatService.forkConversation(parentSessionId, forkRequest);
            
            // Add the new session to the store
            const sessionMeta: SessionMeta = {
                id: forkedSession.id,
                name: forkedSession.name,
                avatar: forkedSession.avatar,
                lastUpdated: forkedSession.lastUpdated,
                unreadCount: 0,
                parent_session_id: forkedSession.parentSessionId,
                fork_message_id: forkedSession.forkMessageId,
                display_title: forkedSession.displayTitle
            };

            set(state => ({
                sessions: { ...state.sessions, [forkedSession.id]: sessionMeta },
                chats: { ...state.chats, [forkedSession.id]: forkedSession }
            }));

            console.log(`[chatStore] Successfully forked conversation: ${forkedSession.id}`);
            return forkedSession;
        } catch (error) {
            console.error(`[chatStore] Error forking conversation:`, error);
            throw error;
        }
    },

    async loadForkedMessages(sessionId: string): Promise<void> {
        try {
            console.log(`[chatStore] Loading forked messages for session ${sessionId}`);
            
            // Get the forked conversation messages
            const forkedMessages = await ChatService.getForkedConversationMessages(sessionId);
            
            // Convert ForkedMessage[] to ChatMessage[] for the store
            const chatMessages: ChatMessage[] = forkedMessages.map(msg => ({
                id: msg.id,
                sessionId: msg.sessionId,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                model: msg.model,
                thinking: msg.thinking,
                delivered: msg.delivered,
                read: msg.read,
                // Note: isFromParent information is available but not stored in ChatMessage type
                // This could be added to the UI layer when rendering if needed
            }));

            // Update the session with the loaded messages
            set(state => {
                const currentSession = state.chats[sessionId];
                if (!currentSession) {
                    console.warn(`[chatStore] Session ${sessionId} not found when loading forked messages`);
                    return state;
                }

                const updatedSession = {
                    ...currentSession,
                    messages: chatMessages,
                    lastUpdated: Date.now()
                };

                return {
                    chats: { ...state.chats, [sessionId]: updatedSession }
                };
            });

            console.log(`[chatStore] Loaded ${chatMessages.length} forked messages for session ${sessionId}`);
        } catch (error) {
            console.error(`[chatStore] Error loading forked messages for session ${sessionId}:`, error);
            throw error;
        }
    },

    async getConversationForks(sessionId: string): Promise<ForkInfo[]> {
        try {
            console.log(`[chatStore] Getting forks for conversation ${sessionId}`);
            
            const forks = await ChatService.getConversationForks(sessionId);
            
            console.log(`[chatStore] Found ${forks.length} forks for conversation ${sessionId}`);
            return forks;
        } catch (error) {
            console.error(`[chatStore] Error getting conversation forks for ${sessionId}:`, error);
            throw error;
        }
    },

    async getForkAncestry(sessionId: string): Promise<ConversationAncestry[]> {
        try {
            console.log(`[chatStore] Getting fork ancestry for session ${sessionId}`);
            
            const ancestry = await ChatService.getForkAncestry(sessionId);
            
            console.log(`[chatStore] Found ${ancestry.length} ancestors for session ${sessionId}`);
            return ancestry;
        } catch (error) {
            console.error(`[chatStore] Error getting fork ancestry for ${sessionId}:`, error);
            throw error;
        }
    },

    async loadMessagesForSession(sessionId: string): Promise<void> {
        try {
            console.log(`[chatStore] Loading messages for session ${sessionId}`);
            
            // Set loading state
            set(state => ({
                messagesLoadingState: { ...state.messagesLoadingState, [sessionId]: 'loading' }
            }));
            
            // Check if session exists in store
            const session = get().chats[sessionId];
            if (!session) {
                console.warn(`[chatStore] Session ${sessionId} not found in store`);
                set(state => ({
                    messagesLoadingState: { ...state.messagesLoadingState, [sessionId]: 'error' }
                }));
                return;
            }
            
            // If session already has messages, mark as loaded
            if (session.messages && session.messages.length > 0) {
                console.log(`[chatStore] Session ${sessionId} already has ${session.messages.length} messages`);
                set(state => ({
                    messagesLoadingState: { ...state.messagesLoadingState, [sessionId]: 'loaded' }
                }));
                return;
            }
            
            // Load messages from service
            const messages = await ChatService.getChatMessages(sessionId);
            
            // Update session with loaded messages
            set(state => {
                const updatedSession = { ...state.chats[sessionId], messages };
                return {
                    chats: { ...state.chats, [sessionId]: updatedSession },
                    messagesLoadingState: { ...state.messagesLoadingState, [sessionId]: 'loaded' }
                };
            });
            
            console.log(`[chatStore] Loaded ${messages.length} messages for session ${sessionId}`);
        } catch (error) {
            console.error(`[chatStore] Error loading messages for session ${sessionId}:`, error);
            set(state => ({
                messagesLoadingState: { ...state.messagesLoadingState, [sessionId]: 'error' }
            }));
            throw error;
        }
    },

    restoreBackendSession: async (sessionId: string, agentConfigId: string, isNewSession: boolean = false) => { // Signature updated
    const currentChat = get().chats[sessionId];
    
    // Use isNewSession flag primarily. Fallback to message length for safety with old call patterns or truly empty existing sessions.
    if (isNewSession || !currentChat || currentChat.messages.length === 0) { 
      console.warn(`[chatStore.legacy] restoreBackendSession: Skipped legacy backend restore for session ${sessionId} (isNewSession: ${isNewSession}, message count: ${currentChat?.messages?.length ?? 'N/A'}). Context will be sent with the first stateless message.`);
      return; // Prevent calling the problematic sendChatMessageWithMetadata
    }

    // --- Existing restoreBackendSession logic below this line remains unchanged ---
    console.log(`[chatStore.legacy] restoreBackendSession: Proceeding with legacy restore for session ${sessionId} (has messages).`);
    try {
            
            // Get the agent config to send to backend
            const agentConfig = useAgentConfigStore.getState().agentConfigs[agentConfigId];
            if (!agentConfig) {
                throw new Error(`Agent config ${agentConfigId} not found`);
            }

            // Normalize the agent config for the backend
            const normalizedAgentConfig = {
                ...agentConfig,
                tool_groups: (agentConfig.tool_groups || []).map(tg => ({
                    ...tg,
                    type: (tg as any).type ?? (tg as any).group_type ?? 'CUSTOM'
                }))
            };

            // Send a special metadata message to the backend to restore the session
            // This will create the session context in the backend's AppState
            const restorationMetadata = {
                restore_session: {
                    session_id: sessionId,
                    agent_config: normalizedAgentConfig
                }
            };

            // Send an empty message array with restoration metadata
            // This will trigger the backend to create the session context
            await ChatApi.sendChatMessageWithMetadata(sessionId, [], restorationMetadata);
            
            console.log(`[chatStore] Session ${sessionId} restoration request sent to backend`);
            
        } catch (error) {
            console.error(`[chatStore] Failed to restore backend session ${sessionId}:`, error);
            throw error;
        }
    }
}));
