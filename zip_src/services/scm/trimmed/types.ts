/**
 * Trimmed SCM Types - Core Git Operations Only
 * Removed: VS Code UI types, SourceControl, decorations, events
 * Kept: Essential git status, commit, and change types
 */

export interface CommitShortStat {
        readonly files: number;
        readonly insertions: number;
        readonly deletions: number;
}

export interface Commit {
  readonly hash: string;
  readonly message: string;
  readonly parents: string[];
  readonly authorDate?: Date;
  readonly authorName?: string;
  readonly authorEmail?: string;
  readonly commitDate?: Date;
  readonly shortStat?: CommitShortStat;
}

export interface Change {
  /**
   * Returns either `originalUri` or `renameUri`, depending
   * on whether this change is a rename change. When
   * in doubt, use this. It will always return a valid uri.
   */
  readonly uri: string;
  readonly originalUri: string;
  readonly renameUri: string | undefined;
  readonly status: Status;
}

export const enum Status {
  INDEX_MODIFIED,
  INDEX_ADDED,
  INDEX_DELETED,
  INDEX_RENAMED,
  INDEX_COPIED,

  MODIFIED,
  DELETED,
  UNTRACKED,
  IGNORED,
  INTENT_TO_ADD,

  ADDED_BY_US,
  ADDED_BY_THEM,
  DELETED_BY_US,
  DELETED_BY_THEM,
  BOTH_ADDED,
  BOTH_DELETED,
  BOTH_MODIFIED
}

export interface LogOptions {
  /** Max number of log entries to retrieve. If not specified, the default is 32. */
  readonly maxEntries?: number;
  readonly path?: string;
}

export interface CommitOptions {
  all?: boolean | 'tracked';
  amend?: boolean;
  signoff?: boolean;
  signCommit?: boolean;
  empty?: boolean;
  noVerify?: boolean;
  requireUserConfig?: boolean;
  useEditor?: boolean;
  verbose?: boolean;
  /**
   * string    - execute the specified command after the commit operation
   * undefined - execute the command specified in git config sequence.editor
   * null      - do not execute any command after the commit operation
   */
  postCommitCommand?: string | null;
}

export interface GitErrorData {
  error?: Error;
  message?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  gitErrorCode?: string;
  gitCommand?: string;
  gitArgs?: string[];
}

export class GitError {
  error?: Error;
  message: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  gitErrorCode?: string;
  gitCommand?: string;
  gitArgs?: string[];

  constructor(data: GitErrorData) {
    if (data.error) {
      this.error = data.error;
      this.message = data.error.message;
    } else {
      this.message = data.message || '';
    }

    this.stdout = data.stdout;
    this.stderr = data.stderr;
    this.exitCode = data.exitCode;
    this.gitErrorCode = data.gitErrorCode;
    this.gitCommand = data.gitCommand;
    this.gitArgs = data.gitArgs;
  }

  toString(): string {
    let result = this.message;

    if (this.stderr) {
      result += `\n${this.stderr}`;
    }

    if (this.stdout) {
      result += `\n${this.stdout}`;
    }

    return result;
  }
}

export interface PushOptions {
  remote?: string;
  refspec?: string;
  setUpstream?: boolean;
  force?: boolean;
  forcePushMode?: ForcePushMode;
  tags?: boolean;
  followTags?: boolean;
}

export const enum ForcePushMode {
  Force,
  ForceWithLease,
  ForceWithLeaseIfIncludes
}

export interface BranchQuery {
  readonly remote?: boolean;
  readonly pattern?: string;
  readonly count?: number;
}

export const enum RefType {
        Head,
        RemoteHead,
        Tag
}

export interface Ref {
        readonly type: RefType;
        readonly name?: string;
        readonly commit?: string;
        readonly remote?: string;
}

export interface UpstreamRef {
        readonly remote: string;
        readonly name: string;
}

export interface Branch extends Ref {
        readonly upstream?: UpstreamRef;
        readonly ahead?: number;
        readonly behind?: number;
}
