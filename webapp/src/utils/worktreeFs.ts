/**
 * File system utilities for worktree operations
 * Provides safe file I/O operations within Tauri environment
 */

import { isTauri } from '@/utils/runtime';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("Tauri invoke not available in web environment");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/**
 * Ensure we're running in a Tauri environment
 */
function ensureTauri() {
  if (typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window)) {
    throw new Error('File operations require Tauri environment');
  }
}

/**
 * Read file content from absolute path
 * @param absPath - Absolute file path to read
 * @returns Promise resolving to file content as string
 */
export async function readFileAbs(absPath: string): Promise<string> {
  ensureTauri();
  return tauriInvoke<string>('fs_read_file_abs', { path: absPath });
}

/**
 * Write content to file at absolute path
 * @param absPath - Absolute file path to write
 * @param content - Content to write to file
 */
export async function writeFileAbs(absPath: string, content: string): Promise<void> {
  ensureTauri();
  return tauriInvoke<void>('fs_write_file_abs', { path: absPath, contents: content });
}

/**
 * Check if file exists at absolute path
 * @param absPath - Absolute file path to check
 * @returns Promise resolving to true if file exists
 */
export async function existsAbs(absPath: string): Promise<boolean> {
  ensureTauri();
  return tauriInvoke<boolean>('fs_exists_abs', { path: absPath });
}