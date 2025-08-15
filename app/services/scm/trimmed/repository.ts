/**
 * Trimmed Repository - Core Git Operations Only
 * Removed: VS Code UI integration, events, decorations, watchers, remotes, submodules
 * Kept: Essential init, add, commit, diff, reset, log operations with robust error handling
 */

import * as path from 'path';
import * as fs from 'fs';
import { Git, IExecutionResult } from './git';
import { Commit, Change, Status, LogOptions, CommitOptions, GitError } from './types';
import { 
  isDescendant, 
  pathEquals, 
  relativePath, 
  normalizeGitPath, 
  denormalizeGitPath,
  exists,
  stat,
  readfile,
  mkdirp
} from './util';

export class Repository {
  private _git: Git;
  private _root: string;

  constructor(git: Git, repositoryRoot: string) {
    this._git = git;
    this._root = repositoryRoot;
  }

  get root(): string {
    return this._root;
  }

  // Initialize repository
  async init(): Promise<void> {
    await this._git.exec(this._root, ['init']);
    await this.setConfig('user.name', 'Orchestra');
    await this.setConfig('user.email', 'orchestra@local');
  }

  // Set git config
  async setConfig(key: string, value: string): Promise<void> {
    await this._git.exec(this._root, ['config', key, value]);
  }

  // Get git config
  async getConfig(key: string): Promise<string> {
    try {
      const result = await this._git.exec(this._root, ['config', '--get', key]);
      return result.stdout.trim();
    } catch {
      return '';
    }
  }

  // Add files to staging area
  async add(paths: string[]): Promise<void> {
    const args = ['add'];
    
    if (paths.length === 0) {
      args.push('.');
    } else {
      args.push(...paths.map(p => relativePath(this._root, p)));
    }

    await this._git.exec(this._root, args);
  }

  // Commit staged changes
  async commit(message: string, opts: CommitOptions = {}): Promise<string> {
    const args = ['commit'];
    
    if (opts.all === true) {
      args.push('--all');
    } else if (opts.all === 'tracked') {
      args.push('--all');
    }

    if (opts.amend) {
      args.push('--amend');
    }

    if (opts.signoff) {
      args.push('--signoff');
    }

    if (opts.signCommit) {
      args.push('-S');
    }

    if (opts.empty) {
      args.push('--allow-empty');
    }

    if (opts.noVerify) {
      args.push('--no-verify');
    }

    args.push('-m', message);

    try {
      await this._git.exec(this._root, args);
      return await this.getHEAD();
    } catch (err) {
      if (err instanceof GitError && (err.stderr?.includes('nothing to commit') || err.stdout?.includes('nothing to commit'))) {
        return 'no-changes';
      }
      throw err;
    }
  }

  // Get current HEAD commit hash
  async getHEAD(): Promise<string> {
    try {
      const result = await this._git.exec(this._root, ['rev-parse', 'HEAD']);
      return result.stdout.trim();
    } catch {
      return '';
    }
  }

  // Get commit log
  async log(options: LogOptions = {}): Promise<Commit[]> {
    const maxEntries = options.maxEntries ?? 32;
    const args = ['log', `--max-count=${maxEntries}`, '--format=fuller', '--parents', '--'];
    
    if (options.path) {
      args.push(options.path);
    }

    try {
      const result = await this._git.exec(this._root, args);
      return this.parseCommits(result.stdout);
    } catch {
      return [];
    }
  }

  // Parse commit log output
  private parseCommits(data: string): Commit[] {
    const commits: Commit[] = [];
    const lines = data.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      
      if (line.startsWith('commit ')) {
        const parts = line.split(' ');
        const hash = parts[1];
        const parents = parts.slice(2);
        
        let message = '';
        let authorName = '';
        let authorEmail = '';
        let authorDate: Date | undefined;
        let commitDate: Date | undefined;

        i++;
        
        // Parse commit details
        while (i < lines.length && !lines[i].startsWith('commit ')) {
          const detailLine = lines[i];
          
          if (detailLine.startsWith('Author:')) {
            const match = detailLine.match(/Author:\s*(.+?)\s*<(.+?)>/);
            if (match) {
              authorName = match[1];
              authorEmail = match[2];
            }
          } else if (detailLine.startsWith('AuthorDate:')) {
            authorDate = new Date(detailLine.substring(11).trim());
          } else if (detailLine.startsWith('CommitDate:')) {
            commitDate = new Date(detailLine.substring(11).trim());
          } else if (detailLine.startsWith('    ')) {
            message += detailLine.substring(4) + '\n';
          }
          
          i++;
        }

        commits.push({
          hash,
          message: message.trim(),
          parents,
          authorName,
          authorEmail,
          authorDate,
          commitDate
        });
      } else {
        i++;
      }
    }

    return commits;
  }

  // Get diff between commits or working tree
  async diff(cached?: boolean): Promise<string>;
  async diff(ref: string): Promise<string>;
  async diff(ref1: string, ref2: string): Promise<string>;
  async diff(ref1?: string | boolean, ref2?: string): Promise<string> {
    const args = ['diff'];

    if (typeof ref1 === 'boolean') {
      if (ref1) {
        args.push('--cached');
      }
    } else if (typeof ref1 === 'string') {
      if (ref2) {
        args.push(`${ref1}..${ref2}`);
      } else {
        args.push(ref1);
      }
    }

    try {
      const result = await this._git.exec(this._root, args);
      return result.stdout;
    } catch {
      return '';
    }
  }

  // Get diff for specific file
  async diffFile(filePath: string, ref1?: string, ref2?: string): Promise<string> {
    const args = ['diff'];
    
    if (ref1 && ref2) {
      args.push(`${ref1}..${ref2}`);
    } else if (ref1) {
      args.push(ref1);
    }
    
    args.push('--', relativePath(this._root, filePath));

    try {
      const result = await this._git.exec(this._root, args);
      return result.stdout;
    } catch {
      return '';
    }
  }

  // Reset to specific commit
  async reset(treeish: string, hard?: boolean): Promise<void> {
    const args = ['reset'];
    
    if (hard) {
      args.push('--hard');
    }
    
    args.push(treeish);
    
    await this._git.exec(this._root, args);
  }

  // Clean working directory
  async clean(paths: string[]): Promise<void> {
    const args = ['clean', '-f', '-q'];
    
    if (paths.length > 0) {
      args.push(...paths.map(p => relativePath(this._root, p)));
    } else {
      args.push('.');
    }

    await this._git.exec(this._root, args);
  }

  // Get file content at specific commit
  async show(object: string, filePath?: string): Promise<string> {
    const args = ['show'];
    
    if (filePath) {
      args.push(`${object}:${normalizeGitPath(relativePath(this._root, filePath))}`);
    } else {
      args.push(object);
    }

    try {
      const result = await this._git.exec(this._root, args);
      return result.stdout;
    } catch {
      return '';
    }
  }

  // Get repository status
  async getStatus(): Promise<Change[]> {
    const args = ['status', '--porcelain=v1', '-z'];
    
    try {
      const result = await this._git.exec(this._root, args);
      return this.parseStatus(result.stdout);
    } catch {
      return [];
    }
  }

  // Parse git status output
  private parseStatus(raw: string): Change[] {
    const changes: Change[] = [];
    const entries = raw.split('\0').filter(entry => entry.length > 0);

    for (const entry of entries) {
      if (entry.length < 3) continue;

      const x = entry[0];
      const y = entry[1];
      const filePath = entry.substring(3);

      let status: Status;
      let originalUri = filePath;
      let renameUri: string | undefined;

      // Handle renames
      if (x === 'R' || y === 'R') {
        const parts = filePath.split('\0');
        if (parts.length === 2) {
          originalUri = parts[1];
          renameUri = parts[0];
          status = Status.INDEX_RENAMED;
        } else {
          originalUri = filePath;
          status = this.parseStatusCode(x, y);
        }
      } else {
        status = this.parseStatusCode(x, y);
      }

      const uri = renameUri || originalUri;
      const fullPath = path.resolve(this._root, uri);

      changes.push({
        uri: fullPath,
        originalUri: path.resolve(this._root, originalUri),
        renameUri: renameUri ? path.resolve(this._root, renameUri) : undefined,
        status
      });
    }

    return changes;
  }

  // Parse status code to Status enum
  private parseStatusCode(x: string, y: string): Status {
    switch (x + y) {
      case 'M ': case ' M': case 'MM': return Status.MODIFIED;
      case 'A ': case ' A': case 'AM': return Status.INDEX_ADDED;
      case 'D ': case ' D': case 'AD': return Status.DELETED;
      case 'R ': case ' R': return Status.INDEX_RENAMED;
      case 'C ': case ' C': return Status.INDEX_COPIED;
      case 'DD': return Status.BOTH_DELETED;
      case 'AU': case 'UD': return Status.ADDED_BY_US;
      case 'UA': case 'DU': return Status.ADDED_BY_THEM;
      case 'AA': return Status.BOTH_ADDED;
      case 'UU': return Status.BOTH_MODIFIED;
      case '??': return Status.UNTRACKED;
      case '!!': return Status.IGNORED;
      default:
        if (x === 'M') return Status.INDEX_MODIFIED;
        if (x === 'A') return Status.INDEX_ADDED;
        if (x === 'D') return Status.INDEX_DELETED;
        if (x === 'R') return Status.INDEX_RENAMED;
        if (x === 'C') return Status.INDEX_COPIED;
        return Status.UNTRACKED;
    }
  }

  // Check if path is ignored
  async isIgnored(filePath: string): Promise<boolean> {
    try {
      await this._git.exec(this._root, ['check-ignore', relativePath(this._root, filePath)]);
      return true;
    } catch {
      return false;
    }
  }

  // Get branches
  async getBranches(): Promise<string[]> {
    try {
      const result = await this._git.exec(this._root, ['branch', '--format=%(refname:short)']);
      return result.stdout.split('\n').filter(line => line.trim().length > 0);
    } catch {
      return [];
    }
  }

  // Get current branch
  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this._git.exec(this._root, ['branch', '--show-current']);
      return result.stdout.trim();
    } catch {
      return 'main';
    }
  }

  // Check if repository exists
  static async exists(repositoryRoot: string): Promise<boolean> {
    const gitDir = path.join(repositoryRoot, '.git');
    return await exists(gitDir);
  }

  // Open existing repository
  static async open(git: Git, repositoryRoot: string): Promise<Repository> {
    const exists = await Repository.exists(repositoryRoot);
    if (!exists) {
      throw new Error(`Repository does not exist at ${repositoryRoot}`);
    }
    return new Repository(git, repositoryRoot);
  }

  // Create new repository
  static async create(git: Git, repositoryRoot: string): Promise<Repository> {
    await mkdirp(repositoryRoot);
    const repository = new Repository(git, repositoryRoot);
    await repository.init();
    return repository;
  }
}