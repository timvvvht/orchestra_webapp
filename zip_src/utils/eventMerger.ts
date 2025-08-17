// Unified Event Merger Utility
// --------------------------------------------------
// This helper merges raw SSE or Supabase-like events into the
// ChatMessage[] array used by the main Chat UI.  It guarantees
// that tool_call / tool_result events never get dropped even if
// they arrive BEFORE the first assistant chunk (common case).
//
// The logic is intentionally minimal and side-effect-free so it
// can be shared by hooks, listeners, and back-fill loaders.
// --------------------------------------------------

import type { ChatMessage } from '@/types/chatTypes';
// eslint-disable-next-line no-duplicate-imports
import { ChatRole } from '@/types/chatTypes';
import type { SSEEvent } from '@/services/acs';

// De-duplication tracking for SSE events
const seenIds = new Set<string>();

export function clearEventMergerSeenIds(): void {
    seenIds.clear();
}

export function mergeSSEEventIntoMessages(ev: SSEEvent, prev: ChatMessage[]): ChatMessage[] {
    console.log('🚨 [MSG-FLOW] 📥 INCOMING EVENT:', {
        type: ev.type,
        messageId: ev.messageId,
        sessionId: ev.sessionId,
        event_id: ev.event_id,
        hasDelta: !!ev.delta,
        delta: ev.delta,
        hasToolCall: !!ev.toolCall,
        toolCall: ev.toolCall,
        hasResult: !!ev.result,
        result: ev.result,
        prevMessagesCount: prev.length,
        timestamp: new Date().toISOString()
    });

    // We only care about events with a messageId.  If missing – noop.
    if (!ev.messageId) {
        console.log('🚨 [MSG-FLOW] ❌ FILTERED OUT: No messageId, skipping event');
        return prev;
    }

    // Improved de-duplication -------------------------------------------
    // • tool_call  -> use toolCall.id  (unique per call)
    // • tool_result-> use result.call_id (matches tool_call id)
    // • others     -> fall back to event_id:type (old behaviour)
    //   (chunk events intentionally *not* deduped here)
    let key: string | null = null;

    if (ev.type === 'tool_call' && ev.toolCall?.id) {
        key = `tool_call:${ev.toolCall.id}`;
    } else if (ev.type === 'tool_result' && ev.result?.call_id) {
        key = `tool_result:${ev.result.call_id}`;
    } else if (ev.event_id) {
        key = `${ev.event_id}:${ev.type}`;
    }

    // Allow multiple completion signals (they're harmless)
    if (ev.type === 'completion_signal') {
        // don't early-return on duplicate event_id for completion signals
    } else if (key && ev.type !== 'chunk' && seenIds.has(key)) {
        console.log('🚨 [MSG-FLOW] ❌ FILTERED OUT: Duplicate event, skipping:', key);

        // ⬇︎ DIAGNOSTIC FRAME: duplicate suppression
        import('@/utils/hydroDebug').then(({ pushHydro }) => {
            pushHydro('STORE', {
                phase: 'DUP_SUPPRESS',
                eventType: ev.type,
                key,
                messageId: ev.messageId,
                sessionId: ev.sessionId,
                eventId: ev.event_id,

                // COMPLETE EVENT DATA
                fullEvent: ev,

                // TOOL CALL DETAILS
                toolCallComplete: ev.toolCall
                    ? {
                          id: ev.toolCall.id,
                          name: ev.toolCall.name,
                          input: ev.toolCall.input,
                          isThinkTool: ev.toolCall.name === 'think',
                          thinkThought: ev.toolCall.name === 'think' ? ev.toolCall.input?.thought : null
                      }
                    : null,

                // RESULT DETAILS
                resultComplete: ev.result
                    ? {
                          call_id: ev.result.call_id,
                          content: ev.result.content,
                          fullResult: ev.result
                      }
                    : null,

                reason: 'duplicate_key_found',
                seenIdsSize: seenIds.size,
                allSeenIds: Array.from(seenIds)
            });
        });

        return prev;
    }

    // Track this event ID to prevent duplicates
    if (key) {
        seenIds.add(key);
        console.log('🚨 [MSG-FLOW] ✅ TRACKING: Added event key to seen set:', key);

        // ⬇︎ DIAGNOSTIC FRAME: event accepted
        import('@/utils/hydroDebug').then(({ pushHydro }) => {
            pushHydro('STORE', {
                phase: 'DUP_ACCEPT',
                eventType: ev.type,
                key,
                messageId: ev.messageId,
                sessionId: ev.sessionId,
                eventId: ev.event_id,

                // COMPLETE EVENT DATA
                fullEvent: ev,

                // TOOL CALL DETAILS
                toolCallComplete: ev.toolCall
                    ? {
                          id: ev.toolCall.id,
                          name: ev.toolCall.name,
                          input: ev.toolCall.input,
                          isThinkTool: ev.toolCall.name === 'think',
                          thinkThought: ev.toolCall.name === 'think' ? ev.toolCall.input?.thought : null
                      }
                    : null,

                // RESULT DETAILS
                resultComplete: ev.result
                    ? {
                          call_id: ev.result.call_id,
                          content: ev.result.content,
                          fullResult: ev.result
                      }
                    : null,

                seenIdsSize: seenIds.size,
                allSeenIds: Array.from(seenIds)
            });
        });
    }

    console.log('🚨 [MSG-FLOW] 📋 BEFORE PROCESSING: Messages array state:', {
        messagesCount: prev.length,
        messageIds: prev.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length }))
    });

    // Clone the messages array for immutability.
    const messages = [...prev];
    const idx = messages.findIndex(m => m.id === ev.messageId);

    console.log('🚨 [MSG-FLOW] 🔍 MESSAGE LOOKUP:', {
        targetMessageId: ev.messageId,
        foundAtIndex: idx,
        existingMessage:
            idx !== -1
                ? {
                      id: messages[idx].id,
                      role: messages[idx].role,
                      contentLength: messages[idx].content.length,
                      isStreaming: messages[idx].isStreaming
                  }
                : null
    });

    // Helper to lazily create placeholder assistant message if needed.
    const ensureMessage = (): ChatMessage => {
        if (idx !== -1) {
            console.log('🚨 [MSG-FLOW] ♻️ REUSING: Existing message found at index', idx);
            return messages[idx];
        }

        console.log('🚨 [MSG-FLOW] 🆕 CREATING: New placeholder message for messageId:', ev.messageId);
        const placeholder: ChatMessage = {
            id: ev.messageId!,
            sessionId: ev.sessionId || '',
            role: ChatRole.Assistant,
            content: [],
            createdAt: Date.now(),
            isStreaming: true,
            thinking: false,
            delivered: false,
            read: false
        };
        messages.push(placeholder);
        console.log('🚨 [MSG-FLOW] ✅ CREATED: New message added to array, new length:', messages.length);
        return placeholder;
    };

    console.log('🚨 [MSG-FLOW] 🔄 PROCESSING: Event type:', ev.type);

    switch (ev.type) {
        case 'chunk':
        case 'token': {
            console.log('🚨 [MSG-FLOW] 📝 CHUNK/TOKEN: Processing text delta');
            if (!ev.delta) {
                console.log('🚨 [MSG-FLOW] ❌ FILTERED OUT: No delta in chunk/token event');
                return prev;
            }
            const msg = ensureMessage();
            // Look for last text part – append or create new.
            const lastPart = msg.content[msg.content.length - 1];
            console.log('🚨 [MSG-FLOW] 📝 CHUNK/TOKEN: Last content part:', lastPart);

            if (lastPart && lastPart.type === 'text') {
                console.log('🚨 [MSG-FLOW] ➕ APPENDING: Adding delta to existing text part');
                lastPart.text += ev.delta;
                console.log('🚨 [MSG-FLOW] ➕ APPENDED: New text length:', lastPart.text.length);
            } else {
                console.log('🚨 [MSG-FLOW] 🆕 NEW TEXT PART: Creating new text content part');
                msg.content.push({ type: 'text', text: ev.delta });
                console.log('🚨 [MSG-FLOW] 🆕 CREATED: New content parts count:', msg.content.length);
            }
            msg.isStreaming = true;
            console.log('🚨 [MSG-FLOW] ✅ CHUNK/TOKEN: Message updated, streaming=true');
            break;
        }

        case 'tool_call': {
            console.log('🚨 [MSG-FLOW] 🔧 TOOL_CALL: Processing tool call');
            if (!ev.toolCall) {
                console.log('🚨 [MSG-FLOW] ❌ FILTERED OUT: No toolCall in tool_call event');
                return prev;
            }
            const msg = ensureMessage();
            const toolUse = {
                type: 'tool_use',
                id: ev.toolCall.id,
                name: ev.toolCall.name,
                input: ev.toolCall.arguments
            };
            msg.content.push(toolUse as any);
            console.log('🚨 [MSG-FLOW] ✅ TOOL_CALL: Added tool_use to message:', {
                toolId: ev.toolCall.id,
                toolName: ev.toolCall.name,
                newContentLength: msg.content.length
            });
            break;
        }

        case 'tool_result': {
            console.log('🚨 [MSG-FLOW] 📊 TOOL_RESULT: Processing tool result');
            if (!ev.result) {
                console.log('🚨 [MSG-FLOW] ❌ FILTERED OUT: No result in tool_result event');
                return prev;
            }
            const msg = ensureMessage();
            const toolResult = {
                type: 'tool_result',
                tool_use_id: ev.result.call_id || ev.result.tool_use_id || '',
                content: ev.result, // Keep as object instead of stringifying
                is_error: ev.result.success === false || ev.result.error !== undefined
            };
            msg.content.push(toolResult as any);
            console.log('🚨 [MSG-FLOW] ✅ TOOL_RESULT: Added tool_result to message:', {
                toolUseId: toolResult.tool_use_id,
                isError: toolResult.is_error,
                newContentLength: msg.content.length
            });
            break;
        }

        case 'done': {
            console.log('🚨 [MSG-FLOW] 🏁 DONE: Processing completion event');
            if (idx === -1) {
                console.log('🚨 [MSG-FLOW] ❌ FILTERED OUT: No existing message for done event');
                return prev;
            }
            messages[idx] = {
                ...messages[idx],
                isStreaming: false,
                delivered: true,
                read: true
            };
            console.log('🚨 [MSG-FLOW] ✅ DONE: Message marked as complete:', {
                messageId: messages[idx].id,
                isStreaming: false,
                delivered: true
            });
            break;
        }

        case 'completion_signal': {
            console.log('🚨 [MSG-FLOW] 🏁 COMPLETION_SIGNAL received');

            // 1️⃣  If we know which message finished, mark it.
            if (idx !== -1) {
                messages[idx] = {
                    ...messages[idx],
                    isStreaming: false,
                    delivered: true,
                    read: true
                };
            }

            // 2️⃣  Safety-net: mark *any* assistant messages still streaming false
            messages.forEach(m => {
                if (m.role === ChatRole.Assistant && m.isStreaming) {
                    m.isStreaming = false;
                }
            });

            // 3️⃣  Mark session as idle in global store
            import('@/stores/sessionStatusStore').then(({ useSessionStatusStore }) => {
                useSessionStatusStore.getState().markIdle(ev.sessionId || '');
            });

            // 4️⃣  Optionally push a lightweight ChatMessage for timeline clarity
            //     (uncomment if you want a visible "✓ ready" row)
            /*
            messages.push({
                id        : `ready-${Date.now()}`,
                sessionId : ev.sessionId || '',
                role      : ChatRole.Assistant,
                content   : [{type:'text', text:'(agent idle)'}],
                createdAt : Date.now(),
                isStreaming:false
            });
            */

            break;
        }

        default:
            console.log('🚨 [MSG-FLOW] ❌ FILTERED OUT: Unknown event type, ignoring:', ev.type);
            return prev;
    }

    // console.log('🚨 [MSG-FLOW] 📤 FINAL RESULT:', {
    //     messagesCount: messages.length,
    //     changed: messages !== prev,
    //     newMessageIds: messages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length, isStreaming: m.isStreaming })),
    //     timestamp: new Date().toISOString()
    // });

    // console.log('🚨 [MSG-FLOW] 🎯 ARRAY REFERENCE CHANGED:', messages !== prev ? 'YES - NEW ARRAY' : 'NO - SAME ARRAY');

    // // Console probe for verification
    // messages.forEach(msg => {
    //     console.log('[POST-FIX] tool_use parts in message:', msg.content.filter(p => p.type === 'tool_use').length);
    // });

    return messages;
}
