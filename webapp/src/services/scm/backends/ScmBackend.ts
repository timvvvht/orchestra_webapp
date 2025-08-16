/**
 * SCM Backend Interface - Abstraction for different SCM implementations
 * 
 * This interface defines the contract that all SCM backends must implement.
 * Backends can be Rust-based (via Tauri IPC), Node.js-based (child_process),
 * or mock implementations for testing.
 */

import { Commit } from '../types';

export interface ScmBackend {
  /**
   * Check if a repository exists for the given workspace
   */
  hasRepository(cwd: string): Promise<boolean>;

  /**
   * Get the current commit hash for the workspace
   */
  getCurrentCommit(cwd: string): Promise<string | null>;

  /**
   * Get commit history for the workspace
   */
  getHistory(cwd: string, limit?: number): Promise<Commit[]>;

  /**
   * Create a checkpoint (commit) for the workspace
   */
  checkpoint(cwd: string, message: string): Promise<string>;

  /**
   * Get diff between two commits or between a commit and working tree
   */
  diff(cwd: string, fromSha: string, toSha?: string): Promise<string>;

  /**
   * Revert workspace to a specific commit
   */
  revert(cwd: string, sha: string): Promise<void>;

  /**
   * Get file content at a specific commit
   */
  getFileAtCommit(cwd: string, sha: string, filePath: string): Promise<string>;

  /**
   * Initialize a repository for the workspace if it doesn't exist
   */
  initializeRepository(cwd: string): Promise<void>;

  /**
   * Get the backend type for debugging/UI purposes
   */
  getBackendType(): string;

  /**
   * Check if this backend provides real SCM operations (vs mocks)
   */
  isRealBackend(): boolean;

  /**
   * Dispose of any resources held by the backend
   */
  dispose(): void;
}