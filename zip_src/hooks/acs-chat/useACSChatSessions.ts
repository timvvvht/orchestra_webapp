import { useState, useCallback, useEffect } from 'react';
import type { OrchestACSClient, SessionSummary, SessionDetails } from '@/services/acs';
import { useMessagesStore } from '@/store/messagesStore';
// import { OrchestraSCM } from '@/services/scm/trimmed/OrchestraSCM';

export interface UseACSChatSessionsOptions {
  autoLoad?: boolean;
  userId?: string;
}

export interface UseACSChatSessionsReturn {
  // State
  sessions: SessionSummary[];
  currentSessionId: string | undefined;
  currentSession: SessionDetails | undefined;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (name?: string, agentConfigId?: string, agentCwd?: string) => Promise<string>;
  switchToSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  loadSessionDetails: (sessionId: string) => Promise<void>;
  setCurrentSessionId: (sessionId: string | undefined) => void;
  clearError: () => void;
}

/**
 * Hook for managing ACS chat sessions
 * Handles session CRUD operations and current session state
 */
export const useACSChatSessions = (
  acsClient: OrchestACSClient,
  options: UseACSChatSessionsOptions = {}
): UseACSChatSessionsReturn => {
  const { autoLoad = true, userId } = options;

  // State
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionIdState] = useState<string | undefined>();
  const [currentSession, setCurrentSession] = useState<SessionDetails | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DEBUG: Log every render to see currentSessionId value
  console.log('🔍 [SESSIONS-RENDER] Hook render - currentSessionId:', currentSessionId);

  // Messages store actions
  const setMessages = useMessagesStore(state => state.setMessages);
  const clearMessages = useMessagesStore(state => state.clearMessages);

  // Helper function to create SCM checkpoint for session
  const createSessionCheckpoint = useCallback(async (session: SessionDetails, message: string) => {
    if (session.agent_cwd && session.agent_cwd.trim() !== '') {
      try {
        console.log(`[useACSChatSessions] Creating SCM checkpoint for session ${session.id} with CWD: ${session.agent_cwd}`);
        // const scm = await OrchestraSCM.create();
        // const checkpointHash = await scm.checkpoint(session.agent_cwd, message);
        const checkpointHash = 'mock-checkpoint-hash';
        
        if (checkpointHash !== 'no-changes') {
          console.log(`[useACSChatSessions] ✅ Created SCM checkpoint ${checkpointHash.substring(0, 8)} for session ${session.id}`);
        } else {
          console.log(`[useACSChatSessions] No changes to checkpoint for session ${session.id}`);
        }
      } catch (scmError) {
        console.error(`[useACSChatSessions] Failed to create SCM checkpoint for session ${session.id}:`, scmError);
        // Don't throw here - SCM checkpoint is optional
      }
    } else {
      console.log(`[useACSChatSessions] Skipping SCM checkpoint for session ${session.id} - no agent_cwd set`);
    }
  }, []);

  // Load session details - DEFINED FIRST to avoid circular dependency
  const loadSessionDetails = useCallback(async (sessionId: string) => {
    console.log('📄 [SES] loadSessionDetails START:', sessionId);
    console.log('📄 [SES] ACS Client available:', !!acsClient);
    console.log('📄 [SES] Current loading state:', isLoading);
    
    // Guard against temp session IDs
    if (sessionId.startsWith('temp-')) {
      console.log('⏸️ [SES] Skipping temp session:', sessionId);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📄 [SES] Fetching session details...');
      const response = await acsClient.sessions.getSession(sessionId, {
        includeMessages: true
      });

      console.log('📄 [SES] Session details response:', {
        sessionId: response.data.id,
        name: response.data.name,
        messageCount: response.data.messages?.length || 0
      });

      console.log('📄 [SES] Session details BREAKDOWN:', {
        id: response.data.id,
        name: response.data.name,
        agent_config_id: response.data.agent_config_id,
        agent_cwd: response.data.agent_cwd,
        model_id: response.data.model_id,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        messages_count: response.data.messages?.length || 0,
        all_keys: Object.keys(response.data),
        full_object: response.data
      });

      setCurrentSession(response.data);
      
      // Create SCM checkpoint if session has agent_cwd (indicates workspace selection)
      if (response.data.agent_cwd && response.data.agent_cwd.trim() !== '') {
        await createSessionCheckpoint(response.data, `Session loaded: ${response.data.name || 'Untitled'}`);
      }
      
      // Set messages in the messages store for timeline to work
      if (response.data.messages && response.data.messages.length > 0) {
        console.log('📄 [SES] Setting', response.data.messages.length, 'messages in store');
        setMessages(draft => {
          draft.length = 0; // Clear existing messages
          draft.push(...response.data.messages); // Add new messages
        });
      } else {
        console.log('📄 [SES] No messages, clearing store');
        clearMessages();
      }
      
      console.log('✅ [SES] loadSessionDetails SUCCESS');
    } catch (err) {
      console.error('❌ [SES] loadSessionDetails FAILED:', err);
      setError('Failed to load session details');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [acsClient, setMessages, clearMessages, createSessionCheckpoint]);

  // Wrapped setCurrentSessionId with debug logging
  const setCurrentSessionId = useCallback((sessionId: string | undefined) => {
    console.log('🔄 [SESSIONS] setCurrentSessionId called with:', sessionId);
    console.log('🔄 [SESSIONS] Previous currentSessionId was:', currentSessionId);
    console.log('🔄 [SESSIONS] Call stack:', new Error().stack?.split('\n').slice(1, 4));
    console.log('🔄 [SESSIONS] About to call setCurrentSessionIdState...');
    setCurrentSessionIdState(sessionId);
    console.log('🔄 [SESSIONS] setCurrentSessionIdState called, new state should be:', sessionId);
    
    // Add a timeout to check if state actually updated
    setTimeout(() => {
      console.log('🔄 [SESSIONS] State check after 100ms - currentSessionId should now be:', sessionId);
    }, 100);
  }, [currentSessionId]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    console.log('📋 [G4] loadSessions() START');
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📋 [G4] Calling acsClient.sessions.listSessions...');
      const response = await acsClient.sessions.listSessions({
        limit: 100,
        includeMessageCount: true
      });
      
      console.log('📋 [G4] Sessions response:', response.data.sessions?.length || 0, 'sessions');
      setSessions(response.data.sessions);
      console.log('✅ [G4] loadSessions() SUCCESS');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
      console.error('❌ [G4] loadSessions() FAILED:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [acsClient]);

  // Create session
  const createSession = useCallback(async (name?: string, agentConfigId?: string, agentCwd?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!userId) {
        throw new Error('User not authenticated - userId is missing');
      }

      // Use the current Orchestra project directory as default
      const defaultCwd = agentCwd || '/Users/tim/Code/orchestra';
      
      const response = await acsClient.sessions.createDefaultSession(
        name, 
        agentConfigId || 'general',
        { agentCwd: defaultCwd }
      );
      const sessionId = response.data?.data?.session_id || response.data?.data?.id;
      
      if (sessionId) {
        // Create SCM checkpoint if session was created with a non-default CWD
        if (agentCwd && agentCwd.trim() !== '') {
          try {
            console.log(`[useACSChatSessions] Creating SCM checkpoint for new session ${sessionId} with CWD: ${agentCwd}`);
            // const scm = await OrchestraSCM.create();
            // const checkpointHash = await scm.checkpoint(agentCwd, `Session created: ${name || 'New Chat'}`);
            const checkpointHash = 'mock-checkpoint-hash';
            
            if (checkpointHash !== 'no-changes') {
              console.log(`[useACSChatSessions] ✅ Created SCM checkpoint ${checkpointHash.substring(0, 8)} for new session ${sessionId}`);
            } else {
              console.log(`[useACSChatSessions] No changes to checkpoint for new session ${sessionId}`);
            }
          } catch (scmError) {
            console.error(`[useACSChatSessions] Failed to create SCM checkpoint for new session ${sessionId}:`, scmError);
            // Don't throw here - session was created successfully, SCM checkpoint is optional
          }
        }
        
        await loadSessions(); // Refresh sessions list
        return sessionId;
      }
      
      throw new Error(`Failed to create session - no session_id in response: ${JSON.stringify(response.data)}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [acsClient, userId, loadSessions]);

  // Switch to session
  const switchToSession = useCallback(async (sessionId: string) => {
    console.log('🔄 [SES] switchToSession:', sessionId);
    try {
      setCurrentSessionId(sessionId);
      await loadSessionDetails(sessionId);
    } catch (err) {
      console.error('❌ [SES] switchToSession FAILED:', err);
      setError('Failed to switch to session');
      throw err;
    }
  }, [setCurrentSessionId, loadSessionDetails]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await acsClient.sessions.deleteSession(sessionId);
      await loadSessions();

      if (sessionId === currentSessionId) {
        setCurrentSessionId(undefined);
        setCurrentSession(undefined);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [acsClient, currentSessionId, loadSessions, setCurrentSessionId]);

  // Rename session
  const renameSession = useCallback(async (sessionId: string, newName: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await acsClient.sessions.renameSession(sessionId, newName);
      await loadSessions();

      if (sessionId === currentSessionId) {
        await loadSessionDetails(sessionId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [acsClient, currentSessionId, loadSessions, loadSessionDetails]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Debug: Log when currentSessionId changes
  useEffect(() => {
    console.log('🔄 [SESSIONS] currentSessionId state changed to:', currentSessionId);
    console.log('🔄 [SESSIONS] State change timestamp:', new Date().toISOString());
  }, [currentSessionId]);

  // Auto-load sessions on mount
  useEffect(() => {
    if (autoLoad && acsClient) {
      loadSessions();
    }
  }, [autoLoad, acsClient, loadSessions]);

  return {
    // State
    sessions,
    currentSessionId, // This is the state variable
    currentSession,
    isLoading,
    error,

    // Actions
    loadSessions,
    createSession,
    switchToSession,
    deleteSession,
    renameSession,
    loadSessionDetails,
    setCurrentSessionId, // This is our wrapped function with debug logging
    clearError
  };
};