/**
 * Background worker for session operations
 * Handles heavy operations (worktree creation, agent_cwd update, first message send)
 * after the fast session ID is obtained
 */

import { getDefaultACSClient } from "@/services/acs";
import { isGitRepo } from "@/utils/gitHelpers";
import { SendChatMessageParams } from "@/utils/sendChatMessage";
import * as taskOrchestration from "@/utils/taskOrchestration";

export interface SessionBackgroundWorkerOptions {
  // Session configuration
  sessionName: string;
  agentConfigId: string;
  userId: string;

  // Original project path for worktree creation and fallback
  projectRoot?: string;

  // Optional original project path for base_dir setting (usually same as projectRoot)
  originalProjectPath?: string;

  // Optional first message to send
  firstMessage?: string;

  // Optional images to send with the first message
  images?: string[];

  // Optional flag to skip workspace preparation (worktree creation)
  skipWorkspacePreparation?: boolean;

  // Optional flag to enable worktrees (alternative to skipWorkspacePreparation)
  enableWorktrees?: boolean;

  // Optional repo context for backend provisioning
  repoContext?: {
    repo_id: number;
    repo_full_name: string;
    branch: string;
  };

  // Callback signatures
  onProgress?: (step: string, progress: number) => void;
  onError?: (error: Error, step: string) => void;
  onComplete?: (sessionId: string) => void;

  // Optional dirty repo modal handler
  onShowDirtyModal?: (
    projectRoot: string,
    onCommitAndContinue: () => Promise<void>
  ) => void;

  // Extended ACS parameters for first message
  modelApiKeys?: { [provider: string]: string };
  templateVariables?: { [key: string]: string };
  isBackgroundSession?: boolean;
  autoMode?: boolean;
  modelAutoMode?: boolean;
  explicitModelId?: string;
  roleModelOverrides?: { [role: string]: string };
  useStoredKeys?: boolean;
  // ACS overrides for agent configuration (including agent_cwd_override)
  acsOverrides?: {
    agent_cwd_override?: string; // 🎯 CRITICAL: Working directory override for agent execution
    [key: string]: unknown; // Other overrides
  };
  overrides?: {
    model_id?: string;
    provider_name?: string;
    system_prompt?: string;
    enabled_tool_groups?: string[];
    enabled_tools?: string[];
    disabled_tools?: string[];
  };
  // Model parameters for auto mode and single model selection
  modelParams?: {
    autoMode?: boolean;
    modelAutoMode?: boolean;
    roleModelOverrides?: { [role: string]: string };
    explicitModelId?: string;
  };
  // Auto mode boolean flags from NewDraftModal
  auto_mode?: boolean;
  model_auto_mode?: boolean;
}

export interface BackgroundWorkerStep {
  name: string;
  weight: number; // For progress calculation
}

const BACKGROUND_STEPS: BackgroundWorkerStep[] = [
  { name: "worktree_creation", weight: 40 },
  { name: "agent_cwd_update", weight: 20 },
  { name: "first_message_send", weight: 40 },
];

/**
 * Start background session operations after obtaining the real session ID
 * Runs worktree creation, agent_cwd update, and first message send asynchronously
 */
export async function startBackgroundSessionOps(
  sessionId: string,
  options: SessionBackgroundWorkerOptions
): Promise<void> {
  console.log(
    `[sessionBackgroundWorker] options.auto_mode: ${options.auto_mode} - options.model_auto_mode: ${options.model_auto_mode}`
  );
  const {
    agentConfigId,
    userId,
    projectRoot,
    originalProjectPath,
    firstMessage,
    skipWorkspacePreparation,
    enableWorktrees,
    repoContext, // For backend provisioning (StartChat flow)
    onProgress,
    onError,
    onComplete,
    // Extended ACS parameters
    modelApiKeys = {},
    templateVariables = {},
    isBackgroundSession = true, // Default to true for background worker
    explicitModelId,
    roleModelOverrides = {},
    useStoredKeys = true,
    acsOverrides = {},
    overrides = {},
    // Auto mode boolean flags from NewDraftModal
    autoMode = false,
    modelAutoMode = false,
  } = options;
  console.log(
    `[sessionBackgroundWorker] auto_mode: ${autoMode} - model_auto_mode: ${modelAutoMode}`
  );

  // Log repo context for backend provisioning (StartChat flow)
  if (repoContext) {
    console.log(
      `[sessionBackgroundWorker] Repo context provided for backend provisioning:`,
      repoContext
    );
  }

  // Compute skipPrep: prioritize explicit skipWorkspacePreparation, otherwise derive from enableWorktrees
  const skipPrep =
    typeof skipWorkspacePreparation === "boolean"
      ? skipWorkspacePreparation
      : typeof enableWorktrees === "boolean"
        ? !enableWorktrees
        : false;

  console.log(
    `[sessionBackgroundWorker] skipPrep: ${skipPrep} (skipWorkspacePreparation: ${skipWorkspacePreparation}, enableWorktrees: ${enableWorktrees})`
  );

  // Log role model overrides for debugging
  if (Object.keys(roleModelOverrides).length > 0) {
    console.log(
      "🔧 [sessionBackgroundWorker] Using role model overrides:",
      roleModelOverrides
    );
  }

  let currentProgress = 0;
  const totalWeight = BACKGROUND_STEPS.reduce(
    (sum, step) => sum + step.weight,
    0
  );

  const updateProgress = (stepName: string, stepProgress: number) => {
    const step = BACKGROUND_STEPS.find((s) => s.name === stepName);
    if (step && onProgress) {
      const stepWeight = step.weight;
      const progressIncrement = (stepWeight * stepProgress) / 100;
      const totalProgress = Math.min(
        100,
        ((currentProgress + progressIncrement) / totalWeight) * 100
      );
      onProgress(stepName, totalProgress);
    }
  };

  const completeStep = (stepName: string) => {
    const step = BACKGROUND_STEPS.find((s) => s.name === stepName);
    if (step) {
      currentProgress += step.weight;
      if (onProgress) {
        onProgress(stepName, (currentProgress / totalWeight) * 100);
      }
    }
  };

  try {
    // Helper function to resolve workspace (worktree or fallback)
    async function resolveWorkspace(
      sessionId: string,
      originalPath: string
    ): Promise<string> {
      let resolved = originalPath;
      const isGit = await isGitRepo(originalPath);

      if (isGit) {
        try {
          resolved = await taskOrchestration.prepareTaskWorkspace(
            sessionId,
            originalPath
          );
          console.log(
            `✅ [SessionBackgroundWorker] Worktree created: ${resolved}`
          );
        } catch (error) {
          if (error instanceof Error && error.message.includes("DIRTY_REPO")) {
            // Propagate dirty repo error via onError callback
            throw error;
          }

          // If isolation mode is enabled, don't fall back silently - surface the error
          if (enableWorktrees) {
            console.error(
              "[SessionBackgroundWorker] Worktree creation failed in isolation mode, aborting",
              error
            );
            throw new Error(`Failed to create isolated workspace: ${error}`);
          }

          // Fall back silently to originalPath only when isolation is disabled
          console.warn(
            "[SessionBackgroundWorker] Worktree creation failed, fallback to original path",
            error
          );
          resolved = originalPath;
        }
      } else {
        console.log(
          `✅ [SessionBackgroundWorker] Non-git path, using original: ${originalPath}`
        );
      }
      return resolved;
    }

    // Step 1: Resolve workspace (if project root provided and workspace preparation not skipped)
    let resolvedCwd: string;
    if (!skipPrep && projectRoot) {
      updateProgress("worktree_creation", 0);

      try {
        resolvedCwd = await resolveWorkspace(sessionId, projectRoot);
        completeStep("worktree_creation");
      } catch (error) {
        if (error instanceof Error && error.message.includes("DIRTY_REPO")) {
          // Propagate dirty repo error via onError callback
          onError?.(error, "worktree_creation");
          return; // Stop processing on dirty repo
        }
        throw error; // Re-throw other errors
      }
    } else {
      // Skip workspace preparation - use original project root
      resolvedCwd = projectRoot || "/workspace";
      completeStep("worktree_creation");
    }

    // Step 2: Update agent_cwd in session
    updateProgress("agent_cwd_update", 0);

    try {
      await taskOrchestration.updateTaskCwd(sessionId, resolvedCwd);
      console.log(
        `✅ [SessionBackgroundWorker] agent_cwd updated to: ${resolvedCwd}`
      );

      // Set base_dir to the original project path if provided
      if (originalProjectPath) {
        await taskOrchestration.setSessionBaseDir(
          sessionId,
          originalProjectPath
        );
        console.log(
          `✅ [SessionBackgroundWorker] base_dir set to original project path: ${originalProjectPath}`
        );
      }

      completeStep("agent_cwd_update");
    } catch (error) {
      // Swallow agent_cwd update errors but log them
      console.warn("[SessionBackgroundWorker] agent_cwd update failed:", error);
      completeStep("agent_cwd_update");
    }

    // Step 3: Send first message (if provided)
    console.log(
      "[SessionBackgroundWorker] Sending first message:",
      JSON.stringify(firstMessage)
    );
    if (firstMessage) {
      updateProgress("first_message_send", 0);

      const messageParams: SendChatMessageParams = {
        sessionId,
        message: firstMessage,
        userId,
        agentConfigName: "general", // debug
        acsClient: getDefaultACSClient(),
        sessionData: {
          agent_cwd: resolvedCwd, // Pass cwd to hook context
        },
        acsOverrides: {
          ...(acsOverrides || {}),
          // Only set agent_cwd_override if not already provided in acsOverrides
          ...(acsOverrides?.agent_cwd_override
            ? {}
            : { agent_cwd_override: resolvedCwd }),
        },
        // Pass through extended ACS parameters
        modelApiKeys,
        templateVariables,
        isBackgroundSession,
        // Use auto_mode and model_auto_mode from NewDraftModal if provided, otherwise fall back to existing values
        autoMode,
        modelAutoMode,
        explicitModelId,
        roleModelOverrides,
        useStoredKeys,
        overrides,
        images: options.images || [], // Always include images array, even if empty
        // Spread model params if provided
        ...options.modelParams,
      };
      console.log(
        `[SessionBackgroundWorker][sendChatMessage] Sending auto_mode: ${autoMode}, model_auto_mode: ${modelAutoMode}`
      );

      const result =
        await taskOrchestration.sendInitialTaskMessage(messageParams);

      if (!result.success) {
        throw new Error(`First message send failed: ${result.error}`);
      }

      completeStep("first_message_send");
    } else {
      // Skip first message
      completeStep("first_message_send");
    }

    // All steps completed successfully
    onComplete?.(sessionId);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    onError?.(errorObj, "background_worker");
  }
}
