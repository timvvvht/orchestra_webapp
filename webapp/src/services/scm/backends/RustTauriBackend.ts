/**
 * Rust Tauri Backend - SCM implementation using Rust via Tauri IPC
 * 
 * This backend routes all SCM operations to the Rust implementation
 * via Tauri's invoke API. It provides real SCM functionality when
 * running in a Tauri desktop environment.
 */

import { ScmBackend } from './ScmBackend';
import { Commit } from '../types';

/**
 * Utility function to safely invoke Tauri commands
 */
async function safeInvoke(command: string, args?: any): Promise<any> {
  try {
    console.log(`[RustTauriBackend] safeInvoke called with command: ${command}, args:`, args);
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      console.log(`[RustTauriBackend] Tauri environment detected, invoking ${command}`);
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke(command, args);
      console.log(`[RustTauriBackend] Tauri command ${command} completed with result:`, result);
      return result;
    } else {
      console.error(`[RustTauriBackend] Tauri environment NOT detected! window.__TAURI__ = ${(window as any)?.__TAURI__}`);
      throw new Error(`Tauri commands not available in web environment. Command: ${command}`);
    }
  } catch (error) {
    console.error(`[RustTauriBackend] Failed to invoke Tauri command ${command}:`, error);
    throw error;
  }
}

export class RustTauriBackend implements ScmBackend {
  async hasRepository(cwd: string): Promise<boolean> {
    return await safeInvoke('rust_scm_has_repository', { workspacePath: cwd });
  }

  async getCurrentCommit(cwd: string): Promise<string | null> {
    return await safeInvoke('rust_scm_get_current_commit', { workspacePath: cwd });
  }

  async getHistory(cwd: string, limit: number = 50): Promise<Commit[]> {
    const rustCommits = await safeInvoke('rust_scm_get_history', { workspacePath: cwd, limit });
    
    // Convert Rust SCMCommit format to TypeScript Commit format
    return rustCommits.map((rustCommit: any) => ({
      hash: rustCommit.hash,
      message: rustCommit.message,
      parents: [], // Rust implementation doesn't currently expose parents
      authorDate: new Date(rustCommit.timestamp),
      authorName: rustCommit.author,
      authorEmail: undefined, // Not exposed by Rust implementation yet
      commitDate: new Date(rustCommit.timestamp),
    }));
  }

  async checkpoint(cwd: string, message: string): Promise<string> {
    console.log(`[RustTauriBackend] Calling rust_scm_checkpoint with cwd: ${cwd}, message: ${message}`);
    const result = await safeInvoke('rust_scm_checkpoint', { workspacePath: cwd, message });
    
    // Handle "no-changes" case
    if (result === 'no-changes') {
      // Get current commit if no changes
      const currentCommit = await this.getCurrentCommit(cwd);
      return currentCommit || 'no-changes';
    }
    
    return result;
  }

  async diff(cwd: string, fromSha: string, toSha?: string): Promise<string> {
    return await safeInvoke('rust_scm_diff', { 
      workspacePath: cwd, 
      fromSha: fromSha, 
      toSha: toSha || null 
    });
  }

  async revert(cwd: string, sha: string): Promise<void> {
    await safeInvoke('rust_scm_revert', { workspacePath: cwd, sha });
  }

  async getFileAtCommit(cwd: string, sha: string, filePath: string): Promise<string> {
    // This would need to be implemented in the Rust backend
    // For now, throw an error indicating it's not yet supported
    throw new Error('getFileAtCommit not yet implemented in Rust backend');
  }

  async initializeRepository(cwd: string): Promise<void> {
    // The Rust backend automatically initializes repositories on first use
    // We can trigger this by calling checkpoint with a dummy message
    try {
      await this.checkpoint(cwd, 'Initialize repository');
    } catch (error) {
      // If checkpoint fails, the repository might already be initialized
      // or there might be no files to commit. This is acceptable.
      console.log('Repository initialization via checkpoint completed or was already initialized');
    }
  }

  getBackendType(): string {
    return 'RustTauri';
  }

  isRealBackend(): boolean {
    return true;
  }

  dispose(): void {
    // No cleanup needed for Tauri backend
  }
}