import * as ChatService from '@/services/supabase/chatService';
import type { SessionMeta, ChatSession } from '@/types/chatTypes';
import type { ChatStoreState, StateSetter } from '../state/chatState';
import { SessionManager } from '../managers/SessionManager';
import { EventManager } from '../managers/EventManager';
import { buildSessionMetadata } from '@/utils/buildSessionMetadata';

export class InitializationService {
    constructor(
        private getState: () => ChatStoreState,
        private setState: StateSetter,
        private sessionManager: SessionManager,
        private eventManager: EventManager
    ) {}

    async initialize(): Promise<void> {
        if (this.getState().isInitialized) {
            console.log('[InitializationService] Already initialized, skipping...');
            return;
        }

        // Use simplified initialization by default, with legacy as fallback
        try {
            await this.initializeSimplified();
        } catch (error) {
            console.error('[InitializationService] Simplified initialization failed, falling back to legacy:', error);
            await this.initializeLegacy();
        }
    }

// New simplified initialization method
private async initializeSimplified(): Promise<void> {
  console.log('[InitializationService] Starting simplified initialization...');
  const startTime = performance.now();

  try {
    // Phase 1: Initialize event manager
    await this.eventManager.initialize();

    // Phase 2: Load essential data only (session metadata)
    console.log('[InitializationService] 🚀 PHASE 1: Loading session metadata...');
    const sessionMetas = await ChatService.getAllChatSessionMetas();
    
    // Create minimal session and chat objects
    const newStoreSessions: Record<string, SessionMeta> = {};
    const newStoreChats: Record<string, ChatSession> = {};

    sessionMetas.forEach(meta => {
      newStoreSessions[meta.id] = meta;
      
      // Build complete metadata with defaults for any missing fields
      const completeMetadata = buildSessionMetadata({
        avatar: meta.avatar,
        // Add any other metadata from the session meta if available
      });
      
      console.log(`[InitializationService] Built complete metadata for session ${meta.id}:`, {
        model: completeMetadata.model,
        specialty: completeMetadata.specialty,
        tools: completeMetadata.tools?.length,
        hasSystemPrompt: !!completeMetadata.systemPrompt,
        temperature: completeMetadata.temperature
      });
      
      newStoreChats[meta.id] = {
        id: meta.id,
        name: meta.name || 'Untitled Chat',
        avatar: completeMetadata.avatar, // From buildSessionMetadata
        specialty: completeMetadata.specialty, // From buildSessionMetadata
        messages: [], 
        model: completeMetadata.model, // From buildSessionMetadata
        tools: completeMetadata.tools, // From buildSessionMetadata
        createdAt: meta.createdAt, // From SessionMeta
        lastUpdated: meta.lastUpdated, // From SessionMeta
        user_id: '', // Placeholder, or from more reliable source if available
        metadata: completeMetadata, // The object from buildSessionMetadata
        displayTitle: meta.display_title, // From SessionMeta
        systemPrompt: completeMetadata.systemPrompt, // From buildSessionMetadata
        temperature: completeMetadata.temperature, // From buildSessionMetadata
        agent_config_id: meta.agent_config_id, // From SessionMeta
        parentSessionId: meta.parent_session_id, // From SessionMeta
        forkMessageId: meta.fork_message_id,   // From SessionMeta
        initialAgentSnapshot: null // Explicitly null as per new requirement
      };
    });

    // Update state with essential data
    this.setState({
      sessions: newStoreSessions,
      chats: newStoreChats,
      isInitialized: true
    });

    const endTime = performance.now();
    console.log(`[InitializationService] ✅ Simplified initialization complete in ${endTime - startTime}ms`);
    
    // Phase 3: Background loading is now on-demand only
    console.log('[InitializationService] 🚀 Background loading will happen on-demand');

  } catch (error) {
    console.error('[InitializationService] Simplified initialization failed:', error);
    // Fallback to legacy initialization
    console.log('[InitializationService] Falling back to legacy initialization...');
    await this.initializeLegacy();
  }
}

// Rename existing implementation
private async initializeLegacy(): Promise<void> {
  // Move current initialize() implementation here
  console.log('[InitializationService] Using legacy initialization...');
  
  const startTime = performance.now();

  try {
      // Initialize event handling first
      await this.eventManager.initialize();

      // 🚀 PHASE 1: INSTANT SIDEBAR DISPLAY (TTFP Optimization)
      console.log('[InitializationService] Phase 1: Loading session metadata for instant sidebar...');
      
      const storeSessionMetas = await ChatService.getAllChatSessionMetas();
      console.log(`[InitializationService] Loaded ${storeSessionMetas.length} session metas from Supabase`);

      // Create minimal sessions for immediate sidebar display
      const newStoreSessions: Record<string, SessionMeta> = {};
      const newStoreChats: Record<string, ChatSession> = {};

      storeSessionMetas.forEach(meta => {
          newStoreSessions[meta.id] = meta;
          
          // Create a complete ChatSession object, similar to initializeSimplified
          // Requires building completeMetadata for each meta here too
          const completeMetadata = buildSessionMetadata({
            avatar: meta.avatar,
            // If agent_config_id is available on meta (it should be after previous fixes),
            // buildSessionMetadata could potentially use it to infer other metadata defaults
            // For this plan, buildSessionMetadata is expected to provide sensible defaults if specific agent details aren't passed.
          });

          newStoreChats[meta.id] = {
              id: meta.id,
              name: meta.name || 'Untitled Chat', 
              avatar: completeMetadata.avatar, 
              specialty: completeMetadata.specialty, 
              messages: [], 
              model: completeMetadata.model, 
              tools: completeMetadata.tools, 
              createdAt: meta.createdAt, // CORRECTED: Use createdAt from SessionMeta
              lastUpdated: meta.lastUpdated, // From SessionMeta
              user_id: '', // Placeholder, consistent with initializeSimplified
              metadata: completeMetadata, 
              displayTitle: meta.display_title, // From SessionMeta
              systemPrompt: completeMetadata.systemPrompt, 
              temperature: completeMetadata.temperature, 
              agent_config_id: meta.agent_config_id, // From SessionMeta
              parentSessionId: meta.parent_session_id, // From SessionMeta
              forkMessageId: meta.fork_message_id,   // From SessionMeta
              initialAgentSnapshot: null // Explicitly null
          };
      });

      // Update store with session metadata (instant sidebar)
      this.setState({
          sessions: newStoreSessions,
          chats: newStoreChats,
          isInitialized: true
      });

      const phase1Time = performance.now();
      console.log(`[InitializationService] Phase 1 complete in ${Math.round(phase1Time - startTime)}ms. Sidebar visible with ${Object.keys(newStoreSessions).length} sessions.`);

      // 🚀 PHASE 2: CRITICAL BACKEND RESTORATION (High Priority)
      console.log('[InitializationService] Phase 2: Critical backend restoration...');
      
      this.performBackgroundRestoration(storeSessionMetas, phase1Time, startTime);

  } catch (error) {
      console.error('[InitializationService] Failed to initialize:', error);
      this.setState({ isInitialized: true }); // Still mark as initialized to prevent re-attempts
  }
}

    private async performBackgroundRestoration(
        storeSessionMetas: SessionMeta[],
        phase1Time: number,
        startTime: number
    ): Promise<void> {
        try {
            // Get agent_config_ids for all sessions (lightweight query)
            const sessionIds = storeSessionMetas.map(meta => meta.id);
            const sessions = await ChatService.getChatSessionsBatch(sessionIds, { messageLimit: 0 });
            
            // Restore sessions with agent_config_id in backend
            const restorationPromises = sessions.map(async (session) => {
                if (session && session.agent_config_id) {
                    try {
                        await this.sessionManager.restoreBackendSession(session.id, session.agent_config_id);
                        console.log(`[InitializationService] Session ${session.id} restored in backend`);
                        return { sessionId: session.id, success: true };
                    } catch (error) {
                        console.error(`[InitializationService] Failed to restore session ${session.id}:`, error);
                        return { sessionId: session.id, success: false, error };
                    }
                } else {
                    console.warn(`[InitializationService] Session ${session?.id} missing agent_config_id, cannot restore`);
                    return { sessionId: session?.id || 'unknown', success: false, error: 'No agent_config_id' };
                }
            });
            
            const results = await Promise.allSettled(restorationPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;
            
            console.log(`[InitializationService] Backend restoration complete. ${successful} successful, ${failed} failed.`);
            
            // 🚀 PHASE 3: BACKGROUND MESSAGE LOADING (Lower Priority)
            console.log('[InitializationService] Phase 3: Background message loading...');
            
            const backgroundLoadPromises = storeSessionMetas.map(async (storeMeta) => {
                try {
                    const fullSession = await ChatService.getChatSession(storeMeta.id, { messageLimit: 20 });
                    
                    if (fullSession) {
                        // Update store with full data
                        this.setState(state => ({
                            chats: {
                                ...state.chats,
                                [storeMeta.id]: {
                                    ...state.chats[storeMeta.id],
                                    ...fullSession,
                                    messages: fullSession.messages
                                }
                            }
                        }));
                        
                        console.log(`[InitializationService] Background loaded session ${storeMeta.id} with ${fullSession.messages.length} messages`);
                    }
                } catch (error) {
                    console.warn(`[InitializationService] Background loading failed for session ${storeMeta.id}:`, error);
                }
            });

            // Don't await - let it load in background
            Promise.allSettled(backgroundLoadPromises).then(() => {
                const phase3Time = performance.now();
                console.log(`[InitializationService] Phase 3 complete in ${Math.round(phase3Time - phase1Time)}ms`);
                console.log(`[InitializationService] Total initialization time: ${Math.round(phase3Time - startTime)}ms (TTFP: ${Math.round(phase1Time - startTime)}ms)`);
            });

        } catch (error) {
            console.error('[InitializationService] Background restoration failed:', error);
        }
    }
}