// Task Orchestration Helper Functions
// This file contains composable functions for each step of the task creation process
// allowing for flexible, mix-and-match task creation workflows.

import { isGitRepo } from "@/utils/gitHelpers";
import { checkRepoDirtyLightweight } from "@/utils/worktreeApi";
import { createSessionFast } from "@/hooks/useCreateSessionFast";
import { isTauri } from '@/utils/runtime';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("Tauri invoke not available in web environment");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}
import { getDefaultACSClient } from "@/services/acs";
import {
  sendChatMessage,
  SendChatMessageOptions,
} from "@/utils/sendChatMessage";
import { sendChatWithHooks } from "@/utils/sendChatWithHooks";

export async function checkRepositoryState(
  codePath: string
): Promise<{ isDirty: boolean; isGit: boolean }> {
  console.log(
    `[taskOrchestration][checkRepositoryState] Checking repo state for: ${codePath}`
  );

  const isGit = await isGitRepo(codePath);
  console.log(`[taskOrchestration][checkRepositoryState] isGit: ${isGit}`);

  if (!isGit) {
    console.log(
      `[taskOrchestration][checkRepositoryState] Not a git repo, returning clean state`
    );
    return { isDirty: false, isGit: false };
  }

  const isDirty = await checkRepoDirtyLightweight(codePath);
  console.log(`[taskOrchestration][checkRepositoryState] isDirty: ${isDirty}`);

  const result = { isDirty, isGit: true };
  console.log(
    `[taskOrchestration][checkRepositoryState] Final result:`,
    result
  );
  return result;
}

export async function createTaskSession(
  sessionName: string,
  agentConfigId: string
): Promise<string> {
  // This function directly wraps the existing fast ID creation logic.
  const result = await createSessionFast({ sessionName, agentConfigId });
  if (!result.success || !result.sessionId) {
    throw new Error(result.error || "Failed to create session");
  }
  return result.sessionId;
}

// This function assumes the repository is clean. The check is now separate.
export async function prepareTaskWorkspace(
  sessionId: string,
  projectRoot: string
): Promise<string> {
  // Returns the path to the new worktree's CWD.
  const worktreeCwd = await tauriInvoke<string>("create_worktree", {
    sessionId,
    projectRoot,
  });
  return worktreeCwd;
}

export async function updateTaskCwd(
  sessionId: string,
  cwd: string
): Promise<void> {
  const acs = getDefaultACSClient();
  await acs.sessions.updateSession(sessionId, { agent_cwd: cwd });
}

export async function setSessionBaseDir(
  sessionId: string,
  baseDir: string
): Promise<void> {
  const acs = getDefaultACSClient();
  await acs.sessions.updateSession(sessionId, { base_dir: baseDir });
}

// This provides a consistent naming scheme within our new orchestration file.
export async function sendInitialTaskMessage(
  options: SendChatMessageOptions & { cwd?: string }
): Promise<{ success: boolean; error?: string }> {
  // console.log('[TaskOrchestration] Sending initial task message:', JSON.stringify(options));
  return sendChatWithHooks(options);
}

// Export git status utilities for easy access
export { getRepoPorcelainStatus } from "./gitStatus";
export type { RepoStatusEntry } from "./gitTypes";
