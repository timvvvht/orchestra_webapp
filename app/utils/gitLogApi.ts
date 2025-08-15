import { invoke } from '@tauri-apps/api/core';

export interface CommitEntry {
    sha: string;
    author: string;
    date: string;
    message: string;
}
// src/utils/gitLogApi.ts  (or whe
// rever this lives)
export interface GitLogParams {
    projectRoot: string; // <-- rename for clarity
    limit?: number;
}

export async function getGitLog(params: GitLogParams): Promise<CommitEntry[]> {
    const { projectRoot, limit = 50 } = params;
    console.log('Fetching git log for', JSON.stringify(params, null, 2));

    try {
        const result = await invoke<CommitEntry[]>('simple_git_log', {
            projectRoot, // <-- must match the backend arg name
            limit
        });
        return result;
    } catch (error) {
        console.error('Error fetching git log:', error);
        throw error;
    }
}
