/**
 * PostHookListenerService.ts
 *
 * This service listens to the global event bus for events that signify the end of an agent's turn.
 * When an "end event" is detected, it:
 * 1. Updates Mission Control session state (moves from processing to idle)
 * 2. Constructs the necessary context and runs all registered post-chat hooks
 * 
 * This ensures that both UI state management and post-completion logic (like analytics) 
 * are timed correctly when sessions complete.
 *
 * End events include:
 * - completion_signal: Direct completion signal
 * - agent_status with session_idle: Agent reports session is idle/complete
 *
 * This follows the same pattern as the CheckpointService.
 */
import { eventBus } from '@/services/acs/eventBus';
import { runPostChatHooks, type ChatHookContext } from './chatLifecycleHooks';
import { getDefaultACSClient } from '@/services/acs';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { SSEEvent } from '@/services/acs/shared/types';

class PostHookListenerService {
    // Cache of sessionId -> cwd
    private sessionCwdCache = new Map<string, string>();
    constructor() {
        eventBus.on('sse', this.handleSse);
        console.log('👂 [PostHookListener] Initialized and listening for end-of-chat events.');
    }

    private handleSse = async (event: SSEEvent): Promise<void> => {
        if (this.isEndEvent(event) && event.sessionId) {
            const lastMessage = ''; // not used right now

            const eventDescription = event.type === 'agent_status' ? `${event.type}:${event.data?.status}` : event.type;
            console.log(`[PostHookListener] End event '${eventDescription}' detected for session ${event.sessionId}. Running post-chat hooks.`);

            // 🎯 MISSION CONTROL INTEGRATION: Move session out of processing
            this.handleMissionControlEndEvent(event.sessionId, eventDescription);

            // Fetch the real working directory for the session
            const sessionCwd = await this.getSessionCwd(event.sessionId);

            const ctx: ChatHookContext = {
                sessionId: event.sessionId,
                message: lastMessage,
                userId: '',
                agentConfigId: '',
                cwd: sessionCwd!
            };

            runPostChatHooks(ctx);
        }
    };

    private handleMissionControlEndEvent(sessionId: string, eventDescription: string): void {
        try {
            // Get the current store state
            const store = useMissionControlStore.getState();
            
            console.log(`[UI] PostHookListener: End event '${eventDescription}' → Moving session out of processing:`, sessionId);
            
            // Update session to idle state
            store.updateSession(sessionId, {
                status: 'idle',
                latest_message_role: 'session_end',
                latest_message_timestamp: new Date().toISOString(),
                last_message_at: new Date().toISOString()
            });
            
            // Remove from processing order
            store.removeFromProcessingOrder(sessionId);
            
            // Mark as unread unless it's the currently selected session
            if (store.selectedSession !== sessionId) {
                store.markSessionUnread(sessionId);
                console.log(`[UI] PostHookListener: Session marked as UNREAD:`, sessionId);
            } else {
                store.markSessionRead(sessionId);
                console.log(`[UI] PostHookListener: Session kept as read (selected):`, sessionId);
            }
            
            console.log(`[UI] PostHookListener: Session moved from PROCESSING → IDLE bucket:`, sessionId);
            
        } catch (error) {
            console.error(`[PostHookListener] Failed to update Mission Control state for session ${sessionId}:`, error);
        }
    }

    private async getSessionCwd(sessionId: string): Promise<string | null> {
        // Check cache first
        if (this.sessionCwdCache.has(sessionId)) {
            const cachedCwd = this.sessionCwdCache.get(sessionId)!;
            console.log(`💾 [SCM] Using cached CWD for ${sessionId}: ${cachedCwd}`);
            return cachedCwd;
        }

        try {
            console.log(`🔍 [SCM] Fetching session CWD for session ${sessionId}`);
            const acsClient = getDefaultACSClient();
            const response = await acsClient.sessions.getSession(sessionId, {
                includeMessages: false // We only need session metadata, not messages
            });

            const agentCwd = response.data.agent_cwd;
            if (agentCwd && agentCwd.trim() !== '') {
                console.log(`✅ [SCM] Found session CWD for ${sessionId}: ${agentCwd}`);
                console.log(`📁 [SCM] Caching workspace path: ${sessionId} → ${agentCwd}`);
                this.sessionCwdCache.set(sessionId, agentCwd);
                return agentCwd;
            } else {
                console.warn(`⚠️ [SCM] No agent_cwd set for session ${sessionId} - session may not have workspace selected`);
                return null;
            }
        } catch (error) {
            console.error(`❌ [SCM] Failed to fetch session CWD for ${sessionId}:`, error);
            return null;
        }
    }

    private isEndEvent(event: SSEEvent): boolean {
        // Listen to completion_signal and session_idle events
        if (event.type === 'completion_signal') {
            console.log(`[PostHookListener] Completion signal detected for session ${event.sessionId}`);
            return true;
        }

        // Handle agent_status events with session_idle status
        if (event.type === 'agent_status' && event.data?.status === 'session_idle') {
            console.log(`[PostHookListener] Session idle detected for session ${event.sessionId}`);
            return true;
        }

        return false;
    }

    public dispose(): void {
        eventBus.off('sse', this.handleSse);
        console.log('[PostHookListener] Disposed and stopped listening.');
        this.sessionCwdCache.clear();
    }
}

// Export a singleton instance to be initialized in main.tsx
export const postHookListenerService = new PostHookListenerService();
