/**
 * Tauri API wrappers for worktree operations
 */
import { invoke } from "@tauri-apps/api/core";
import type {
  FinalizeResultResponse,
  CreateWorktreeResponse,
  MergePreviewSummary,
} from "@/types/worktreeTypes";
import { isGitRepo } from "./gitHelpers";

/**
 * Checks if the repository has uncommitted changes (is dirty)
 * @param projectRoot - The project root path to check
 * @returns Promise<boolean> - true if repo is dirty, false if clean
 */
export async function checkRepoDirtyRaw(projectRoot: string): Promise<boolean> {
  try {
    console.log(`🔍 [worktreeApi] Checking if repo is dirty: ${projectRoot}`);

    const result = await invoke<boolean>("check_repo_dirty", {
      projectRoot: projectRoot,
    });

    console.log(`🔍 [worktreeApi] Repository dirty status: ${result}`);
    return result;
  } catch (error) {
    console.error(`❌ [worktreeApi] Failed to check repo dirty status:`, error);
    throw new Error(`Failed to check repository status: ${error}`);
  }
}

/**
 * Lightweight wrapper for checking repository dirty status - public API
 * @param projectRoot - The project root path to check
 * @returns Promise<boolean> - true if repo is dirty, false if clean
 */
export async function checkRepoDirtyLightweight(
  projectRoot: string
): Promise<boolean> {
  console.log(
    `[worktreeApi][checkRepoDirtyLightweight] Checking dirty status for: ${projectRoot}`
  );
  const result = await checkRepoDirtyRaw(projectRoot);
  console.log(`[worktreeApi][checkRepoDirtyLightweight] Result: ${result}`);
  return result;
}

/**
 * Auto-commits all changes in the repository with a custom message
 * @param projectRoot - The project root path
 * @param message - The commit message to use
 * @returns Promise<void>
 */
export async function autoCommitRepo(
  projectRoot: string,
  message: string
): Promise<void> {
  try {
    console.log(
      `💾 [worktreeApi] Auto-committing repo: ${projectRoot} with message: "${message}"`
    );

    await invoke<void>("auto_commit_repo", {
      projectRoot: projectRoot,
      msg: message,
    });

    console.log(`💾 [worktreeApi] Successfully committed changes`);
  } catch (error) {
    console.error(`❌ [worktreeApi] Failed to auto-commit repo:`, error);
    throw new Error(`Failed to commit changes: ${error}`);
  }
}

/**
 * Creates a new worktree for the given session ID
 * @param sessionId - The session ID to create a worktree for
 * @param projectRoot - The user-supplied project root where .orchestra should be created
 * @returns Promise with workspace path and metadata
 */
export async function invokeCreateWorktree(
  sessionId: string,
  projectRoot: string
): Promise<CreateWorktreeResponse> {
  try {
    console.log(
      `🔥🔥🔥 [DEBUG] >>>>>>>>>>>>>>>>> invokeCreateWorktree CALLED with sessionId=${sessionId.slice(0, 8)}..., projectRoot=${projectRoot}`
    );
    console.log(
      `🌳 [worktreeApi] Creating worktree for session: ${sessionId.slice(0, 8)}... in project: ${projectRoot}`
    );

    // Check if repository is dirty before creating worktree
    console.log(
      `🔍 [worktreeApi] Checking repository dirty status before creating worktree...`
    );
    const isDirty = await checkRepoDirtyRaw(projectRoot);

    if (isDirty) {
      console.warn(
        `🚨 [worktreeApi] Repository is dirty - this will need to be handled by the UI`
      );
      // For now, we'll throw an error with a specific message that the UI can catch
      // Later, this will be handled by the DirtyRepoDialog
      throw new Error("DIRTY_REPO");
    }

    console.log(
      `✅ [worktreeApi] Repository is clean, proceeding with worktree creation`
    );
    console.log(
      `🔥 [DEBUG] About to call Tauri invoke('create_worktree') with params:`,
      {
        sessionId: sessionId,
        projectRoot: projectRoot,
      }
    );

    const result = await invoke<string>("create_worktree", {
      sessionId: sessionId,
      projectRoot: projectRoot,
    });

    console.log(`🔥 [DEBUG] Tauri invoke('create_worktree') returned:`, result);

    // The Tauri command returns a workspace path string
    // We'll construct the response object with available info
    const response: CreateWorktreeResponse = {
      workspace_path: result,
      session_id: sessionId,
      branch: `session-${sessionId}`, // Convention from backend
      project_root: projectRoot,
    };

    console.log(`✅ [worktreeApi] Worktree created successfully:`, {
      sessionId: sessionId.slice(0, 8) + "...",
      path: result,
      projectRoot: projectRoot,
    });

    return response;
  } catch (error) {
    console.error(
      `🔥🔥🔥 [DEBUG] >>>>>>>>>>>>>>>>> invokeCreateWorktree FAILED with error:`,
      error
    );
    console.error(
      `❌ [worktreeApi] Failed to create worktree for session ${sessionId}:`,
      error
    );

    // Check if the error is specifically DIRTY_REPO from the Tauri command
    if (error instanceof Error && error.message === "DIRTY_REPO") {
      throw new Error("DIRTY_REPO");
    } else if (typeof error === "string" && error === "DIRTY_REPO") {
      throw new Error("DIRTY_REPO");
    } else {
      throw new Error(`Failed to create worktree: ${error}`);
    }
  }
}
/**
 * Merge a worktree into main without cleaning up the worktree/branch
 * @param sessionId - The session ID whose worktree to merge
 * @param projectRoot - The user-supplied project root where .orchestra was created
 * @returns Promise with merge result
 */
export async function invokeMergeWorktree(
  sessionId: string,
  projectRoot: string
): Promise<FinalizeResultResponse> {
  try {
    console.log(
      `🔄 [worktreeApi] Merge-only for session: ${sessionId.slice(0, 8)}... in project: ${projectRoot}`
    );

    const result = await invoke<FinalizeResultResponse>("merge_worktree", {
      sessionId: sessionId,
      projectRoot: projectRoot,
    });

    console.log(`✅ [worktreeApi] Merge-only completed:`, {
      sessionId: sessionId.slice(0, 8) + "...",
      status: result.status,
      projectRoot: projectRoot,
    });

    return result;
  } catch (error) {
    console.error(
      `❌ [worktreeApi] Failed to merge-only for session ${sessionId}:`,
      error
    );
    throw new Error(`Failed to merge worktree: ${error}`);
  }
}

/**
 * Finalizes a worktree by merging changes back to main
 * @param sessionId - The session ID whose worktree to finalize
 * @param projectRoot - The user-supplied project root where .orchestra was created
 * @returns Promise with merge result
 */
export async function invokeFinalizeWorktree(
  sessionId: string,
  projectRoot: string,
  keepWorktree?: boolean
): Promise<FinalizeResultResponse> {
  try {
    console.log(
      `🔄 [worktreeApi] Finalizing worktree for session: ${sessionId.slice(0, 8)}... in project: ${projectRoot}`
    );

    const result = await invoke<FinalizeResultResponse>("finalize_worktree", {
      sessionId: sessionId,
      projectRoot: projectRoot,
      keepWorktree: !!keepWorktree,
    });

    console.log(`✅ [worktreeApi] Worktree finalized:`, {
      sessionId: sessionId.slice(0, 8) + "...",
      status: result.status,
      projectRoot: projectRoot,
    });

    return result;
  } catch (error) {
    console.error(
      `❌ [worktreeApi] Failed to finalize worktree for session ${sessionId}:`,
      error
    );
    throw new Error(`Failed to finalize worktree: ${error}`);
  }
}

/**
 * Ensures a worktree exists for the given session, creating one if necessary
 * @param sessionId - The session ID to ensure a worktree for
 * @param codePath - The project root path where the worktree should be created
 * @returns Promise with workspace path and metadata
 */
export async function ensureWorktreeForSession(
  sessionId: string,
  codePath: string
): Promise<CreateWorktreeResponse> {
  try {
    console.log(
      `🔧 [worktreeApi] Ensuring worktree exists for session: ${sessionId.slice(0, 8)}... in project: ${codePath}`
    );

    // For now, we'll always call create_worktree since it's idempotent
    // The backend will return existing worktree if it already exists
    const result = await invokeCreateWorktree(sessionId, codePath);

    console.log(
      `✅ [worktreeApi] Worktree ensured for session: ${sessionId.slice(0, 8)}...`
    );
    return result;
  } catch (error) {
    console.error(
      `❌ [worktreeApi] Failed to ensure worktree for session ${sessionId}:`,
      error
    );
    throw new Error(`Failed to ensure worktree: ${error}`);
  }
}

/**
 * Creates a worktree with dirty repository handling via modal
 * This is a higher-level wrapper that handles the dirty repo modal flow
 * @param sessionId - The session ID to create a worktree for
 * @param projectRoot - The project root path
 * @param onShowDirtyModal - Callback to show the dirty repo modal
 * @returns Promise with workspace path and metadata
 */
export async function createWorktreeWithDirtyCheck(
  sessionId: string,
  projectRoot: string,
  onShowDirtyModal?: (
    projectRoot: string,
    onCommitAndContinue: () => Promise<void>
  ) => void
): Promise<CreateWorktreeResponse> {
  if (!(await isGitRepo(projectRoot))) {
    console.log("[worktreeApi] non-git path – skipping worktree");
    return {
      workspace_path: projectRoot,
      session_id: sessionId,
      branch: "direct",
      project_root: projectRoot, // Return the project root directly
    };
  }
  try {
    // First attempt - this will throw 'DIRTY_REPO' if repo is dirty
    return await invokeCreateWorktree(sessionId, projectRoot);
  } catch (error) {
    if (error instanceof Error && error.message === "DIRTY_REPO") {
      console.log("🚨 [worktreeApi] Repository is dirty, showing modal...");

      if (!onShowDirtyModal) {
        // If no modal handler provided, just throw the error
        throw new Error(
          "Repository has uncommitted changes. Please commit or stash your changes before creating a worktree."
        );
      }

      // Return a promise that resolves when the modal flow completes
      return new Promise((resolve, reject) => {
        const handleCommitAndContinue = async () => {
          try {
            // After committing, try creating the worktree again
            const result = await invokeCreateWorktree(sessionId, projectRoot);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        };

        // Show the modal with the commit handler
        onShowDirtyModal(projectRoot, handleCommitAndContinue);
      });
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}

/**
 * Checks if we're running in a Tauri environment
 * @returns true if Tauri APIs are available
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export async function invokePreviewMergeWorktree(
  sessionId: string,
  projectRoot: string
): Promise<MergePreviewSummary> {
  const result = await invoke<MergePreviewSummary>("preview_merge_worktree", {
    sessionId,
    projectRoot,
  });
  return result;
}
