/**
 * TypeScript interfaces for Worktree operations
 * Mirrors the Rust types from worktree_manager.rs
 */

export interface WorktreeMeta {
  session_id: string;
  branch: string;
  path: string;
  base_commit: string;
  created_at: string;
}
export type FinalizeResultResponse = FinalizeResult;

export type FinalizeResult =
  | { status: 'merged'; commit: string; project_root?: string }
  | { status: 'needs_merge'; worktree_path: string; conflicted_files: string[]; project_root?: string }
  | { status: 'no_changes'; project_root?: string }
  | { status: 'DirtyRepo'; project_root?: string };

export interface CreateWorktreeResponse {
  workspace_path: string;
  session_id: string;
  branch: string;
  project_root?: string; // Optional: the user-supplied project root where .orchestra was created
}

export interface WorktreeError {
  message: string;
  code?: string;
}
export interface MergePreviewFileChange {
  path: string;
  status: 'A' | 'M' | 'D' | 'R' | string;
  additions: number;
  deletions: number;
}
export interface MergePreviewSummary {
  base: string;
  target: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  changes: MergePreviewFileChange[];
}

export interface MergePreviewFileChange {
  path: string;
  status: 'A' | 'M' | 'D' | 'R' | string;
  additions: number;
  deletions: number;
}
export interface MergePreviewSummary {
  base: string;
  target: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  changes: MergePreviewFileChange[];
}
