/**
 * useCanonicalChatUI - Canonical store version of useACSChatUIRefactored
 * 
 * Provides the same interface as useACSChatUIRefactored but uses the canonical
 * Zustand event store as the source of truth for timeline events.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useEventStore } from '@/stores/eventStore';
import { useTimelineEvents } from '@/selectors/canonical/useTimelineEvents';
import type { UseACSChatUIOptions, UseACSChatUIReturn } from './useACSChatUI';
import type { UnifiedTimelineEvent } from '@/types/unifiedTimeline';

import type { ChatMessage } from '@/types/chatTypes';

/**
 * Canonical version of the chat UI hook
 * 
 * This hook provides the same interface as useACSChatUIRefactored but sources
 * its data from the canonical Zustand event store instead of the legacy system.
 */
export const useCanonicalChatUI = (options: UseACSChatUIOptions = {}): UseACSChatUIReturn => {
  const {
    autoInitialize = true,
    defaultAgentConfigName = 'general',
    defaultAgentConfigId,
    userId,
    debug = false
  } = options;

  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  const auth = useAuth();

  // State management
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(urlSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get timeline events from canonical store
  const timeline = useTimelineEvents(currentSessionId);

  // Get session information from canonical store
  const sessionIds = useEventStore(state => Array.from(state.bySession.keys()));
  const currentSession = useMemo(() => {
    if (!currentSessionId) return undefined;
    
    // Create a minimal session object
    return {
      id: currentSessionId,
      name: `Session ${currentSessionId.slice(-8)}`, // Use last 8 chars as name
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }, [currentSessionId]);

  // Convert timeline events to legacy message format for compatibility
  const messages = useMemo(() => {
    const textEvents = timeline.filter(event => event.type === 'text');
    
    return textEvents.map(event => ({
      id: event.id,
      sessionId: event.sessionId,
      role: event.role,
      content: [{ type: 'text', text: event.text }],
      createdAt: event.createdAt,
      source: event.source,
      isStreaming: event.isStreaming || false,
      thinking: false
    } as ChatMessage));
  }, [timeline]);

  // Check for streaming messages
  const hasStreamingMessage = useMemo(() => {
    return timeline.some(event => 
      (event.type === 'text' || event.type === 'chunk') && 
      event.isStreaming === true
    );
  }, [timeline]);

  // Determine if system is initialized
  const isInitialized = auth.isAuthenticated;
  const isAuthenticated = auth.isAuthenticated;
  const isConnected = true; // Canonical store is always "connected"

  // Mock agent configs (simplified for now)
  const agentConfigs: any[] = [];
  const currentAgentConfigId = defaultAgentConfigId;
  const currentAgentConfig = undefined;

  // Mock sessions list
  const sessions = useMemo(() => {
    return sessionIds.map(id => ({
      id,
      name: `Session ${id.slice(-8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
  }, [sessionIds]);

  // Navigation helpers
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  }, [navigate]);

  const navigateToChat = useCallback(() => {
    navigate('/whatsapp');
  }, [navigate]);

  // Session management actions
  const createSession = useCallback(async (): Promise<string> => {
    // For now, generate a simple session ID
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    return newSessionId;
  }, []);

  const switchToSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    // TODO: Implement session deletion in canonical store
    console.warn('[useCanonicalChatUI] Session deletion not yet implemented');
  }, []);

  const renameSession = useCallback(async (sessionId: string, newName: string) => {
    // TODO: Implement session renaming in canonical store
    console.warn('[useCanonicalChatUI] Session renaming not yet implemented');
  }, []);

  // Message actions
  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!currentSessionId) {
      throw new Error('No active session');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement message sending through canonical store
      // For now, this is a placeholder
      console.log('[useCanonicalChatUI] Sending message:', message);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId]);

  const startConversation = useCallback(async (message: string): Promise<string> => {
    const sessionId = await createSession();
    await sendMessage(message);
    return sessionId;
  }, [createSession, sendMessage]);

  // Streaming actions (no-ops for canonical store)
  const connectStreaming = useCallback(async (sessionId?: string) => {
    // Canonical store doesn't need explicit streaming connection
    console.log('[useCanonicalChatUI] Streaming connection not needed for canonical store');
  }, []);

  const disconnectStreaming = useCallback(async () => {
    // Canonical store doesn't need explicit streaming disconnection
    console.log('[useCanonicalChatUI] Streaming disconnection not needed for canonical store');
  }, []);

  // Utility actions
  const initialize = useCallback(async () => {
    console.log('[useCanonicalChatUI] Initializing canonical chat UI...');
    // Canonical store is always ready
  }, []);

  const refresh = useCallback(async () => {
    console.log('[useCanonicalChatUI] Refreshing canonical chat UI...');
    // Canonical store auto-updates
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Authentication actions (delegated to auth context)
  const login = useCallback(async (email: string, password: string) => {
    throw new Error('Login should be handled by AuthContext');
  }, []);

  const logout = useCallback(async () => {
    setCurrentSessionId(undefined);
    navigate('/whatsapp');
  }, [navigate]);

  // Handle URL session changes
  useEffect(() => {
    if (urlSessionId && urlSessionId !== currentSessionId && isAuthenticated) {
      setCurrentSessionId(urlSessionId);
    }
  }, [urlSessionId, currentSessionId, isAuthenticated]);

  // Auto-initialization
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // Memoized return value matching useACSChatUIRefactored interface
  return useMemo(
    () => ({
      // Client state
      isInitialized,
      isAuthenticated,
      isConnected,
      connectionStatus: 'connected' as const,

      // Session state
      currentSessionId,
      currentSession,
      sessions,

      // Message state
      messages,
      isLoading,
      hasStreamingMessage,

      // Agent config state
      agentConfigs,
      currentAgentConfigId,
      currentAgentConfig,

      // User state
      user: auth.user,

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
      sendMessage,
      startConversation,

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
      getHealthStatus: async () => ({ status: 'healthy' }),

      // Error state
      error,
      clearError,

      // ACS Client access (mock for compatibility)
      acsClient: null,

      // SSE Events (empty for canonical store)
      sseEvents: []
    }),
    [
      isInitialized,
      isAuthenticated,
      isConnected,
      currentSessionId,
      currentSession,
      sessions,
      messages,
      isLoading,
      hasStreamingMessage,
      agentConfigs,
      currentAgentConfigId,
      currentAgentConfig,
      auth.user,
      initialize,
      login,
      logout,
      createSession,
      switchToSession,
      deleteSession,
      renameSession,
      sendMessage,
      startConversation,
      connectStreaming,
      disconnectStreaming,
      navigateToSession,
      navigateToChat,
      refresh,
      error,
      clearError
    ]
  );
};