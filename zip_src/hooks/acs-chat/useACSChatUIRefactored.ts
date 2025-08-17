import { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useLocalTool } from '@/hooks/useLocalTool';
import type { UnifiedTimelineEvent } from '@/types/unifiedTimeline';
import { toUnifiedEvents, mergeTimelineEvents } from '@/utils/toUnifiedEvent';
import { USE_FIREHOSE_ONLY } from '@/utils/envFlags';
import { shift, hasQueued } from '@/lib/simpleQueues';

// Import our new modular hooks
import { useACSClient } from './useACSClient';
import { useACSChatSessions } from './useACSChatSessions';
import { useACSChatMessages } from './useACSChatMessages';
import { useACSChatStreaming } from './useACSChatStreaming';
import { useSessionTitleAutoGen } from './useSessionTitleAutoGen';
import { useACSAgentConfigs } from '../useACSAgentConfigs';

// Import types (reuse existing interfaces)
import type { UseACSChatUIOptions, UseACSChatUIReturn } from '../useACSChatUI';

/**
 * REFACTORED: Orchestrator hook that composes smaller, focused hooks
 * 
 * This replaces the monolithic 2000-line useACSChatUI hook with a clean
 * composition of domain-specific hooks, each with a single responsibility.
 * 
 * Benefits:
 * - Each hook is testable in isolation
 * - Easier to understand and maintain
 * - Better separation of concerns
 * - Reduced complexity and dependencies
 * - More reusable components
 */
export const useACSChatUIRefactored = (options: UseACSChatUIOptions = {}): UseACSChatUIReturn => {

  console.log('🎬 [G0] useACSChatUIRefactored MOUNTED with options:', options);
  
  const {
    autoInitialize = true,
    autoConnectStreaming = true,
    defaultAgentConfigName = 'general',
    defaultAgentConfigId = 'general',
    userId,
    acsClient: customClient,
    debug = false,
    streamingServiceFactory
  } = options;

  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  
  // FALLBACK: Direct URL parsing using React Router's location
  const directUrlSessionId = useMemo(() => {
    const match = location.pathname.match(/\/chat\/([^\/]+)/);
    return match ? match[1] : undefined;
  }, [location.pathname]);
  
  // Use direct parsing if useParams fails
  const actualSessionId = urlSessionId || directUrlSessionId;
  
  console.log('🔗 [URL-PARAMS] URL parsing results:', { 
    urlSessionId, 
    directUrlSessionId, 
    actualSessionId,
    locationPathname: location.pathname,
    locationKey: location.key // This changes on every navigation
  });

  // Track navigation changes
  useEffect(() => {
    console.log('🧭 [NAVIGATION] Location changed:', {
      pathname: location.pathname,
      key: location.key,
      extractedSessionId: directUrlSessionId
    });
  }, [location.pathname, location.key, directUrlSessionId]);
  
  const auth = useAuth();

  // Determine effective user ID (Supabase user ID takes precedence)
  const effectiveUserId = auth.user?.id || userId;
  
  console.log('🔐 [G2] Auth state:', {
    isAuthenticated: auth.isAuthenticated,
    hasUser: !!auth.user,
    userId: auth.user?.id,
    effectiveUserId
  });
  


  // 1. ACS Client Management
  const {
    acsClient,
    isInitialized: clientInitialized,
    initialize: initializeClient,
    getHealthStatus
  } = useACSClient({
    customClient: customClient || undefined,
    streamingServiceFactory: streamingServiceFactory || undefined
  });

  // 2. Session Management
  const {
    sessions,
    currentSessionId,
    currentSession,
    isLoading: sessionsLoading,
    error: sessionsError,
    loadSessions,
    createSession,
    switchToSession,
    deleteSession,
    renameSession,
    loadSessionDetails,
    setCurrentSessionId,
    clearError: clearSessionsError
  } = useACSChatSessions(acsClient, {
    autoLoad: false, // We'll control this manually
    userId: effectiveUserId
  });

  // 3. Message Management
  const {
    messages,
    isLoading: messagesLoading,
    hasStreamingMessage,
    sseEvents,
    error: messagesError,
    sendMessage,
    startConversation,
    clearMessages,
    clearError: clearMessagesError,
    processSSEEvent,
    cancelCurrentConversation
  } = useACSChatMessages(acsClient, currentSessionId, effectiveUserId, {
    debug
  });

  // 4. Streaming Management
  const {
    isConnected,
    connectionStatus,
    connectStreaming,
    disconnectStreaming,
    ensureFirehose,
    onSSEEvent
  } = useACSChatStreaming(acsClient, {
    autoConnect: false, // We'll control this manually
    currentSessionId: currentSessionId || undefined, // Pass current session for fire-hose-only filtering
    debug: debug || false
  });

  // 5. Local Tool Integration with Session Context
  const { handleLocalToolJob } = useLocalTool(
    currentSessionId, 
    {}, // default config
    currentSession?.agent_cwd // 👈 PASS SESSION'S WORKING DIRECTORY
  );

  // 6. Timeline Events State (NEW)
  const [timelineEvents, setTimelineEvents] = useState<UnifiedTimelineEvent[]>([]);

  // Load historical messages into timeline when messages change
  useEffect(() => {
    if (messages.length > 0) {

      
      try {
        const historicalEvents = toUnifiedEvents(messages);
        setTimelineEvents(prev => {
          // Filter out SSE events to avoid duplicates, keep only historical
          const sseEvents = prev.filter(event => event.source === 'sse');
          const merged = mergeTimelineEvents([...historicalEvents, ...sseEvents]);
          

          
          return merged;
        });
      } catch (error) {
        console.error('❌ [useACSChatUIRefactored] Failed to load historical messages into timeline:', error);
      }
    }
  }, [messages]);

  // 7. Session Title Auto-Generation
  const setSessionDisplayTitle = useCallback((title: string) => {
    if (currentSessionId) {

      // Update the ACS session name to reflect the generated title
      renameSession(currentSessionId, title).catch(err => {
        console.error('[useACSChatUIRefactored] Failed to update session name:', err);
      });
    }
  }, [currentSessionId, renameSession]);

  // Determine if session needs title generation
  // Check if session name is generic (like "New Chat", "Untitled", etc.)
  const needsTitleGeneration = currentSession && (
    !currentSession.name || 
    currentSession.name.toLowerCase().includes('new chat') ||
    currentSession.name.toLowerCase().includes('untitled') ||
    currentSession.name.toLowerCase().includes('session') ||
    currentSession.name.trim() === ''
  );

  useSessionTitleAutoGen({
    sessionId: currentSessionId || undefined,
    displayTitle: needsTitleGeneration ? null : (currentSession?.name || undefined), // Only generate if session has generic name
    messages,
    setSessionTitle: setSessionDisplayTitle
  });

  // Computed values
  const isInitialized = clientInitialized && auth.isAuthenticated;
  const isAuthenticated = auth.isAuthenticated;
  
  console.log('🚦 [G2] Gate status:', {
    clientInitialized,
    authIsAuthenticated: auth.isAuthenticated,
    isInitialized: isInitialized,
    autoInitialize
  });
  const isLoading = sessionsLoading || messagesLoading;
  const error = sessionsError || messagesError;
  const user = auth.user;

  // STABILIZED: Memoize agent config ID calculation to prevent flip-flopping between renders
  const currentAgentConfigId = useMemo(() => {
    // Only calculate if we have session data (avoid calculating during loading states)
    if (!currentSession) {
      return defaultAgentConfigId; // Use default while session is loading
    }
    
    // If session has explicit agent_config_id, use it
    if (currentSession.agent_config_id) {
      return currentSession.agent_config_id;
    }
    
    // If session has model_id but no agent_config_id, don't use default (session wants specific model)
    if (currentSession.model_id) {
      return null;
    }
    
    // Otherwise, use default
    return defaultAgentConfigId;
  }, [currentSession?.id, currentSession?.agent_config_id, currentSession?.model_id, defaultAgentConfigId]);
  
  // CLEAN DEBUG: Just show the final result
  if (currentSession) {
    console.log(`🎯 [FINAL-RESULT] currentAgentConfigId: ${currentAgentConfigId} (session has model: ${!!currentSession.model_id})`);
  }
  
  // Get agent configs to resolve the current agent config
  const { agentConfigs: agentConfigsMap, agentConfigsArray, isLoading: agentConfigsLoading, error: agentConfigsError } = useACSAgentConfigs();
  
  // Removed verbose debug logs
  
  // Resolve current agent config from the available configs (only if we have an ID)
  const currentAgentConfig = currentAgentConfigId && agentConfigsMap[currentAgentConfigId] 
    ? agentConfigsMap[currentAgentConfigId] 
    : undefined;

  // Derive current model ID from agent config or session (ensure never undefined)
  const currentModelId: string = currentAgentConfig?.ai_config?.model_id 
    || currentSession?.model_id 
    || 'gpt-4'; // fallback

  // Removed verbose debug logs

  // Removed verbose debug logs

  // Removed verbose debug logs



  // Setup SSE event processing with timeline integration
  useEffect(() => {
    const unsubscribe = onSSEEvent((event) => {
      // Handle different event types
      if (event.type === 'error') {
        console.error('❌ [useACSChatUIRefactored] SSE Error:', event.error);
      } else if (event.type === 'agent_status') {
        console.log('🤖 [useACSChatUIRefactored] 📊 Processing AGENT_STATUS event:', {
          data: event.data,
          sessionId: event.sessionId,
          status: event.data?.status
        });

        // Handle local tool job events
        if (event.data?.status === 'local_tool_job') {
          handleLocalToolJob(event);
        }

        // NEW – if agent just went idle, flush one queued draft
        if (event.data?.status === 'idle' && event.sessionId && hasQueued(event.sessionId)) {
          const draft = shift(event.sessionId);
          if (draft) {
            console.log('📤 [Queue] Sending queued message for session:', event.sessionId, 'Message:', draft);
            sendMessage(draft, { sessionId: event.sessionId }).catch(console.error);
          }
        }
      } else {
        // Process message-related events (existing flow)
        processSSEEvent(event);
        
        // NEW: Convert SSE event to unified timeline event
        try {
          const unifiedEvents = toUnifiedEvents(event);
          if (unifiedEvents.length > 0) {

            
            setTimelineEvents(prev => {
              const merged = mergeTimelineEvents([...prev, ...unifiedEvents]);

              return merged;
            });
          }
        } catch (error) {
          console.error('❌ [useACSChatUIRefactored] Failed to convert SSE event to timeline:', error);
        }
      }
    });

    return unsubscribe;
  }, [onSSEEvent, processSSEEvent, handleLocalToolJob]);

  // Initialize the system
  const initialize = useCallback(async () => {

    console.log('🚀 [G3a] initialize() START');
    
    try {
      // 1. Initialize ACS client
      console.log('🚀 [G3] Step 1: initializeClient()');
      await initializeClient();
      
      // 2. Ensure firehose connection for authenticated users
      console.log('🚀 [G3] Step 2: ensureFirehose()');
      if (auth.isAuthenticated && auth.user) {
        await ensureFirehose();
      } else {
        console.log('⚠️ [G3] Skipping ensureFirehose - not authenticated');
      }
      
      // 3. Load sessions
      console.log('🚀 [G3] Step 3: loadSessions()');
      await loadSessions();
      
      console.log('✅ [G3b] initialize() COMPLETE');

    } catch (err) {
      console.error('❌ [G3] initialize() FAILED:', err);
      throw err;
    }
  }, [initializeClient, auth.isAuthenticated, auth.user, ensureFirehose, loadSessions]);

  // Auto-initialization
  useEffect(() => {
    console.log('🔄 [G3] Auto-init effect:', { autoInitialize, isInitialized });
    if (autoInitialize && !isInitialized) {
      console.log('🚀 [G3] Triggering initialize()');
      initialize();
    } else {
      console.log('⏸️ [G3] Skipping initialize:', { autoInitialize, isInitialized });
    }
  }, [autoInitialize, isInitialized, initialize]);

  // FORCE SYNC: currentSessionId should ALWAYS match URL sessionId
  useEffect(() => {
    console.log('🔄 [FORCE-SYNC] URL sessionId changed:', {
      urlSessionId,
      directUrlSessionId,
      actualSessionId,
      currentSessionId,
      needsSync: actualSessionId !== currentSessionId
    });
    
    // UNCONDITIONAL: If URL has sessionId, currentSessionId MUST match it
    if (actualSessionId && actualSessionId !== currentSessionId) {
      console.log('🔄 [FORCE-SYNC] FORCING currentSessionId sync to URL:', actualSessionId);
      setCurrentSessionId(actualSessionId);
    }
    
    // Clear currentSessionId if URL has no sessionId
    if (!actualSessionId && currentSessionId) {
      console.log('🔄 [FORCE-SYNC] CLEARING currentSessionId (no URL sessionId)');
      setCurrentSessionId(undefined);
    }
  }, [urlSessionId, directUrlSessionId, actualSessionId, currentSessionId, setCurrentSessionId, location.pathname]);

  // Load session details when currentSessionId changes (separate effect)
  useEffect(() => {
    console.log('🔄 [SESSION-DETAILS] currentSessionId changed:', {
      currentSessionId,
      acsClientAvailable: !!acsClient,
      shouldLoadDetails: currentSessionId && acsClient
    });
    
    if (currentSessionId && acsClient) {
      console.log('✅ [SESSION-DETAILS] Loading session details for:', currentSessionId);
      loadSessionDetails(currentSessionId);

      if (autoConnectStreaming && !USE_FIREHOSE_ONLY) {
        connectStreaming(currentSessionId).catch(err => {
          console.error('[useACSChatUIRefactored] Auto-connect streaming failed:', err);
        });
      }
    }
  }, [currentSessionId, acsClient, loadSessionDetails, autoConnectStreaming, connectStreaming]);

  // Navigation helpers
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  }, [navigate]);

  const navigateToChat = useCallback(() => {
    navigate('/whatsapp');
  }, [navigate]);



  // Utility actions
  const refresh = useCallback(async () => {
    try {
      await loadSessions();
      if (currentSessionId) {
        await loadSessionDetails(currentSessionId);
      }
    } catch (err) {
      console.error('[useACSChatUIRefactored] Refresh failed:', err);
    }
  }, [loadSessions, currentSessionId, loadSessionDetails]);

  const clearError = useCallback(() => {
    clearSessionsError();
    clearMessagesError();
  }, [clearSessionsError, clearMessagesError]);

  // Authentication actions (delegated to auth context)
  const login = useCallback(async (email: string, password: string) => {
    // This would typically be handled by the auth context
    throw new Error('Login should be handled by AuthContext');
  }, []);

  const logout = useCallback(async () => {
    try {
      await disconnectStreaming();
      clearMessages();
      setCurrentSessionId(undefined);
      // Actual logout handled by AuthContext
      navigate('/whatsapp');
    } catch (err) {
      console.error('[useACSChatUIRefactored] Logout error:', err);
    }
  }, [disconnectStreaming, clearMessages, setCurrentSessionId, navigate]);

  // Wrapper for sendMessage that automatically includes session's agent_cwd
  const sendMessageWithSessionContext = useCallback(async (
    message: string,
    options: {
      agentConfigName?: string;
      agentConfigId?: string;
      modelApiKeys?: Record<string, string>;
      agentCwd?: string;
    } = {}
  ) => {
    // Use provided agentCwd or fall back to current session's agent_cwd
    const agentCwd = options.agentCwd || currentSession?.agent_cwd || undefined;
    
    return sendMessage(message, {
      ...options,
      ...(agentCwd && { agentCwd })
    });
  }, [sendMessage, currentSession?.agent_cwd]);

  // DEBUG: Log what we're about to return
  console.log('🔄 [RETURN-VALUE] About to return from useACSChatUIRefactored:', {
    agentConfigsMap_exists: !!agentConfigsMap,
    agentConfigsMap_size: agentConfigsMap ? Object.keys(agentConfigsMap).length : 'N/A',
    agentConfigsMap_keys: agentConfigsMap ? Object.keys(agentConfigsMap) : 'N/A',
    currentAgentConfigId,
    currentAgentConfig_exists: !!currentAgentConfig
  });

  // Memoized return value
  return useMemo(
    () => ({
      // Client state
      isInitialized,
      isAuthenticated,
      isConnected,
      connectionStatus,

      // Session state
      currentSessionId,
      currentSession,
      sessions,

      // Message state
      messages,
      isLoading,
      hasStreamingMessage,
      
      // Timeline state (NEW)
      timeline: timelineEvents,

      // Agent config state
      agentConfigs: agentConfigsMap,
      agentConfigsMap, // Also provide direct access with this name
      currentAgentConfigId,
      currentAgentConfig,
      currentModelId,

      // User state
      user,

      // Actions
      initialize,
      login,
      logout,

      // Session actions
      createSession,
      switchToSession,
      deleteSession,
      renameSession,

      // Message actions
      sendMessage: sendMessageWithSessionContext, // 👈 USE WRAPPER WITH SESSION CONTEXT
      startConversation,
      cancelCurrentConversation,

      // Agent config actions (TODO: implement)
      loadAgentConfigs: async () => {},
      setCurrentAgentConfig: () => {},
      createAgentConfig: async () => '',
      updateAgentConfig: async () => {},
      deleteAgentConfig: async () => {},

      // Streaming actions
      connectStreaming,
      disconnectStreaming,

      // Navigation helpers
      navigateToSession,
      navigateToChat,

      // Utility
      refresh,
      getHealthStatus,

      // Error state
      error,
      clearError,

      // ACS Client access (for debug purposes)
      acsClient,

      // SSE Events for debug panel
      sseEvents
    }),
    [
      isInitialized,
      isAuthenticated,
      isConnected,
      connectionStatus,
      currentSessionId,
      currentSession,
      sessions,
      messages,
      isLoading,
      hasStreamingMessage,
      timelineEvents,
      agentConfigsMap,
      currentAgentConfigId,
      currentAgentConfig,
      user,
      initialize,
      login,
      logout,
      createSession,
      switchToSession,
      deleteSession,
      renameSession,
      sendMessageWithSessionContext,
      startConversation,
      cancelCurrentConversation,
      connectStreaming,
      disconnectStreaming,
      navigateToSession,
      navigateToChat,
      refresh,
      getHealthStatus,
      error,
      clearError,
      acsClient,
      sseEvents
    ]
  );
};