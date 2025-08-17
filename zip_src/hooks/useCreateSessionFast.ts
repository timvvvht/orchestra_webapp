import { getDefaultACSClient } from '@/services/acs';

/**
 * Fast session creation that returns only the authoritative UUID
 * Used for the "Fast-ID Fire-and-Forget" flow where we need the real session ID
 * immediately, then launch heavy operations (worktree, first message) in background
 */
export async function createSessionFast(
  name: string, 
  agentConfigId?: string
): Promise<string> {
  const acs = getDefaultACSClient();
  
  const response = await acs.sessions.createDefaultSession(
    name, 
    agentConfigId || 'General'
  );
  
  // Return the authoritative UUID from the backend
  return response.data.data.id as string;
}