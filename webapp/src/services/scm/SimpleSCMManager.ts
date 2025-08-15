/**
 * Simple SCM Manager - MVP Implementation
 * 
 * Provides 3 core functionalities:
 * 1. checkpoint(cwd, message) - Create a commit
 * 2. diff(cwd, fromSha, toSha) - Get diff between commits  
 * 3. revert(cwd, sha) - Revert to a specific commit
 * 
 * Uses simple Node.js child_process for Git operations
 * No VS Code dependencies - pure Node.js implementation
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync, spawn } from 'child_process';
import { promisify } from 'util';

export interface SCMCommit {
  hash: string;
  message: string;
  timestamp: Date;
  author: string;
}

export interface SCMDiff {
  filePath: string;
  oldContent: string;
  newContent: string;
  diffText: string;
}

export class SimpleSCMManager {
  private repositories: Map<string, string> = new Map(); // cwd -> .orchestra path

  /**
   * Initialize .orchestra repository for a workspace
   */
  private async initializeRepo(cwd: string): Promise<string> {
    const normalizedCwd = path.resolve(cwd);
    
    // Check if the workspace directory exists
    if (!fs.existsSync(normalizedCwd)) {
      throw new Error(`Workspace directory does not exist: ${normalizedCwd}`);
    }
    
    if (this.repositories.has(normalizedCwd)) {
      return this.repositories.get(normalizedCwd)!;
    }

    const orchestraDir = path.join(normalizedCwd, '.orchestra');
    
    // Create .orchestra directory if it doesn't exist
    if (!fs.existsSync(orchestraDir)) {
      fs.mkdirSync(orchestraDir, { recursive: true });
    }

    // Initialize git repository if needed
    const gitDir = path.join(orchestraDir, '.git');
    if (!fs.existsSync(gitDir)) {
      try {
        execSync('git init', { cwd: orchestraDir, stdio: 'pipe' });
        
        // Configure git user (required for commits)
        execSync('git config user.name "Orchestra SCM"', { cwd: orchestraDir, stdio: 'pipe' });
        execSync('git config user.email "scm@orchestra.local"', { cwd: orchestraDir, stdio: 'pipe' });
        
        console.log(`[SCM] Initialized repository in ${orchestraDir}`);
      } catch (error) {
        throw new Error(`Failed to initialize git repository: ${error}`);
      }
    }

    this.repositories.set(normalizedCwd, orchestraDir);
    return orchestraDir;
  }

  /**
   * Copy workspace files to .orchestra directory (excluding .orchestra itself)
   * Handles both additions/modifications and deletions
   */
  private async syncWorkspaceFiles(cwd: string, orchestraDir: string): Promise<void> {
    // First, remove files from .orchestra that no longer exist in workspace
    const removeDeletedFiles = (orchestraSrc: string, workspaceSrc: string) => {
      if (!fs.existsSync(orchestraSrc)) return;
      
      const stat = fs.statSync(orchestraSrc);
      
      if (stat.isDirectory()) {
        // Skip .git directory
        if (path.basename(orchestraSrc) === '.git') return;
        
        // If workspace directory doesn't exist, remove the entire orchestra directory
        if (!fs.existsSync(workspaceSrc)) {
          fs.rmSync(orchestraSrc, { recursive: true, force: true });
          return;
        }
        
        const orchestraEntries = fs.readdirSync(orchestraSrc);
        for (const entry of orchestraEntries) {
          if (entry === '.git') continue;
          removeDeletedFiles(
            path.join(orchestraSrc, entry), 
            path.join(workspaceSrc, entry)
          );
        }
      } else if (stat.isFile()) {
        // If workspace file doesn't exist, remove from orchestra
        if (!fs.existsSync(workspaceSrc)) {
          fs.unlinkSync(orchestraSrc);
        }
      }
    };

    const copyRecursive = (src: string, dest: string) => {
      if (!fs.existsSync(src)) return;
      
      const stat = fs.statSync(src);
      
      if (stat.isDirectory()) {
        // Skip .orchestra directory to avoid recursion
        if (path.basename(src) === '.orchestra') return;
        
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          if (entry === '.orchestra') continue; // Skip .orchestra
          copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else if (stat.isFile()) {
        fs.copyFileSync(src, dest);
      }
    };

    // Step 1: Remove deleted files from .orchestra
    const orchestraEntries = fs.existsSync(orchestraDir) ? fs.readdirSync(orchestraDir) : [];
    for (const entry of orchestraEntries) {
      if (entry === '.git') continue;
      removeDeletedFiles(
        path.join(orchestraDir, entry),
        path.join(cwd, entry)
      );
    }

    // Step 2: Copy all workspace files to .orchestra directory
    const workspaceEntries = fs.readdirSync(cwd);
    for (const entry of workspaceEntries) {
      if (entry === '.orchestra') continue; // Skip .orchestra directory
      const srcPath = path.join(cwd, entry);
      const destPath = path.join(orchestraDir, entry);
      copyRecursive(srcPath, destPath);
    }
  }

  /**
   * 1. CHECKPOINT - Create a commit with current workspace state
   */
  async checkpoint(cwd: string, message: string): Promise<string> {
    // Initialize repo first (this will throw if workspace doesn't exist)
    const orchestraDir = await this.initializeRepo(cwd);
    
    try {
      // Sync workspace files to .orchestra directory
      await this.syncWorkspaceFiles(cwd, orchestraDir);
      
      // Stage all changes
      execSync('git add .', { cwd: orchestraDir, stdio: 'pipe' });
      
      // Check if there are any changes to commit
      try {
        execSync('git diff --cached --quiet', { cwd: orchestraDir, stdio: 'pipe' });
        // No changes to commit
        console.log(`[SCM] No changes to commit in ${cwd}`);
        return 'no-changes';
      } catch {
        // There are changes, proceed with commit
      }
      
      // Create commit with timestamp
      const commitMessage = `${message}\n\nTimestamp: ${new Date().toISOString()}`;
      execSync(`git commit -m "${commitMessage}"`, { cwd: orchestraDir, stdio: 'pipe' });
      
      // Get the commit hash
      const hash = execSync('git rev-parse HEAD', { cwd: orchestraDir, encoding: 'utf8' }).trim();
      
      console.log(`[SCM] Created checkpoint ${hash.substring(0, 8)} in ${cwd}: ${message}`);
      return hash;
    } catch (error) {
      throw new Error(`Checkpoint failed: ${error}`);
    }
  }

  /**
   * 2. DIFF - Get diff between two commits (or commit and working tree)
   */
  async diff(cwd: string, fromSha: string, toSha?: string): Promise<string> {
    try {
      const orchestraDir = await this.initializeRepo(cwd);
      
      let diffCommand: string;
      if (toSha) {
        diffCommand = `git diff ${fromSha} ${toSha}`;
      } else {
        // Diff from commit to current working tree
        await this.syncWorkspaceFiles(cwd, orchestraDir);
        diffCommand = `git diff ${fromSha}`;
      }
      
      const diffOutput = execSync(diffCommand, { 
        cwd: orchestraDir, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log(`[SCM] Generated diff in ${cwd} from ${fromSha.substring(0, 8)} to ${toSha?.substring(0, 8) || 'working-tree'}`);
      return diffOutput;
    } catch (error) {
      throw new Error(`Diff failed: ${error}`);
    }
  }

  /**
   * 3. REVERT - Revert workspace to a specific commit
   */
  async revert(cwd: string, sha: string): Promise<void> {
    try {
      const orchestraDir = await this.initializeRepo(cwd);
      
      // Hard reset to the specified commit (this is what the test expects)
      execSync(`git reset --hard ${sha}`, { cwd: orchestraDir, stdio: 'pipe' });
      
      // Copy files back from .orchestra to workspace
      await this.restoreWorkspaceFiles(cwd, orchestraDir);
      
      console.log(`[SCM] Reverted ${cwd} to commit ${sha.substring(0, 8)}`);
    } catch (error) {
      throw new Error(`Revert failed: ${error}`);
    }
  }

  /**
   * Copy files from .orchestra directory back to workspace
   */
  private async restoreWorkspaceFiles(cwd: string, orchestraDir: string): Promise<void> {
    // Remove all files in workspace (except .orchestra)
    const entries = fs.readdirSync(cwd);
    for (const entry of entries) {
      if (entry === '.orchestra') continue;
      const entryPath = path.join(cwd, entry);
      const stat = fs.statSync(entryPath);
      
      if (stat.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(entryPath);
      }
    }
    
    // Copy files from .orchestra back to workspace
    const copyRecursive = (src: string, dest: string) => {
      if (!fs.existsSync(src)) return;
      
      const stat = fs.statSync(src);
      
      if (stat.isDirectory()) {
        // Skip .git directory
        if (path.basename(src) === '.git') return;
        
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          if (entry === '.git') continue;
          copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else if (stat.isFile()) {
        fs.copyFileSync(src, dest);
      }
    };

    const orchestraEntries = fs.readdirSync(orchestraDir);
    for (const entry of orchestraEntries) {
      if (entry === '.git') continue;
      const srcPath = path.join(orchestraDir, entry);
      const destPath = path.join(cwd, entry);
      copyRecursive(srcPath, destPath);
    }
  }

  /**
   * Get commit history (bonus utility function)
   */
  async getHistory(cwd: string, limit: number = 10): Promise<SCMCommit[]> {
    try {
      const orchestraDir = await this.initializeRepo(cwd);
      
      const logOutput = execSync(`git log --oneline -n ${limit} --format="%H|%s|%ai|%an"`, {
        cwd: orchestraDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const commits: SCMCommit[] = logOutput.trim().split('\n').map(line => {
        const [hash, message, timestamp, author] = line.split('|');
        return {
          hash,
          message,
          timestamp: new Date(timestamp),
          author
        };
      });
      
      return commits;
    } catch (error) {
      throw new Error(`Get history failed: ${error}`);
    }
  }

  /**
   * Check if repository exists for workspace
   */
  hasRepository(cwd: string): boolean {
    const normalizedCwd = path.resolve(cwd);
    const orchestraDir = path.join(normalizedCwd, '.orchestra');
    const gitDir = path.join(orchestraDir, '.git');
    return fs.existsSync(gitDir);
  }

  /**
   * Get current HEAD commit hash
   */
  async getCurrentCommit(cwd: string): Promise<string | null> {
    try {
      const orchestraDir = await this.initializeRepo(cwd);
      const hash = execSync('git rev-parse HEAD', { 
        cwd: orchestraDir, 
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
      return hash;
    } catch {
      return null; // No commits yet
    }
  }
}