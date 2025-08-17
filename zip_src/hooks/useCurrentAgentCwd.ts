import { useChatStore } from '@/stores/chat';

/**
 * Hook that retrieves the current session's agent_cwd (working directory).
 * This is used to determine the working directory context for the current chat session.
 * 
 * @returns The agent_cwd string from the current session, or null if no session is active or no cwd is set
 */
export const useCurrentAgentCwd = (): string | null => {
  return useChatStore(state => {
    const currentSessionId = state.currentSessionId;
    if (!currentSessionId) {
      return null;
    }
    
    const currentSession = state.chats[currentSessionId];
    if (!currentSession) {
      return null;
    }
    
    return currentSession.agent_cwd || null;
  });
};