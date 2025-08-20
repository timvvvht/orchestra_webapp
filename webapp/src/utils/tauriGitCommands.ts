/**
 * Tauri Git Commands Utility
 * 
 * This module provides TypeScript wrappers for Tauri git commands
 * to replace Node.js child_process.execSync calls in SimpleNodeJsBackend.
 */

import { isTauri } from '@/utils/runtime';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("Tauri invoke not available in web environment");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export interface GitCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code?: number;
}

/**
 * Initialize a git repository in the .orchestra directory
 */
export async function gitInit(cwd: string, workspaceOverride?: string): Promise<GitCommandResult> {
  return await tauriInvoke('simple_git_init', { cwd: workspaceOverride || cwd });
}

/**
 * Check if a git repository exists in the .orchestra directory
 */
export async function gitHasRepository(cwd: string, workspaceOverride?: string): Promise<boolean> {
  return await tauriInvoke('simple_git_has_repository', { cwd: workspaceOverride || cwd });
}

/**
 * Get the current commit hash
 */
export async function gitGetCurrentCommit(cwd: string, workspaceOverride?: string): Promise<string | null> {
  return await tauriInvoke('simple_git_get_current_commit', { cwd: workspaceOverride || cwd });
}

/**
 * Get git log history
 */
export async function gitGetHistory(cwd: string, limit?: number, workspaceOverride?: string): Promise<GitCommandResult> {
  return await tauriInvoke('simple_git_get_history', { cwd: workspaceOverride || cwd, limit });
}

/**
 * Add all files to git staging area
 */
export async function gitAddAll(cwd: string, workspaceOverride?: string): Promise<GitCommandResult> {
  return await tauriInvoke('simple_git_add_all', { cwd: workspaceOverride || cwd });
}

/**
 * Check if there are staged changes
 */
export async function gitHasStagedChanges(cwd: string, workspaceOverride?: string): Promise<boolean> {
  return await tauriInvoke('simple_git_has_staged_changes', { cwd: workspaceOverride || cwd });
}

/**
 * Create a git commit
 */
export async function gitCommit(cwd: string, message: string, workspaceOverride?: string): Promise<GitCommandResult> {
  return await tauriInvoke('simple_git_commit', { cwd: workspaceOverride || cwd, message });
}

/**
 * Get git diff between commits or commit and working tree
 */
export async function gitDiff(cwd: string, fromSha: string, toSha?: string, workspaceOverride?: string): Promise<GitCommandResult> {
  return await tauriInvoke('simple_git_diff', { cwd: workspaceOverride || cwd, fromSha, toSha });
}

/**
 * Reset git repository to a specific commit
 */
export async function gitResetHard(cwd: string, sha: string, workspaceOverride?: string): Promise<GitCommandResult> {
  return await tauriInvoke('simple_git_reset_hard', { cwd: workspaceOverride || cwd, sha });
}

/**
 * Show file content at a specific commit
 */
export async function gitShowFile(cwd: string, sha: string, filePath: string, workspaceOverride?: string): Promise<GitCommandResult> {
  console.log('🔧 [tauriGitCommands] gitShowFile called:', {
    cwd,
    sha,
    filePath,
    workspaceOverride,
    command: 'simple_git_show_file'
  });
  
  try {
    const result = await tauriInvoke('simple_git_show_file', { 
      cwd: workspaceOverride || cwd, 
      sha, 
      filePath 
    });
    
    // Don't treat empty stdout as failure - empty files are valid!
    // Git returns success=true with empty stdout for files that don't exist in that commit
    const success = result.success;
    
    console.log('📥 [tauriGitCommands] gitShowFile result:', {
      success,
      stdoutLength: result.stdout.length,
      stderr: result.stderr,
      exit_code: result.exit_code,
      stdoutPreview: result.stdout.substring(0, 100) + (result.stdout.length > 100 ? '...' : ''),
      isEmptyFile: result.stdout.length === 0,
      actualSuccess: result.success
    });
    
    return {
      ...result,
      success
    };
  } catch (error) {
    console.error('❌ [tauriGitCommands] gitShowFile failed:', {
      cwd,
      sha,
      filePath,
      workspaceOverride,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      stdout: '',
      stderr: `gitShowFile failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Copy files from workspace to .orchestra directory
 */
export async function gitSyncWorkspaceToOrchestra(cwd: string, workspaceOverride?: string): Promise<boolean> {
  return await tauriInvoke('simple_git_sync_workspace_to_orchestra', { cwd: workspaceOverride || cwd });
}

/**
 * Copy files from .orchestra directory back to workspace
 */
export async function gitSyncOrchestraToWorkspace(cwd: string, workspaceOverride?: string): Promise<boolean> {
  return await tauriInvoke('simple_git_sync_orchestra_to_workspace', { cwd: workspaceOverride || cwd });
}

/**
 * Execute a git command and return the stdout as string (for compatibility)
 * This mimics the behavior of execSync().toString()
 */
export async function execGitCommand(args: string[], cwd: string): Promise<string> {
  // Map common git commands to our specific functions
  if (args.length === 0) {
    throw new Error('No git command specified');
  }

  const command = args[0];
  
  switch (command) {
    case 'init':
      const initResult = await gitInit(cwd);
      if (!initResult.success) {
        throw new Error(`Git init failed: ${initResult.stderr}`);
      }
      return initResult.stdout;

    case 'rev-parse':
      if (args[1] === 'HEAD') {
        const commit = await gitGetCurrentCommit(cwd);
        return commit || '';
      }
      break;

    case 'add':
      if (args[1] === '.') {
        const addResult = await gitAddAll(cwd);
        if (!addResult.success) {
          throw new Error(`Git add failed: ${addResult.stderr}`);
        }
        return addResult.stdout;
      }
      break;

    case 'diff':
      if (args.includes('--cached') && args.includes('--quiet')) {
        const hasChanges = await gitHasStagedChanges(cwd);
        if (hasChanges) {
          throw new Error('There are staged changes'); // This mimics non-zero exit code
        }
        return '';
      } else if (args.length >= 2) {
        const fromSha = args[1];
        const toSha = args.length > 2 ? args[2] : undefined;
        const diffResult = await gitDiff(cwd, fromSha, toSha);
        if (!diffResult.success) {
          throw new Error(`Git diff failed: ${diffResult.stderr}`);
        }
        return diffResult.stdout;
      }
      break;

    case 'commit':
      const messageIndex = args.indexOf('-m');
      if (messageIndex !== -1 && messageIndex + 1 < args.length) {
        const message = args[messageIndex + 1];
        const commitResult = await gitCommit(cwd, message);
        if (!commitResult.success) {
          throw new Error(`Git commit failed: ${commitResult.stderr}`);
        }
        return commitResult.stdout;
      }
      break;

    case 'reset':
      if (args[1] === '--hard' && args.length >= 3) {
        const sha = args[2];
        const resetResult = await gitResetHard(cwd, sha);
        if (!resetResult.success) {
          throw new Error(`Git reset failed: ${resetResult.stderr}`);
        }
        return resetResult.stdout;
      }
      break;

    case 'show':
      if (args.length >= 2) {
        const showRef = args[1];
        const [sha, filePath] = showRef.split(':');
        if (sha && filePath) {
          const showResult = await gitShowFile(cwd, sha, filePath);
          if (!showResult.success) {
            throw new Error(`Git show failed: ${showResult.stderr}`);
          }
          return showResult.stdout;
        }
      }
      break;

    case 'log':
      const limitMatch = args.find(arg => arg.startsWith('-n'));
      const limit = limitMatch ? parseInt(limitMatch.substring(2)) : 50;
      const logResult = await gitGetHistory(cwd, limit);
      if (!logResult.success) {
        throw new Error(`Git log failed: ${logResult.stderr}`);
      }
      return logResult.stdout;

    case 'config':
      if (args.length >= 3) {
        // Git config commands are handled during init, so just return success
        return '';
      }
      break;
  }

  throw new Error(`Unsupported git command: ${args.join(' ')}`);
}