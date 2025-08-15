/**
 * Git repository helper functions
 */
import { invoke } from '@tauri-apps/api/core';
import type { RepoStatusEntry } from './gitTypes';

/**
 * Check if a directory is a Git repository by looking for .git folder
 * @param projectRoot - Path to the project directory
 * @returns Promise<boolean> - true if .git folder exists, false otherwise
 */
export async function isGitRepo(projectRoot: string): Promise<boolean> {
    const gitPath = `${projectRoot.replace(/\/$/, '')}/.git`;
    return await invoke('file_exists', { path: gitPath });
}

export async function fetchRepoStatus(cwd: string): Promise<RepoStatusEntry[]> {
    try {
        console.log(`[GitStatus][PORCELAIN] Fetching porcelain status for ${cwd}`);
        if (!cwd) throw new Error('No cwd provided');
        const result = await invoke<RepoStatusEntry[]>('git_repo_status_porcelain', { projectRoot: cwd });
        console.log(`[GitStatus][PORCELAIN] Fetching porcelain status result for ${result}`);
        return result;
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
export function classifyGitStatuses(entries: RepoStatusEntry[]): GitStatusCounts {
    const c: GitStatusCounts = { modified: 0, added: 0, deleted: 0, untracked: 0 };
    for (const { status } of entries) {
        const s = status.trim();
        if (s === 'M' || s.includes('M')) c.modified++;
        else if (s === 'A') c.added++;
        else if (s.startsWith('??')) c.untracked++;
        else if (s === 'D' || s.includes('D')) c.deleted++;
    }
    return c;
}
