import { invoke } from '@tauri-apps/api/core';

/**
 * Result from saving markdown to vault
 */
export interface SavedPath {
    full_path: string;
    relative_path: string;
}

/**
 * Save markdown content to the local vault directory at the specified relative path
 * @param relativePath - Relative path within vault (e.g., "guides/react/intro" or "guides/react/intro.md")
 * @param markdown - Markdown content to save
 * @returns Promise<SavedPath> - Both full path and vault-relative path to the saved file
 */
export async function saveMarkdownToVault(relativePath: string, markdown: string): Promise<SavedPath> {
    console.log('[vault] saveMarkdownToVault', { relativePath, markdown });
    const out = await invoke<SavedPath>('save_markdown_to_vault', {
        relativePath,
        content: markdown
    });
    console.log('[vault] saveMarkdownToVault', { out });
    return out;
}

/**
 * Check if we're running in Tauri (desktop) environment
 */
export function isTauriEnvironment(): boolean {
    return !!(window as any).__TAURI__;
}
