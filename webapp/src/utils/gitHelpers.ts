/**
 * Git repository helper functions
 */

import type { RepoStatusEntry } from "./gitTypes";
import { isTauri } from "./environment";

async function tauriInvoke<T>(cmd: string, args?: any): Promise<T> {
  if (!isTauri()) {
    throw new Error("Tauri invoke not available in web environment");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/**
 * Check if a directory is a Git repository by looking for .git folder
 * @param projectRoot - Path to the project directory
 * @returns Promise<boolean> - true if .git folder exists, false otherwise
 */
export async function isGitRepo(projectRoot: string): Promise<boolean> {
  try {
    const gitPath = `${projectRoot.replace(/\/$/, "")}/.git`;
    if (!isTauri()) {
      // In web, we cannot check local FS; assume not a git repo
      return false;
    }
    return await tauriInvoke<boolean>("file_exists", { path: gitPath });
  } catch (e) {
    console.warn("[gitHelpers.isGitRepo] Fallback false due to error:", e);
    return false;
  }
}

export async function fetchRepoStatus(cwd: string): Promise<RepoStatusEntry[]> {
  if (!cwd) throw new Error("No cwd provided");
  if (!isTauri()) {
    // Web fallback: no porcelain available
    return [];
  }
  try {
    return await tauriInvoke<RepoStatusEntry[]>("git_repo_status_porcelain", {
      projectRoot: cwd,
    });
  } catch (err) {
    throw new Error(`GitStatusFailure: ${String(err)}`);
  }
}

export interface GitStatusCounts {
  modified: number;
  added: number;
  deleted: number;
  untracked: number;
}
export function classifyGitStatuses(
  entries: RepoStatusEntry[]
): GitStatusCounts {
  const c: GitStatusCounts = {
    modified: 0,
    added: 0,
    deleted: 0,
    untracked: 0,
  };
  for (const { status } of entries) {
    const s = status.trim();
    if (s === "M" || s.includes("M")) c.modified++;
    else if (s === "A") c.added++;
    else if (s.startsWith("??")) c.untracked++;
    else if (s === "D" || s.includes("D")) c.deleted++;
  }
  return c;
}
