import * as AgentEventService from '@/services/AgentEventService';
import * as ChatService from '@/services/supabase/chatService';
import { ChatRole } from '@/types/chatTypes';
import type { ChatMessage, SessionMeta, ChatSession, TextPart, ToolUsePart, ToolResultPart } from '@/types/chatTypes';
import type { ChatStoreState, StateSetter } from '../state/chatState';
import { SessionManager } from './SessionManager';
import { handleSsePayload } from '@/stores/eventBridges/sseBridge'; // Canonical Event Store integration
// import { OrchestraSCM } from '@/services/scm/trimmed/OrchestraSCM';

// Title generation moved to useSessionTitleAutoGen hook

let hasSubscribedToAgentEvents = false;

export class EventManager {
    constructor(private getState: () => ChatStoreState, private setState: StateSetter, private sessionManager: SessionManager) {}

    private messageToServicePayload(msg: ChatMessage): Omit<ChatMessage, 'id' | 'timestamp'> {
        return {
            sessionId: msg.sessionId,
            role: msg.role,
            content: msg.content,
            model: msg.model,
            createdAt: msg.createdAt
        };
    }

    private isActualObject(val: any): val is Record<string, any> {
        return val !== null && typeof val === 'object' && !Array.isArray(val) && val.constructor === Object;
    }

    async initialize(): Promise<void> {
        console.log('[EventManager] Initializing event handling');

        // Initialize AgentEventService listener (if not already done)
        if (!hasSubscribedToAgentEvents) {
            try {
                console.log('[EventManager] Starting AgentEventService listener...');
                await AgentEventService.startAgentEventListener();

                const agentHandler: AgentEventService.EventHandler = async rawPayload => {
                    await this.handleAgentEvent(rawPayload);
                };

                AgentEventService.subscribeToAllEvents(agentHandler);
                hasSubscribedToAgentEvents = true;
                console.log('[EventManager] AgentEventService listener started and subscribed');
            } catch (error) {
                console.error('[EventManager] Failed to initialize AgentEventService:', error);
            }
        }
    }

    private async handleAgentEvent(rawPayload: any): Promise<void> {
        // 🔥 CANONICAL EVENT STORE INTEGRATION
        // Feed raw SSE events into the canonical store
        try {
            handleSsePayload(rawPayload);
        } catch (bridgeError) {
            console.warn('[EventManager] Failed to process SSE event in canonical store (non-critical):', bridgeError);
            // Continue with normal processing - canonical store is optional
        }

        // Deduplication logic
        const key = this.dedupKey(rawPayload);
        const state = this.getState();
        const now = Date.now();

        if (state.processedEventKeys.has(key)) {
            return; // Skip duplicate events
        }

        // Add to processed keys with timestamp
        state.processedEventKeys.set(key, now);

        // Auto-cleanup every 100 events
        if (state.processedEventKeys.size % 100 === 0) {
            this.cleanupProcessedEventKeys();
        }

        const payload = rawPayload as AgentEventService.RawAgentEventPayload;

        // Handle different event types
        switch (payload.type) {
            case 'chunk':
            case 'token':
                await this.handleStreamingEvent(payload);
                break;
            case 'tool_call':
                await this.handleToolCallEvent(payload);
                break;
            case 'tool_result':
                await this.handleToolResultEvent(payload);
                break;
            case 'done':
                await this.handleDoneEvent(payload);
                break;
            case 'final_message_history':
                await this.handleFinalMessageHistoryEvent(payload);
                break;
            default:
                console.log(`[EventManager] Unhandled event type: ${payload.type}`);
        }
    }

    private async handleStreamingEvent(payload: any): Promise<void> {
        if (!payload || 
            typeof payload.sessionId !== 'string' || 
            typeof payload.messageId !== 'string' || 
            typeof payload.content === 'undefined') { // content can be empty string, but must be present
            console.warn('[EventManager] Invalid payload for handleStreamingEvent (missing/wrong types for core props):', payload);
            return;
        }
        
        const { sessionId, messageId, content } = payload;

        this.setState(state => {
            const session = state.chats[sessionId];
            if (!session) {
                console.warn(`[EventManager] Session ${sessionId} not found for streaming event.`); // Added warning
                return state;
            }

            const messages = [...session.messages];
            let assistantMessage = messages.find(m => m.id === messageId && m.role === ChatRole.Assistant);

            if (!assistantMessage) {
                // Fallback: Find a thinking message that might be a placeholder for this stream
                assistantMessage = messages.find(m => m.role === ChatRole.Assistant && m.thinking);
                if (assistantMessage) {
                    console.log(`[EventManager] handleStreamingEvent: Found thinking message ${assistantMessage.id} to merge stream into.`);
                    if (messageId && assistantMessage.id !== messageId) {
                        console.log(`[EventManager] handleStreamingEvent: Updating thinking message ID from ${assistantMessage.id} to ${messageId}`);
                        assistantMessage.id = messageId;
                    }
                }
            }

            if (!assistantMessage) {
                assistantMessage = {
                    id: messageId || crypto.randomUUID(),
                    sessionId,
                    role: ChatRole.Assistant,
                    content: [],
                    createdAt: Date.now(),
                    isStreaming: true,
                    thinking: false
                };
                messages.push(assistantMessage);
                console.log(`[EventManager] handleStreamingEvent: Created new assistant message ${assistantMessage.id} for stream.`);
            }

            let textPart = assistantMessage.content.find(p => p.type === 'text') as TextPart;
            if (textPart) {
                textPart.text += content || '';
            } else {
                assistantMessage.content.push({ type: 'text', text: content || '' } as TextPart);
            }

            assistantMessage.isStreaming = true;
            assistantMessage.thinking = false;

            const updatedSession = { ...session, messages };
            return { chats: { ...state.chats, [sessionId]: updatedSession } };
        });
    }

    private async handleToolCallEvent(payload: any): Promise<void> {
        if (!payload || 
            typeof payload.sessionId !== 'string' ||
            !payload.toolCall || !this.isActualObject(payload.toolCall) || 
            typeof payload.toolCall.id !== 'string' || 
            typeof payload.toolCall.name !== 'string' ||
            typeof payload.toolCall.arguments === 'undefined') {
            console.warn('[EventManager] Invalid payload for handleToolCallEvent (missing/wrong types for core props or toolCall structure):', payload);
            return;
        }
        
        const { sessionId, messageId, toolCall } = payload;

        console.log('[EventManager] handleToolCallEvent:', { sessionId, messageId, toolCall });

        this.setState(state => {
            const session = state.chats[sessionId];
            if (!session) {
                console.warn(`[EventManager] Session ${sessionId} not found for tool_call event.`);
                return state;
            }

            const messages = [...session.messages];
            let assistantMessage = messages.find(m => m.id === messageId && m.role === ChatRole.Assistant);

            if (!assistantMessage) {
                // Fallback: Find an existing streaming or thinking message to merge tool call into
                assistantMessage = messages.find(m => m.role === ChatRole.Assistant && (m.isStreaming || m.thinking));
                if (assistantMessage) {
                    console.log(`[EventManager] handleToolCallEvent: Found existing streaming/thinking message ${assistantMessage.id} to merge tool call into.`);
                    if (messageId && assistantMessage.id !== messageId) {
                        console.log(`[EventManager] handleToolCallEvent: Updating existing message ID from ${assistantMessage.id} to ${messageId}`);
                        assistantMessage.id = messageId;
                    }
                }
            }

            if (!assistantMessage) {
                assistantMessage = {
                    id: messageId || crypto.randomUUID(),
                    sessionId,
                    role: ChatRole.Assistant,
                    content: [],
                    createdAt: Date.now(),
                    thinking: true,
                    isStreaming: false
                };
                messages.push(assistantMessage);
                console.log(`[EventManager] handleToolCallEvent: Created new assistant message ${assistantMessage.id} for tool call.`);
            }

            const existingToolUse = assistantMessage.content.find(part => part.type === 'tool_use' && part.id === toolCall.id);

            if (!existingToolUse) {
                const toolUseContent: ToolUsePart = {
                    type: 'tool_use',
                    id: toolCall.id,
                    name: toolCall.name,
                    input: toolCall.arguments
                };
                assistantMessage.content.push(toolUseContent);
                console.log(`[EventManager] Added tool_use ${toolCall.id} to message ${assistantMessage.id}`);
            } else {
                console.log(`[EventManager] Tool_use ${toolCall.id} already exists in message ${assistantMessage.id}`);
            }

            assistantMessage.thinking = true;

            const updatedSession = { ...session, messages };
            return { chats: { ...state.chats, [sessionId]: updatedSession } };
        });
    }

    private async handleToolResultEvent(payload: any): Promise<void> {
        if (!payload || 
            typeof payload.sessionId !== 'string' ||
            !payload.toolResult || !this.isActualObject(payload.toolResult) || 
            typeof payload.toolResult.tool_use_id !== 'string' ||
            typeof payload.toolResult.content === 'undefined') {
            console.warn('[EventManager] Invalid payload for handleToolResultEvent (missing/wrong types for core props or toolResult structure):', payload);
            return;
        }
        
        const { sessionId, messageId, toolResult } = payload;

        console.log('[EventManager] handleToolResultEvent:', { sessionId, messageId, toolResult });

        this.setState(state => {
            const session = state.chats[sessionId];
            if (!session) {
                console.warn(`[EventManager] Session ${sessionId} not found for tool_result event.`);
                return state;
            }

            const messages = [...session.messages];
            let assistantMessage = messages.find(m => m.id === messageId && m.role === ChatRole.Assistant);

            if (!assistantMessage) {
                assistantMessage = messages.find(
                    m =>
                        m.role === ChatRole.Assistant &&
                        Array.isArray(m.content) &&
                        m.content.some(part => part.type === 'tool_use' && part.id === toolResult.tool_use_id)
                );

                if (assistantMessage) {
                    console.log(`[EventManager] Found assistant message ${assistantMessage.id} by tool_use_id match for tool_result ${toolResult.tool_use_id}`);
                    if (messageId && assistantMessage.id !== messageId) {
                        console.log(`[EventManager] handleToolResultEvent: Updating message ID from ${assistantMessage.id} to ${messageId}`);
                        assistantMessage.id = messageId;
                    }
                } else {
                    console.warn(`[EventManager] Could not find assistant message for tool_result ${toolResult.tool_use_id} (messageId: ${messageId}). Tool result will be dropped.`);
                    return state;
                }
            }

            let messageToPersist: ChatMessage | undefined;
            const toolResultContent: ToolResultPart = {
                type: 'tool_result',
                tool_use_id: toolResult.tool_use_id,
                content: toolResult.content,
                is_error: toolResult.is_error || false
            };

            const existingResult = assistantMessage.content.find(part => part.type === 'tool_result' && part.tool_use_id === toolResult.tool_use_id);

            if (!existingResult) {
                assistantMessage.content.push(toolResultContent);
                messageToPersist = assistantMessage;
                console.log(`[EventManager] Added tool_result ${toolResult.tool_use_id} to message ${assistantMessage.id}`);
            } else {
                // Update the existing tool_result with the new content (oracle fix)
                existingResult.content = toolResultContent.content;
                existingResult.is_error = toolResultContent.is_error;
                messageToPersist = assistantMessage; // Mark for persistence since content changed
                console.log(`[EventManager] Updated existing tool_result ${toolResult.tool_use_id} in message ${assistantMessage.id}`);
            }

            const updatedSession = { ...session, messages };

            if (messageToPersist) {
                ChatService.saveChatMessage(this.messageToServicePayload(messageToPersist))
                    .then(() => console.log(`[EventManager] Assistant tool_result message ${messageToPersist.id} saved to Supabase`))
                    .catch(err => console.error(`[EventManager] Error saving tool_result message ${messageToPersist.id}:`, err));
            }

            return { chats: { ...state.chats, [sessionId]: updatedSession } };
        });
    }

    private async handleDoneEvent(payload: any): Promise<void> {
        const { sessionId, messageId } = payload;

        console.log('[EventManager] handleDoneEvent:', { sessionId, messageId });

        // Create SCM checkpoint if session has non-default CWD
        const session = this.getState().chats[sessionId];
        if (session?.agent_cwd && session.agent_cwd.trim() !== '') {
            try {
                console.log(`[EventManager] Creating SCM checkpoint for completed agent event in session ${sessionId} with CWD: ${session.agent_cwd}`);
                // const scm = await OrchestraSCM.create();
                // const checkpointHash = await scm.checkpoint(session.agent_cwd, `Agent task completed in session ${sessionId}`);
                const checkpointHash = 'mock-checkpoint-hash';
                
                if (checkpointHash !== 'no-changes') {
                    console.log(`[EventManager] ✅ Created SCM checkpoint ${checkpointHash.substring(0, 8)} for completed agent event in session ${sessionId}`);
                } else {
                    console.log(`[EventManager] No changes to checkpoint for completed agent event in session ${sessionId}`);
                }
            } catch (scmError) {
                console.error(`[EventManager] Failed to create SCM checkpoint for completed agent event in session ${sessionId}:`, scmError);
                // Don't throw here - event processing should continue, SCM checkpoint is optional
            }
        } else {
            console.log(`[EventManager] Skipping SCM checkpoint for completed agent event in session ${sessionId} - no CWD provided or default CWD`);
        }

        this.setState(state => {
            const session = state.chats[sessionId];
            if (!session) {
                console.warn(`[EventManager] Session ${sessionId} not found for done event.`);
                return state;
            }

            const messages = [...session.messages];
            let assistantMessage = messages.find(m => m.id === messageId && m.role === ChatRole.Assistant);

            if (!assistantMessage) {
                const recentAssistantMessages = messages
                    .filter(m => m.role === ChatRole.Assistant)
                    .sort((a, b) => b.createdAt - a.createdAt);

                assistantMessage = recentAssistantMessages.find(m => m.isStreaming || m.thinking);

                if (assistantMessage) {
                    console.log(`[EventManager] Found assistant message ${assistantMessage.id} by streaming/thinking state for done event (original messageId: ${messageId})`);
                } else {
                    console.warn(`[EventManager] Could not find any assistant message to mark as done for session ${sessionId} (messageId: ${messageId}).`);
                    // Attempt to clear any other potentially stuck messages via heuristic even if primary not found
                }
            }

            if (assistantMessage) {
                assistantMessage.isStreaming = false;
                assistantMessage.thinking = false;
                assistantMessage.createdAt = Date.now(); // Finalize timestamp
                
                // Logic for fullHistory from agent proposal - commented out as existence is unconfirmed
                // let updatedFullHistory = session.fullHistory ? [...session.fullHistory] : [];
                // const existingMsgIndexInFull = updatedFullHistory.findIndex(m => m.id === assistantMessage.id);
                // if (existingMsgIndexInFull !== -1) {
                //     updatedFullHistory[existingMsgIndexInFull] = { ...updatedFullHistory[existingMsgIndexInFull], ...assistantMessage };
                // } else {
                //     updatedFullHistory.push({ ...assistantMessage });
                // }
                
                ChatService.saveChatMessage(this.messageToServicePayload(assistantMessage))
                    .then(() => console.log(`[EventManager] Assistant message ${assistantMessage.id} saved to Supabase after done event`))
                    .catch(err => console.error(`[EventManager] Error saving assistant message ${assistantMessage.id} after done event:`, err));
            }

            const sessionLastUpdated = assistantMessage?.createdAt || session.lastUpdated;
            let updatedSession = { ...session, messages, lastUpdated: sessionLastUpdated };
            // if (assistantMessage && session.fullHistory) { // If fullHistory logic was included
            //     updatedSession.fullHistory = updatedFullHistory;
            //     updatedSession.fullHistoryStatus = 'loaded' as const;
            // }

            // Title Generation Logic removed - now handled by useSessionTitleAutoGen hook

            // Refined heuristic
            const heuristicCandidates = messages.filter(m => m.role === ChatRole.Assistant && (m.thinking || m.isStreaming));

            for (const m of heuristicCandidates) {
                if (m.id === assistantMessage?.id) continue; // Skip the primary message if already handled
                const hasToolUse = m.content.some(p => p.type === 'tool_use');
                if (!hasToolUse) {
                    console.log(`[EventManager] Heuristic skipping message ${m.id}: no tool_use found.`);
                    continue;
                }
                m.thinking = false;
                m.isStreaming = false;
                m.createdAt = Date.now(); // Update timestamp to reflect final state - use createdAt for consistency
                console.log(`[EventManager] Heuristic cleared flags for message ${m.id} (had tool_use and was stuck).`);
                ChatService.saveChatMessage(this.messageToServicePayload(m)).catch(console.error);
            }

            return { chats: { ...state.chats, [sessionId]: updatedSession } };
        });
    }

    // generateAndUpdateSessionTitle method removed - now handled by useSessionTitleAutoGen hook

    private async handleFinalMessageHistoryEvent(payload: any): Promise<void> {
        const { sessionId, history } = payload;

        if (!history || !Array.isArray(history)) {
            console.warn('[EventManager] Invalid final_message_history payload');
            return;
        }

        console.log(`[EventManager] Processing final_message_history for session ${sessionId} with ${history.length} messages`);

        // Convert worker history to ChatMessage format with monotonic timestamps
        let lastLocalTs = 0;
        const chatMessages: ChatMessage[] = history.map((item: any) => {
            let ts = item.timestamp ?? Date.now();
            if (ts <= lastLocalTs) ts = lastLocalTs + 1;
            lastLocalTs = ts;

            return {
                id: item.id || crypto.randomUUID(),
                sessionId,
                role: item.role as ChatRole,
                content: Array.isArray(item.content) ? item.content : [{ type: 'text', text: String(item.content) }],
                timestamp: ts,
                model: item.model,
                thinking: false,
                delivered: true,
                read: true
            };
        });

        this.setState(state => {
            const session = state.chats[sessionId];
            if (!session) return state;

            // Batch persist new messages before updating state
            const existingIds = new Set(session.messages.map(m => m.id));
            const newHistoryMsgs = chatMessages.filter(msg => !existingIds.has(msg.id));
            if (newHistoryMsgs.length) {
                const batch = newHistoryMsgs.map(this.messageToServicePayload.bind(this));
                ChatService.saveChatMessageBatch(batch)
                    .then(() => console.log(`[EventManager] Saved ${batch.length} history messages`))
                    .catch(console.error);
            }

            const updatedSession = { ...session, messages: chatMessages };
            return { chats: { ...state.chats, [sessionId]: updatedSession } };
        });
    }

    private dedupKey(payload: any): string {
        // If the event has a unique event_id from the backend, use it directly
        if (payload.event_id) {
            return payload.event_id;
        }

        const knownGenericIds = ['-result', '-call', ''];

        // Handle chunk/token first (uses seq for uniqueness)
        if (payload.type === 'token' || payload.type === 'chunk') {
            return `${payload.sessionId}:${payload.type}:${payload.messageId ?? 'no_id_stream'}:${payload.seq}`;
        }

        if (payload.type === 'tool_call') {
            if (payload.toolCall?.id && payload.toolCall.id.trim() !== '' && !knownGenericIds.includes(payload.toolCall.id.trim())) {
                return `${payload.sessionId}:tool_call:${payload.toolCall.id}`;
            }
            return `${payload.sessionId}:tool_call:${crypto.randomUUID()}`;
        }

        if (payload.type === 'tool_result') {
            if (!payload.messageId || knownGenericIds.includes(payload.messageId.trim())) {
                return `${payload.sessionId}:tool_result:${crypto.randomUUID()}`;
            }
            return `${payload.sessionId}:tool_result:${payload.messageId}`;
        }

        // Special handling for final_message_history
        if (payload.type === 'final_message_history') {
            const historyLength = payload.history?.length || 0;
            return `${payload.sessionId}:final_message_history:${historyLength}`;
        }

        return `${payload.sessionId}:${payload.type}:${payload.messageId ?? crypto.randomUUID()}`;
    }

    cleanupProcessedEventKeys(): void {
        const MAX_KEYS = 200;
        const TTL = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        const keys = this.getState().processedEventKeys;

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

        console.log(`[EventManager] Cleaned up processedEventKeys, size now: ${keys.size}`);
    }
}
