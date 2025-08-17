/**
 * Orchestra SCM Manager - Trimmed, Production-Ready SCM
 * 
 * Core functionality only:
 * - checkpoint(cwd, message): Create commit snapshot
 * - revert(cwd, sha): Restore to specific commit  
 * - diff(cwd, from, to?): Get diff between commits
 * - history(cwd, limit): Get commit history
 * 
 * Based on VS Code's battle-tested git logic, stripped of all UI/extension dependencies
 */

import * as path from 'path';
import * as fs from 'fs';
import { Git } from './git';
import { Repository } from './repository';
import { Commit } from './types';
import { exists, mkdirp } from './util';

export interface SCMOptions {
  gitPath?: string;
  orchestraDir?: string; // Default: '.orchestra'
}

export class OrchestraSCM {
  private git: Git;
  private repositories: Map<string, Repository> = new Map();
  private orchestraDir: string;

  private constructor(git: Git, options: SCMOptions = {}) {
    this.git = git;
    this.orchestraDir = options.orchestraDir || '.orchestra';
  }

  static async create(options: SCMOptions = {}): Promise<OrchestraSCM> {
    const git = await Git.find();
    return new OrchestraSCM(git, options);
  }

  /**
   * Get or create repository for workspace
   */
  private async getRepository(cwd: string): Promise<Repository> {
    const normalizedCwd = path.resolve(cwd);
    
    if (this.repositories.has(normalizedCwd)) {
      return this.repositories.get(normalizedCwd)!;
    }

    const orchestraPath = path.join(normalizedCwd, this.orchestraDir);
    let repository: Repository;

    if (await Repository.exists(orchestraPath)) {
      repository = await Repository.open(this.git, orchestraPath);
    } else {
      repository = await Repository.create(this.git, orchestraPath);
      
      // Create initial .gitignore to ignore parent .orchestra directory
      const gitignorePath = path.join(orchestraPath, '.gitignore');
      await fs.promises.writeFile(gitignorePath, '# Orchestra SCM\n', 'utf8');
    }

    this.repositories.set(normalizedCwd, repository);
    return repository;
  }

  /**
   * Sync workspace files to orchestra directory
   */
  private async syncWorkspace(cwd: string): Promise<void> {
    const normalizedCwd = path.resolve(cwd);
    const orchestraPath = path.join(normalizedCwd, this.orchestraDir);
    
    // Copy all files from workspace to orchestra directory, excluding .orchestra itself
    await this.copyDirectory(normalizedCwd, orchestraPath, [this.orchestraDir, '.git']);
  }

  /**
   * Copy directory recursively with exclusions
   */
  private async copyDirectory(src: string, dest: string, exclude: string[] = []): Promise<void> {
    await mkdirp(dest);
    
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      if (exclude.includes(entry.name)) {
        continue;
      }
      
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath, exclude);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Restore files from orchestra directory to workspace
   */
  private async restoreWorkspace(cwd: string): Promise<void> {
    const normalizedCwd = path.resolve(cwd);
    const orchestraPath = path.join(normalizedCwd, this.orchestraDir);
    
    // Remove all files in workspace except .orchestra
    const entries = await fs.promises.readdir(normalizedCwd, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === this.orchestraDir) {
        continue;
      }
      
      const entryPath = path.join(normalizedCwd, entry.name);
      if (entry.isDirectory()) {
        await fs.promises.rm(entryPath, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(entryPath);
      }
    }
    
    // Copy files from orchestra directory back to workspace
    const orchestraEntries = await fs.promises.readdir(orchestraPath, { withFileTypes: true });
    for (const entry of orchestraEntries) {
      if (entry.name === '.git' || entry.name === '.gitignore') {
        continue;
      }
      
      const srcPath = path.join(orchestraPath, entry.name);
      const destPath = path.join(normalizedCwd, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Create a checkpoint (commit) of current workspace state
   */
  async checkpoint(cwd: string, message: string): Promise<string> {
    const repository = await this.getRepository(cwd);
    
    // Sync workspace to orchestra directory
    await this.syncWorkspace(cwd);
    
    // Add all changes and commit
    await repository.add([]);
    const commitHash = await repository.commit(message, { all: true });
    
    if (commitHash === 'no-changes') {
      return 'no-changes';
    }
    
    return commitHash;
  }

  /**
   * Revert workspace to specific commit
   */
  async revert(cwd: string, commitSha: string): Promise<void> {
    const repository = await this.getRepository(cwd);
    
    // Reset repository to specified commit
    await repository.reset(commitSha, true);
    
    // Restore workspace from orchestra directory
    await this.restoreWorkspace(cwd);
  }

  /**
   * Get diff between commits or working tree
   */
  async diff(cwd: string, fromSha?: string, toSha?: string): Promise<string> {
    const repository = await this.getRepository(cwd);
    
    // Sync current workspace state
    await this.syncWorkspace(cwd);
    
    if (!fromSha && !toSha) {
      // Diff working tree vs HEAD
      return await repository.diff();
    } else if (fromSha && !toSha) {
      // Diff specific commit vs working tree
      return await repository.diff(fromSha);
    } else if (fromSha && toSha) {
      // Diff between two commits
      return await repository.diff(fromSha, toSha);
    } else {
      return '';
    }
  }

  /**
   * Get commit history
   */
  async history(cwd: string, limit: number = 32): Promise<Commit[]> {
    try {
      const repository = await this.getRepository(cwd);
      return await repository.log({ maxEntries: limit });
    } catch {
      return [];
    }
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit(cwd: string): Promise<string | null> {
    try {
      const repository = await this.getRepository(cwd);
      const head = await repository.getHEAD();
      return head || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if repository exists for workspace
   */
  async hasRepository(cwd: string): Promise<boolean> {
    const normalizedCwd = path.resolve(cwd);
    const orchestraPath = path.join(normalizedCwd, this.orchestraDir);
    return await Repository.exists(orchestraPath);
  }

  /**
   * Get file content at specific commit
   */
  async getFileAtCommit(cwd: string, commitSha: string, filePath: string): Promise<string> {
    try {
      const repository = await this.getRepository(cwd);
      const normalizedCwd = path.resolve(cwd);
      const normalizedFilePath = path.resolve(filePath);
      const relativePath = path.relative(normalizedCwd, normalizedFilePath);
      return await repository.show(commitSha, relativePath);
    } catch {
      return '';
    }
  }

  /**
   * Clean up repository cache
   */
  dispose(): void {
    this.repositories.clear();
  }
}