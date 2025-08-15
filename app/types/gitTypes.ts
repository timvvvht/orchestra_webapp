/**
 * Git-related TypeScript types for the DirtyRepo merge flow
 */

export interface RepoStatusEntry {
  status: string; // e.g. "M", "A", "D", "??"
  path: string;   // relative file path from repo root
}

export interface GitFileStatus {
  path: string;
  status:
    | "M"
    | "A"
    | "D"
    | "R"
    | "??"
    | "MM"
    | "AM"
    | "AD"
    | "DM"
    | "RM"
    | "UU";
}

export interface GitStatusResponse {
  files: GitFileStatus[];
}

export interface GitDiffResponse {
  diff: string;
}

export interface GitCommitResponse {
  commitHash: string;
}

export interface GitStageRequest {
  project_root: string;
  files: string[];
}

export interface GitCommitRequest {
  project_root: string;
  message: string;
}

export interface GitStashRequest {
  project_root: string;
}

export interface GitDiscardRequest {
  project_root: string;
  files: string[];
}

export interface GitDiffRequest {
  project_root: string;
  filePath: string;
}

export interface GitStatusRequest {
  project_root: string;
}

export interface StageResult {
  files: string[];
}

export interface DiffStats {
  filesChanged: number;
  additions: number;
  deletions: number;
  earliestHash: string;
  latestHash: string;
}
