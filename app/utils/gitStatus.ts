import { invoke } from '@tauri-apps/api/core';
import type { RepoStatusEntry } from './gitTypes';

/**
 * Call rust tauri command `git_repo_status_porcelain` and return list of entries.
 * @param project_root Absolute path to repo root
 */
export async function getRepoPorcelainStatus(project_root: string): Promise<RepoStatusEntry[]> {
    console.log(`[GitStatus] Fetching porcelain status for ${project_root}`);
    console.log(`[GitStatus] About to invoke 'git_repo_status_porcelain' with projectRoot:`, project_root);
    
    try {
        const result = await invoke<RepoStatusEntry[]>('git_repo_status_porcelain', { projectRoot: project_root });
        console.log(`[GitStatus][Porcelain] Raw result from Tauri:`, result);
        console.log(`[GitStatus][Porcelain] Result type:`, typeof result);
        console.log(`[GitStatus][Porcelain] Result length:`, Array.isArray(result) ? result.length : 'not an array');
        
        if (Array.isArray(result)) {
            console.log(`[GitStatus][Porcelain] Individual entries:`);
            result.forEach((entry, index) => {
                console.log(`  [${index}] status: "${entry.status}", path: "${entry.path}"`);
            });
        }
        
        return result;
    } catch (error) {
        console.error(`[GitStatus][Porcelain] Error invoking git_repo_status_porcelain:`, error);
        throw error;
    }
}
