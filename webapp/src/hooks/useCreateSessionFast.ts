/**
 * Hook for fast session creation
 * Stub implementation for web app - session creation is handled differently
 */

export interface CreateSessionOptions {
  sessionName?: string;
  agentConfigId?: string;
  workspacePath?: string;
  metadata?: Record<string, any>;
}

export interface CreateSessionResult {
  sessionId: string;
  success: boolean;
  error?: string;
}

/**
 * Create a new session quickly
 * Stub implementation for web app
 */
export async function createSessionFast(options: CreateSessionOptions = {}): Promise<CreateSessionResult> {
  console.warn('[useCreateSessionFast] Stub implementation - createSessionFast not functional in web app');
  
  // Generate a mock session ID
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    sessionId,
    success: true
  };
}

/**
 * Hook version for React components
 */
export function useCreateSessionFast() {
  return {
    createSessionFast,
    isLoading: false,
    error: null
  };
}