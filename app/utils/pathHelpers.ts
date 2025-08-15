/**
 * Path utilities for handling Git worktrees and directory display
 */

import * as path from 'path';

/**
 * Returns the base directory for display purposes:
 * - If cwd is inside a Git worktree, returns the base directory (before /worktrees/)
 * - Otherwise returns the original path
 * 
 * Examples:
 * - "/repo/.git/worktrees/feature-abc" → "/repo"
 * - "/repo/worktrees/feature-abc" → "/repo"
 * - "/regular/path" → "/regular/path"
 * - null/undefined → null
 */
export const baseDirFromCwd = (cwd?: string | null): string | null => {
  if (!cwd) return null;

  // Normalize ~ and /home/<user> paths
  const normalized = cwd.replace(/^~/, '').replace(/^\/home\/[^/]+/, '~');

  // Detect .git/worktrees/<name> OR /worktrees/<name>
  // Patterns we handle:
  //   /repo/.git/worktrees/feature-abc
  //   /repo/worktrees/feature-abc
  const match = normalized.match(/^(.*?)(?:\/\.git)?\/worktrees\/[^/]+/);
  if (match) {
    // Return everything before the worktree segment, strip trailing slash
    return match[1].replace(/\/$/, '');
  }

  // Not a worktree path, return as-is
  return normalized;
};

/**
 * Convert relative path to absolute path within worktree
 * Handles leading/trailing slashes and normalizes the result
 * 
 * @param worktreeRoot - Absolute path to worktree root
 * @param relativePath - Relative path within worktree
 * @returns Normalized absolute path
 */
export function toWorktreeAbsPath(worktreeRoot: string, relativePath: string): string {
  // Remove trailing slash from worktree root if present
  const cleanWorktreeRoot = worktreeRoot.replace(/\/$/, '');
  
  // Remove leading slash from relative path if present
  const cleanRelativePath = relativePath.replace(/^\//, '');
  
  // Join and normalize
  return path.normalize(`${cleanWorktreeRoot}/${cleanRelativePath}`);
}

/**
 * Shortens an absolute path for compact header display.
 * Example: /Users/tim/Code/orchestra/.orchestra/worktrees/abc → ~/…/worktrees/abc
 */
export function formatPathForHeader(absPath: string): string {
  if (!absPath) return '';
  const home = window?.process?.env?.HOME || '';
  let out = absPath;
  if (home && absPath.startsWith(home)) out = '~' + absPath.slice(home.length);
  // Collapse middle segments if >5 levels deep
  const parts = out.split('/').filter(Boolean);
  if (parts.length > 6) {
    return parts.slice(0, 2).join('/') + '/…/' + parts.slice(-2).join('/');
  }
  return out;
}