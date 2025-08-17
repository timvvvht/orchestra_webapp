/**
 * Hook for fast session creation
 * Implemented to use ACS session service in the web app
 */

import { getDefaultACSClient } from "@/services/acs";

export interface CreateSessionOptions {
  sessionName?: string;
  agentConfigId?: string;
  workspacePath?: string; // maps to agent_cwd/base_dir
  metadata?: Record<string, any>;
}

export interface CreateSessionResult {
  sessionId: string;
  success: boolean;
  error?: string;
}

/**
 * Create a new session quickly using ACS services
 */
export async function createSessionFast(
  options: CreateSessionOptions = {}
): Promise<CreateSessionResult> {
  const acs = getDefaultACSClient();

  try {
    // Prefer explicit workspacePath when given; otherwise ACSSessionService can apply smart defaults.
    const { sessionName, agentConfigId, workspacePath, metadata } = options;

    // If we have any explicit values, use createSession; otherwise use createDefaultSession for smarter cwd detection.
    if (sessionName || agentConfigId || workspacePath || metadata) {
      const resp = await acs.sessions.createSession({
        name: sessionName || undefined,
        agent_config_id: agentConfigId || "general",
        agent_cwd: workspacePath || undefined,
        base_dir: workspacePath || undefined,
      });

      // @ts-ignore
      const sessionId = resp.data.session_id || resp.data.data.id;
      if (!sessionId) {
        throw new Error("ACS did not return a session ID");
      }

      return { sessionId, success: true };
    } else {
      // No explicit options: use convenience method with smart defaults
      const resp = await acs.sessions.createDefaultSession();
      const sessionId = resp?.data?.session_id;
      if (!sessionId) {
        throw new Error("ACS did not return a session ID");
      }

      return { sessionId, success: true };
    }
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to create session";
    console.error("[useCreateSessionFast] createSessionFast failed:", error);

    return { sessionId: "", success: false, error: message };
  }
}

/**
 * Hook version for React components
 */
export function useCreateSessionFast() {
  // You can enrich this with local loading/error state if needed by the UI
  return {
    createSessionFast,
    isLoading: false,
    error: null,
  };
}
