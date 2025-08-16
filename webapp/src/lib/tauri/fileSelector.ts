/**
 * File Selector TypeScript Bridge
 *
 * Provides a clean interface to the Rust file_selector_search command
 * for finding files across vault and code paths with fuzzy matching.
 */

import { invoke } from '@tauri-apps/api/core';

/** Mirrors the Rust struct SearchMatch */
export interface SearchMatch {
    /** Display name (filename only) for UI */
    display: string;
    /** Full absolute path to the file */
    full_path: string;
    /** Fuzzy match score (higher is better) */
    score: number;
    /** Relative path from search root for context */
    relative_path: string;
}

/** Arguments for file selector search */
export interface FileSearchArgs {
    /** Search query (can be empty to return no results) */
    query: string;
    /** Maximum number of results to return (default 20, max 100) */
    limit?: number;
    /** Optional code path to include in search (e.g., session's agent_cwd) */
    codePath?: string;
}

/**
 * Search files across vault and code paths using fuzzy matching
 *
 * @param args Search parameters
 * @returns Promise resolving to array of SearchMatch results, sorted by relevance
 */
export async function searchFiles(args: FileSearchArgs): Promise<SearchMatch[]> {
    const { query, limit = 20, codePath } = args;

    // Handle non-Tauri environments (Storybook, Jest, etc.)
    if (!isTauriRuntime()) {
        console.warn('[fileSelector] Not running in Tauri environment, returning mock results');
        return getMockResults(query, limit);
    }

    try {
        console.log('🔍 [fileSelector] Calling Tauri command with:', {
            query: query.trim(),
            limit: Math.min(limit, 100),
            codePath: codePath
        });

        // Call the renamed Rust command
        const results = await invoke<SearchMatch[]>('file_selector_search', {
            query: query.trim(),
            limit: Math.min(limit, 100), // Enforce max limit
            codePath: codePath // Pass the optional code path to Rust (camelCase - Tauri converts to snake_case)
        });

        console.log('🔍 [fileSelector] Tauri command returned:', {
            query: query.trim(),
            codePath: codePath,
            resultCount: results.length,
            firstFewResults: results.slice(0, 3).map(r => ({ display: r.display, full_path: r.full_path }))
        });

        return results;
    } catch (error) {
        console.error('[fileSelector] Search failed:', error);
        throw new Error(`File search failed: ${error}`);
    }
}

/**
 * Check if we're running in a Tauri environment
 */
function isTauriRuntime(): boolean {
    return typeof (window as any).__TAURI__ !== 'undefined';
}

/**
 * Provide mock results for non-Tauri environments
 */
function getMockResults(query: string, limit: number): SearchMatch[] {
    const mockFiles: SearchMatch[] = [
        {
            display: 'main.rs',
            full_path: '/mock/path/src/main.rs',
            score: 120,
            relative_path: 'src/main.rs'
        },
        {
            display: 'lib.rs',
            full_path: '/mock/path/src/lib.rs',
            score: 110,
            relative_path: 'src/lib.rs'
        },
        {
            display: 'config.toml',
            full_path: '/mock/path/config.toml',
            score: 100,
            relative_path: 'config.toml'
        },
        {
            display: 'README.md',
            full_path: '/mock/path/README.md',
            score: 90,
            relative_path: 'README.md'
        },
        {
            display: 'package.json',
            full_path: '/mock/path/package.json',
            score: 80,
            relative_path: 'package.json'
        },
        {
            display: 'index.tsx',
            full_path: '/mock/path/src/index.tsx',
            score: 75,
            relative_path: 'src/index.tsx'
        },
        {
            display: 'utils.py',
            full_path: '/mock/path/scripts/utils.py',
            score: 70,
            relative_path: 'scripts/utils.py'
        }
    ];

    if (!query.trim()) {
        return [];
    }

    const queryLower = query.toLowerCase();
    return mockFiles.filter(file => file.display.toLowerCase().includes(queryLower) || file.relative_path.toLowerCase().includes(queryLower)).slice(0, limit);
}

/**
 * Utility to format file path for display
 */
export function formatFilePathForDisplay(match: SearchMatch): string {
    return match.relative_path;
}

/**
 * Utility to get file extension from SearchMatch
 */
export function getFileExtension(match: SearchMatch): string {
    const parts = match.display.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Utility to determine if a file is likely a code file
 */
export function isCodeFile(match: SearchMatch): boolean {
    const codeExtensions = ['rs', 'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'swift', 'kt', 'scala', 'clj', 'hs'];
    const ext = getFileExtension(match).toLowerCase();
    return codeExtensions.includes(ext);
}

/**
 * Utility to determine if a file is likely a config file
 */
export function isConfigFile(match: SearchMatch): boolean {
    const configExtensions = ['toml', 'yaml', 'yml', 'json', 'xml', 'ini', 'conf', 'config'];
    const configNames = ['dockerfile', 'makefile', 'rakefile', 'gemfile'];

    const ext = getFileExtension(match).toLowerCase();
    const name = match.display.toLowerCase();

    return configExtensions.includes(ext) || configNames.includes(name);
}

/**
 * Utility to determine if a file is likely documentation
 */
export function isDocumentationFile(match: SearchMatch): boolean {
    const docExtensions = ['md', 'txt', 'rst', 'adoc'];
    const ext = getFileExtension(match).toLowerCase();
    return docExtensions.includes(ext);
}
