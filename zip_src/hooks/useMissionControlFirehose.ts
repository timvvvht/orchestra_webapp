import { useEffect, useRef } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { getFirehose } from '@/services/GlobalServiceManager';
import { getToolDisplayName } from '@/utils/timelineHelpers';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { parsePlanResult } from '@/utils/plan';
import { formatToolCallPreview } from '@/utils/toolCallHelpers';

// ─────────────────────────────────────────────────────────────
// Tool prefixes that completely mutate/replace plan markdown
const PLAN_MUTATING_TOOL_PREFIXES = ['plan_add_tasks', 'plan_create_markdown', 'plan_replace_markdown', 'plan_append_markdown', 'plan_expand_task'] as const;

// Tool prefix that represents progress-only updates
const PLAN_PROGRESS_TOOL_PREFIX = 'plan_mark_todo';
// ─────────────────────────────────────────────────────────────

export const useMissionControlFirehose = () => {
    const { user } = useAuth();
    const { updateSession, refetchPlans, refetchSinglePlan, patchPlanFromToolResult, markSessionUnread, markSessionRead, selectedSession, ensureInProcessingOrder, removeFromProcessingOrder } = useMissionControlStore();

    useEffect(() => {
        if (!user) {
            console.log('🔥 [useMissionControlFirehose] No user, skipping firehose subscription');
            return;
        }

        console.log('[UI-SSE] Setting up firehose for user:', user.id);

        // Get the firehose service directly from GlobalServiceManager
        const firehose = getFirehose();

        if (!firehose) {
            console.warn('[UI-SSE] No firehose service available from GlobalServiceManager');
            return;
        }

        console.log('[UI-SSE] Firehose service found:', firehose);

        // Subscribe to raw firehose events
        const unsubscribe = firehose.subscribe((rawEvent: any) => {
            console.log('[UI-SSE][raw]', rawEvent);

            // Extract directly from rawEvent (no payload wrapper)
            const { session_id: sessionId, event_type: eventType, data } = rawEvent;
            if (!sessionId || !eventType) {
                console.log('[UI-SSE] Missing required fields, skipping');
                return;
            }

            // Filter events for the current user (events should already be filtered by user connection)
            if (data?.user_id && data.user_id !== user.id) {
                console.log('[UI-SSE] Event filtered out - wrong user_id:', data.user_id, 'expected:', user.id);
                return;
            }

            console.log('[UI-SSE][dispatch]', 'event_type=', eventType, 'session=', sessionId, 'dataKeys=', data ? Object.keys(data) : 'no data');

            // 🔄 Auto-move to processing bucket (runs for every event except loop-end)
            const isLoopEnd = eventType === 'done';
            if (!isLoopEnd) {
                // Mark session as unread when there's new activity, unless it's the selected session
                if (selectedSession !== sessionId) {
                    markSessionUnread(sessionId);
                    console.log('[UI] Session moved to UNREAD:', sessionId, `(event: ${eventType})`);
                } else {
                    // Ensure it remains read since it's currently open
                    markSessionRead(sessionId);
                    console.log('[UI] Session kept as READ (selected):', sessionId, `(event: ${eventType})`);
                }

                // Ensure stable append-only ordering within processing bucket
                ensureInProcessingOrder(sessionId);
                console.log('[UI] Session moved to PROCESSING bucket:', sessionId, `(event: ${eventType})`);

                // Provide immediate status pill feedback when session starts processing
                // This gives users instant visual feedback that their message was received
                // Note: Only update status and timing - content updates are handled by specific event handlers
                const statusUpdate = {
                    status: 'working',
                    last_message_at: new Date().toISOString()
                };
                console.log('[UI-SSE][updateSession]', sessionId, statusUpdate);
                updateSession(sessionId, statusUpdate);
            }

            // Handle different event types for UI updates
            switch (eventType) {
                case 'tool_call': {
                    // Show tool call in progress with rich display name and arguments
                    const content = formatToolCallPreview(data, getToolDisplayName, 150);
                    const updateObj = {
                        latest_message_content: content,
                        latest_message_role: 'tool_call',
                        latest_message_timestamp: new Date().toISOString(),
                        last_message_at: new Date().toISOString(),
                        status: 'working' // Ensure working status for tool calls
                    };
                    console.log('[UI-SSE][updateSession]', sessionId, updateObj);
                    updateSession(sessionId, updateObj);
                    break;
                }

                case 'chunk': {
                    // Show streaming text preview during chunk events
                    const delta = data?.delta || '';
                    const updateObj = {
                        latest_message_content: delta.slice(0, 150), // Show first 150 chars of chunk
                        latest_message_role: 'assistant',
                        latest_message_timestamp: new Date().toISOString(),
                        last_message_at: new Date().toISOString(),
                        status: 'working'
                    };
                    console.log('[UI-SSE][updateSession]', sessionId, updateObj);
                    updateSession(sessionId, updateObj);
                    break;
                }

                case 'tool_result': {
                    const result = data.result;
                    const res = data?.result || {};
                    const toolName: string = res.name || res.tool_name || data?.tool_name || res.tool || '';
                    const toolId: string = String(res.tool_use_id || '');
                    
                    if (!toolName && !toolId) break;

                    // 1️⃣ Progress-only tool → optimistic patch + debounced single refetch
                    if (toolName.startsWith('plan_mark_todo') || toolId.startsWith('plan_mark_todo')) {
                        const text = result?.content?.[0]?.text ?? '';
                        const parsed = parsePlanResult(text);
                        if (Object.keys(parsed).length) {
                            patchPlanFromToolResult(sessionId, parsed);
                        }
                        scheduleDebouncedRefetchSingle(sessionId);
                        break;
                    }

                    // 2️⃣ Plan mutation tools → immediate targeted refetch
                    if (toolName.startsWith('plan_') || toolId.startsWith('plan_')) {
                        console.log('[firehose] Plan tool → targeted refetch', { toolName, toolId, sessionId });
                        refetchSinglePlan(sessionId);
                        break;
                    }
                    break;
                }

                case 'session_title_updated': {
                    // Update session title from SSE event
                    if (data?.title) {
                        const titleUpdateObj = {
                            mission_title: data.title,
                            last_message_at: new Date().toISOString()
                        };
                        console.log('[UI-SSE][updateSession]', sessionId, titleUpdateObj);
                        updateSession(sessionId, titleUpdateObj);
                    }
                    break;
                }

                case 'checkpoint_created': {
                    // Trigger ambient checkpoint saved indicator
                    console.log('[UI-SSE] Checkpoint created for session:', sessionId);
                    useMissionControlStore.getState().setLastCheckpointSaved(new Date().toISOString());
                    break;
                }

                case 'done':
                    // Mark session as unread when completed (user hasn't seen it yet), unless it's the selected session
                    if (selectedSession !== sessionId) {
                        markSessionUnread(sessionId);
                        console.log('[UI] Session completed → moved to UNREAD:', sessionId);
                    } else {
                        // Ensure it remains read since it's currently open
                        markSessionRead(sessionId);
                        console.log('[UI] Session completed → kept as READ (selected):', sessionId);
                    }

                    // Session completed - update status and show unread completion message
                    const doneUpdateObj = {
                        status: 'idle', // Move to idle group when session is completed
                        // latest_message_content: 'Session completed',
                        latest_message_role: 'session_end',
                        latest_message_timestamp: new Date().toISOString(),
                        last_message_at: new Date().toISOString()
                    };
                    console.log('[UI-SSE][updateSession]', sessionId, doneUpdateObj);
                    updateSession(sessionId, doneUpdateObj);

                    // Remove from processing stable order
                    removeFromProcessingOrder(sessionId);
                    console.log('[UI] Session moved from PROCESSING → IDLE bucket:', sessionId);

                    // Ensure eventual consistency by refetching plans on session end
                    console.log('[UI-SSE] Session ended, ensuring eventual consistency with full refetch');
                    refetchPlans();
                    break;

                default:
                    console.log('[UI-SSE] Ignoring event_type:', eventType, 'for session:', sessionId);
                    // Ignore all other event types (agent_status, etc.)
                    break;
            }
        });

        console.log('[UI-SSE] Firehose subscription established, returning unsubscribe function');
        return unsubscribe;
    }, [user, updateSession, refetchPlans, refetchSinglePlan, patchPlanFromToolResult, markSessionUnread, markSessionRead, selectedSession]);

    // ────────────────────────────────────────────────
    // Ref-based debounce for targeted single plan refetch
    const refetchTimersRef = useRef(new Map<string, number>());
    const scheduleDebouncedRefetchSingle = (sid: string) => {
        const m = refetchTimersRef.current;
        if (m.has(sid)) {
            console.log('[firehose] Debounced refetch already scheduled for session:', sid);
            return;
        }
        console.log('[firehose] Scheduling debounced single plan refetch for session:', sid);
        const h = window.setTimeout(() => {
            m.delete(sid);
            console.log('[firehose] Executing debounced single plan refetch for session:', sid);
            refetchSinglePlan(sid);
        }, 3000);
        m.set(sid, h);
    };

    // ────────────────────────────────────────────────
    // Debounce map ⇒ one refetch per session / 3 s
    const refetchTimers = new Map<string, NodeJS.Timeout>();
    const scheduleDebouncedRefetch = (sessionId: string) => {
        if (refetchTimers.has(sessionId)) return; // already queued
        const handle = setTimeout(() => {
            refetchTimers.delete(sessionId);
            refetchPlans();
        }, 3000);
        refetchTimers.set(sessionId, handle);
    };
    // ────────────────────────────────────────────────
};
