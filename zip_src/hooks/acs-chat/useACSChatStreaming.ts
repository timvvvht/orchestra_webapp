import { useState, useCallback, useEffect, useRef } from 'react';
import type { OrchestACSClient, SSEEvent } from '@/services/acs';
import { eventBus } from '@/services/acs/eventBus';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/auth/SupabaseClient';
import { USE_FIREHOSE_ONLY } from '@/utils/envFlags';
import { tap } from '@/debug/eventTap';

export interface UseACSChatStreamingOptions {
  autoConnect?: boolean;
  debug?: boolean;
  currentSessionId?: string; // For fire-hose-only mode filtering
}

export interface UseACSChatStreamingReturn {
  // State
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Actions
  connectStreaming: (sessionId: string) => Promise<void>;
  disconnectStreaming: () => Promise<void>;
  ensureFirehose: () => Promise<void>;

  // Event handling
  onSSEEvent: (handler: (event: SSEEvent) => void) => () => void;
}

/**
 * Hook for managing ACS chat streaming and SSE connections
 * 
 * NOTE: As of the ChatEventOrchestrator migration, chat UIs no longer need
 * to call connectStreaming() directly. The global ChatEventOrchestrator
 * handles all chat SSE events via the user-wide firehose connection.
 * 
 * This hook is retained for:
 * - Non-chat features that may need session-specific SSE
 * - Ensuring firehose connections are established
 * - Legacy compatibility during transition
 */
export const useACSChatStreaming = (
  acsClient: OrchestACSClient,
  options: UseACSChatStreamingOptions = {}
): UseACSChatStreamingReturn => {
  const { autoConnect = true, debug = false, currentSessionId } = options;
  const auth = useAuth();

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Refs for cleanup and session tracking
  const eventHandlersRef = useRef<Set<(event: SSEEvent) => void>>(new Set());
  const currentSessionIdRef = useRef<string | undefined>(currentSessionId);

  // Helper to ensure firehose connection
  const ensureFirehose = useCallback(async () => {
    if (!auth.user) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) return;
      
      acsClient.streaming.connectPrivate(auth.user.id, jwt); // idempotent
      console.log('🔥 [useACSChatStreaming] Firehose connection ensured');
    } catch (error) {
      console.error('❌ [useACSChatStreaming] Failed to ensure firehose:', error);
    }
  }, [auth.user, acsClient.streaming]);

  // Connect streaming for a specific session
  const connectStreaming = useCallback(async (sessionId: string) => {
    // Guard against temp session IDs
    if (sessionId.startsWith('temp-')) {
      console.log('🚫 [useACSChatStreaming] Skipping connectStreaming for temp session:', sessionId);
      return;
    }

    // In fire-hose-only mode, skip session pipe connection
    if (USE_FIREHOSE_ONLY) {
      console.log('[useACSChatStreaming] 🔗 FIREHOSE-ONLY mode – skip session pipe for:', sessionId);
      return;
    }

    try {
      setConnectionStatus('connecting');
      console.log('[useACSChatStreaming] Connecting streaming for session:', sessionId);
      
      await acsClient.streaming.connect(sessionId);
      
      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('✅ [useACSChatStreaming] Streaming connected successfully');
    } catch (err) {
      console.error('❌ [useACSChatStreaming] Failed to connect streaming:', err);
      setIsConnected(false);
      setConnectionStatus('error');
      throw err;
    }
  }, [acsClient]);

  // Disconnect streaming
  const disconnectStreaming = useCallback(async () => {
    try {
      await acsClient.streaming.disconnect();
      setIsConnected(false);
      setConnectionStatus('disconnected');
      console.log('🔌 [useACSChatStreaming] Streaming disconnected');
    } catch (err) {
      console.warn('⚠️ [useACSChatStreaming] Failed to disconnect streaming:', err);
    }
  }, [acsClient]);

  // Register SSE event handler
  const onSSEEvent = useCallback((handler: (event: SSEEvent) => void) => {
    eventHandlersRef.current.add(handler);
    
    // Return cleanup function
    return () => {
      eventHandlersRef.current.delete(handler);
    };
  }, []);

  // Update session ID ref when currentSessionId changes
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Setup streaming event handlers
  useEffect(() => {
    if (!acsClient.streaming) {
      console.log('🐛 [useACSChatStreaming] No acsClient.streaming available');
      return;
    }

    console.log('🎧 [useACSChatStreaming] Setting up streaming event handlers...');

    // In fire-hose-only mode, ensure global pipe immediately
    if (USE_FIREHOSE_ONLY) {
      ensureFirehose().catch(console.error);
    }

    // Connection status handler
    const unsubscribeConnection = acsClient.streaming.onConnectionChange(connected => {
      setIsConnected(connected);
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      
      if (debug) {
        console.log(connected ? '🟢 [useACSChatStreaming] CONNECTED!' : '🔴 [useACSChatStreaming] DISCONNECTED!');
      }
    });

    // SSE event handler
    function sseHandler(event: SSEEvent) {
      // 🔍 TAP: Capture raw SSE events for debugging
      tap('raw-sse', event, {
        source: 'useACSChatStreaming',
        activeSessionId: currentSessionIdRef.current,
        timestamp: new Date().toISOString()
      });
      
      // Hard session isolation ───────────────
      const activeSessionId = currentSessionIdRef.current;
      if (event.sessionId && activeSessionId && event.sessionId !== activeSessionId) {
        if (debug) console.log('[useACSChatStreaming] 🔒 filtered event for other session',
          { eventSession: event.sessionId, activeSession: activeSessionId, type: event.type });
        return;            // stop propagation
      }
      
      // STEP 1: Debug logging to confirm duplication source
      console.debug('[RAW]', event.event_id, event.type, event.sessionId, event.source);
      
      // FIRE-HOSE-ONLY MODE: Filter events by active session
      if (USE_FIREHOSE_ONLY) {
        const activeSessionId = currentSessionIdRef.current;
        // Only filter *after* we actually know which session is active
        if (activeSessionId && event.sessionId && event.sessionId !== activeSessionId) {
          if (debug) {
            console.log('🚫 [useACSChatStreaming] Skipping event for different session:', {
              eventSessionId: event.sessionId,
              activeSessionId: activeSessionId,
              type: event.type
            });
          }
          return; // Not for this tab/session
        }
        
        if (debug) {
          console.log('✅ [useACSChatStreaming] Fire-hose event passed filter:', {
            eventSessionId: event.sessionId,
            activeSessionId: activeSessionId,
            type: event.type,
            reason: activeSessionId ? 'session match' : 'no session filter yet'
          });
        }
      } else {
        // LEGACY MODE: Filter fire-hose events to prevent duplication
        // UI normally needs only the session pipe for chat rendering
        // Fire-hose is intended for background services (LocalToolOrchestrator)
        const isFirehoseEvent = event.source === 'firehose';
        const isDuplicateType = ['tool_call', 'tool_result', 'chunk', 'done', 'text'].includes(event.type);
        
        // Skip fire-hose events that the UI can already get from session pipe
        if (isFirehoseEvent && isDuplicateType) {
          if (debug) {
            console.log('🚫 [useACSChatStreaming] Skipping duplicate fire-hose event:', {
              type: event.type,
              source: event.source,
              reason: 'Available via session pipe'
            });
          }
          return; // Don't distribute this event
        }
      }
      
      if (debug) {
        console.log('📡 [useACSChatStreaming] SSE EVENT RECEIVED:', {
          type: event.type,
          sessionId: event.sessionId,
          messageId: event.messageId,
          source: event.source,
          timestamp: new Date().toISOString()
        });
      }

      // Distribute event to all registered handlers
      eventHandlersRef.current.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('❌ [useACSChatStreaming] Error in SSE event handler:', error);
        }
      });
    }

    // Subscribe to the eventBus
    eventBus.on('sse', sseHandler);

    console.log('✅ [useACSChatStreaming] Streaming event handlers set up successfully!');

    return () => {
      console.log('🧹 [useACSChatStreaming] Cleaning up streaming event handlers...');
      if (unsubscribeConnection) {
        unsubscribeConnection();
      }
      eventBus.off('sse', sseHandler);
    };
  }, [acsClient.streaming, debug]);

  // Global logger effect for all SSE events
  useEffect(() => {
    if (!debug) return;

    const handler = (ev: SSEEvent) => {
      console.log('[ALL-SSE]', ev.type, ev.sessionId || 'firehose', ev);
    };

    eventBus.on('sse', handler);
    return () => eventBus.off('sse', handler);
  }, [debug]);

  return {
    // State
    isConnected,
    connectionStatus,

    // Actions
    connectStreaming,
    disconnectStreaming,
    ensureFirehose,

    // Event handling
    onSSEEvent
  };
};