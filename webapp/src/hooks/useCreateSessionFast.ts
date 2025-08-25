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
  // Optional repo context to bind this session to a workspace
  repoContext?: {
    repo_id: number;
    repo_full_name: string;
    branch: string;
  };
  // Optional: If provided, check if this session already exists before creating
  existingSessionId?: string;
}

export interface CreateSessionResult {
  sessionId: string;
  success: boolean;
  error?: string;
}

/**
 * Create a new session quickly using ACS services
 * If existingSessionId is provided, first check if it exists before creating
 */
export async function createSessionFast(
  options: CreateSessionOptions = {}
): Promise<CreateSessionResult> {
  const acs = getDefaultACSClient();

  try {
    const {
      sessionName,
      agentConfigId,
      workspacePath,
      metadata,
      repoContext,
      existingSessionId,
    } = options;

    // If we have an existing session ID, first check if it exists
    if (existingSessionId) {
      try {
        console.log(
          `[useCreateSessionFast] Checking if session ${existingSessionId} exists...`
        );
        const existingSession =
          await acs.sessions.getSession(existingSessionId);

        if (
          existingSession.status >= 200 &&
          existingSession.status < 300 &&
          existingSession.data
        ) {
          console.log(
            `[useCreateSessionFast] Session ${existingSessionId} already exists, returning it`
          );
          return { sessionId: existingSessionId, success: true };
        }
      } catch (error) {
        console.log(
          `[useCreateSessionFast] Session ${existingSessionId} not found, will create new one:`,
          error
        );
        // Continue to create a new session
      }
    }

    // Prefer explicit workspacePath when given; otherwise ACSSessionService can apply smart defaults.
    if (
      sessionName ||
      agentConfigId ||
      workspacePath ||
      metadata ||
      repoContext
    ) {
      // Merge metadata with repo context under canonical keys
      const finalMetadata = {
        ...(metadata || {}),
        ...(repoContext
          ? {
              repo_id: repoContext.repo_id,
              repo_full_name: repoContext.repo_full_name,
              branch: repoContext.branch,
              workspace_key: `${repoContext.repo_full_name}#${repoContext.branch}`,
            }
          : {}),
      } as Record<string, any>;

      const resp = await acs.sessions.createSession({
        name: sessionName || undefined,
        agent_config_id: agentConfigId || "general",
        agent_cwd: workspacePath || undefined,
        base_dir: workspacePath || undefined,
        origin: "web", // Explicit origin for webapp
        ...(Object.keys(finalMetadata).length
          ? { metadata: finalMetadata }
          : {}),
      });

      // @ts-ignore
      const sessionId = resp.data.session_id || resp.data.data.id;
      if (!sessionId) {
        throw new Error("ACS did not return a session ID");
      }

      // 2-step write: Ensure metadata is written even if createSession ignores it
      // This is a fallback mechanism to guarantee workspace context persistence
      if (Object.keys(finalMetadata).length > 0) {
        console.log("[useCreateSessionFast] Session created with metadata:", {
          sessionId,
          metadata: finalMetadata,
          hasWorkspaceKey: !!finalMetadata.workspace_key,
          repoContext: repoContext ? {
            repo_id: repoContext.repo_id,
            repo_full_name: repoContext.repo_full_name,
            branch: repoContext.branch
          } : null
        });
        
        try {
          await acs.sessions.updateSession(sessionId, { metadata: finalMetadata });
          console.log("[useCreateSessionFast] ✅ Metadata written via fallback update - workspace context persisted");
        } catch (updateError) {
          console.warn("[useCreateSessionFast] ❌ Failed to write metadata via fallback update:", updateError);
          // Don't fail the entire session creation if metadata update fails
        }
      } else {
        console.log("[useCreateSessionFast] Session created without metadata:", { sessionId });
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
