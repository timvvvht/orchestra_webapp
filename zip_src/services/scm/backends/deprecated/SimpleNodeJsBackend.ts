/**
 * Simple Node.js Backend - SCM implementation using Tauri git commands
 * 
 * This backend implements SCM operations using Tauri commands that execute
 * git operations in the Rust backend. This is compatible with Tauri v2 and
 * replaces the previous child_process.execSync implementation.
 */

import * as path from 'path';
import * as fs from 'fs';
import { ScmBackend } from '../ScmBackend';
import { Commit } from '../../types';
import { 
  gitInit, 
  gitHasRepository, 
  gitGetCurrentCommit, 
  gitGetHistory, 
  gitAddAll, 
  gitHasStagedChanges, 
  gitCommit, 
  gitDiff, 
  gitResetHard, 
  gitShowFile, 
  gitSyncWorkspaceToOrchestra, 
  gitSyncOrchestraToWorkspace 
} from '../../../../utils/tauriGitCommands';

export class SimpleNodeJsBackend implements ScmBackend {
  async hasRepository(cwd: string): Promise<boolean> {
    const normalizedCwd = path.resolve(cwd);
    return await gitHasRepository(normalizedCwd);
  }

  async getCurrentCommit(cwd: string): Promise<string | null> {
    try {
      const normalizedCwd = path.resolve(cwd);
      return await gitGetCurrentCommit(normalizedCwd);
    } catch (error) {
      return null;
    }
  }

  async getHistory(cwd: string, limit: number = 50): Promise<Commit[]> {
    try {
      const normalizedCwd = path.resolve(cwd);
      const result = await gitGetHistory(normalizedCwd, limit);

      if (!result.success || !result.stdout.trim()) return [];

      return result.stdout.trim().split('\n').map(line => {
        const [hash, message, author, date] = line.split('|');
        return {
          hash,
          message,
          parents: [], // Could be enhanced to get parents
          authorDate: new Date(date),
          authorName: author,
          authorEmail: undefined,
          commitDate: new Date(date),
        };
      });
    } catch (error) {
      return [];
    }
  }

  async checkpoint(cwd: string, message: string): Promise<string> {
    const normalizedCwd = path.resolve(cwd);
    
    try {
      // Copy all files from workspace to .orchestra (excluding .orchestra itself)
      await gitSyncWorkspaceToOrchestra(normalizedCwd);
      
      // Stage all changes
      await gitAddAll(normalizedCwd);
      
      // Check if there are any changes to commit
      const hasChanges = await gitHasStagedChanges(normalizedCwd);
      if (!hasChanges) {
        // No changes to commit, return current commit
        return await this.getCurrentCommit(cwd) || 'no-changes';
      }
      
      // Commit with timestamp and message
      const commitMessage = `${message}\n\nTimestamp: ${new Date().toISOString()}`;
      const commitResult = await gitCommit(normalizedCwd, commitMessage);
      
      if (!commitResult.success) {
        throw new Error(`Git commit failed: ${commitResult.stderr}`);
      }
      
      // Get the new commit hash
      const hash = await gitGetCurrentCommit(normalizedCwd);
      
      if (!hash) {
        throw new Error('Failed to get commit hash after successful commit');
      }
      
      console.log(`[SimpleNodeJsBackend] Created commit ${hash.substring(0, 8)} in ${cwd}: ${message}`);
      return hash;
    } catch (error) {
      console.error(`[SimpleNodeJsBackend] Failed to create checkpoint:`, error);
      throw error;
    }
  }

  async diff(cwd: string, fromSha: string, toSha?: string): Promise<string> {
    try {
      const normalizedCwd = path.resolve(cwd);
      const result = await gitDiff(normalizedCwd, fromSha, toSha);
      
      if (!result.success) {
        console.error(`[SimpleNodeJsBackend] Failed to get diff:`, result.stderr);
        return '';
      }
      
      return result.stdout;
    } catch (error) {
      console.error(`[SimpleNodeJsBackend] Failed to get diff:`, error);
      return '';
    }
  }

  async revert(cwd: string, sha: string): Promise<void> {
    try {
      const normalizedCwd = path.resolve(cwd);
      const result = await gitResetHard(normalizedCwd, sha);
      
      if (!result.success) {
        throw new Error(`Git reset failed: ${result.stderr}`);
      }
      
      // Sync the reverted state back to workspace
      await gitSyncOrchestraToWorkspace(normalizedCwd);
    } catch (error) {
      console.error(`[SimpleNodeJsBackend] Failed to revert:`, error);
      throw error;
    }
  }

  async getFileAtCommit(cwd: string, sha: string, filePath: string): Promise<string> {
    try {
      const normalizedCwd = path.resolve(cwd);
      const result = await gitShowFile(normalizedCwd, sha, filePath);
      
      if (!result.success) {
        console.error(`[SimpleNodeJsBackend] Failed to get file at commit:`, result.stderr);
        return '';
      }
      
      return result.stdout;
    } catch (error) {
      console.error(`[SimpleNodeJsBackend] Failed to get file at commit:`, error);
      return '';
    }
  }

  async initializeRepository(cwd: string): Promise<void> {
    const normalizedCwd = path.resolve(cwd);
    
    try {
      // Create .orchestra directory if it doesn't exist
      const orchestraDir = path.join(normalizedCwd, '.orchestra');
      if (!fs.existsSync(orchestraDir)) {
        fs.mkdirSync(orchestraDir, { recursive: true });
      }

      // Initialize git repository in .orchestra directory if needed
      const hasRepo = await gitHasRepository(normalizedCwd);
      if (!hasRepo) {
        const result = await gitInit(normalizedCwd);
        if (!result.success) {
          throw new Error(`Git init failed: ${result.stderr}`);
        }
        console.log(`[SimpleNodeJsBackend] Initialized repository in ${orchestraDir}`);
      }
    } catch (error) {
      console.error(`[SimpleNodeJsBackend] Failed to initialize repository:`, error);
      throw error;
    }
  }

  getBackendType(): string {
    return 'SimpleNodeJs';
  }

  isRealBackend(): boolean {
    return true;
  }

  dispose(): void {
    // No cleanup needed
  }

  private getOrchestraDir(cwd: string): string {
    return path.join(path.resolve(cwd), '.orchestra');
  }
}