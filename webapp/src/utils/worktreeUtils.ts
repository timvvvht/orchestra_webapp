/**
 * Utility functions for worktree path manipulation
 */

/**
 * Derives the main repository root from a worktree path
 * @param worktreePath - Path to a worktree (e.g., /path/to/repo/.orchestra/worktrees/session-id)
 * @returns Main repository root path (e.g., /path/to/repo)
 */
export function getRepoRootFromWorktree(worktreePath: string): string {
  // Remove /.orchestra/worktrees/{sessionId} from the end
  const repoRoot = worktreePath.replace(/\/\.orchestra\/worktrees\/[^/]+$/, '');
  
  // Validate that we actually found a worktree pattern
  if (repoRoot === worktreePath) {
    console.warn(`[worktreeUtils] Path doesn't appear to be a worktree: ${worktreePath}`);
    // If it doesn't match the pattern, assume it's already the repo root
    return worktreePath;
  }
  
  return repoRoot;
}

/**
 * Checks if a path appears to be a worktree path
 * @param path - Path to check
 * @returns true if the path contains the worktree pattern
 */
export function isWorktreePath(path: string): boolean {
  return /\/\.orchestra\/worktrees\/[^/]+$/.test(path);
}

/**
 * Extracts the session ID from a worktree path
 * @param worktreePath - Path to a worktree
 * @returns Session ID or null if not found
 */
export function getSessionIdFromWorktree(worktreePath: string): string | null {
  const match = worktreePath.match(/\/\.orchestra\/worktrees\/([^/]+)$/);
  return match ? match[1] : null;
}

/**
 * Extracts the worktree name from a worktree path (alias for getSessionIdFromWorktree)
 * @param cwd - Path to check
 * @returns Worktree name or null if not found
 */
export function getWorktreeName(cwd?: string | null): string | null {
  if (!cwd) return null;
  return getSessionIdFromWorktree(cwd);
}