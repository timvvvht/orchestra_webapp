import { invoke } from '@tauri-apps/api/core';
import { SearchResult, IndexingProgress } from '../types/search';

/**
 * Performance tracking utility for measuring frontend operations
 */
export const perfTracker = {
  timers: new Map<string, number>(),
  results: [] as { label: string; duration: number; timestamp: number; info: string }[],

  start(label: string) {
    this.timers.set(label, performance.now());
    console.log(`Starting timer: ${label}`);
  },

  end(label: string, info: string = '') {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer ${label} not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Store the result
    this.results.push({
      label,
      duration,
      timestamp: Date.now(),
      info
    });

    console.log(`${label} took ${duration.toFixed(2)}ms ${info ? `(${info})` : ''}`);
    this.timers.delete(label);

    return duration;
  },

  getResults(label?: string) {
    if (label) {
      return this.results.filter(r => r.label === label);
    }
    return this.results;
  },

  clear() {
    this.results = [];
    this.timers.clear();
    console.log('Performance tracker cleared');
  }
};

/**
 * Search documents using BM25 algorithm
 * @param query The search query string
 * @param limit Maximum number of results to return
 * @returns Array of search results sorted by relevance
 */
export async function searchDocuments(query: string, limit: number = 20): Promise<SearchResult[]> {
  // Skip in browser environment - search functionality not available
  if (!(window as any).__TAURI__) {
    console.log('[searchApi] Skipping searchDocuments: not running inside Tauri runtime');
    return [];
  }

  perfTracker.start('searchDocuments');
  try {
    const results = await invoke<SearchResult[]>('search_documents', { query, limit });
    perfTracker.end('searchDocuments', `query: "${query}", found: ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error searching documents:', error);
    perfTracker.end('searchDocuments', `FAILED for query: "${query}"`);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get all indexed files for client-side filtering
 * @returns Array of all indexed files
 */
export async function getAllIndexedFiles(): Promise<SearchResult[]> {
  // Skip in browser environment - search functionality not available
  if (!(window as any).__TAURI__) {
    console.log('[searchApi] Skipping getAllIndexedFiles: not running inside Tauri runtime');
    return [];
  }

  perfTracker.start('getAllIndexedFiles');
  try {
    const results = await invoke<SearchResult[]>('get_all_indexed_files');
    perfTracker.end('getAllIndexedFiles', `found: ${results.length} files`);
    return results;
  } catch (error) {
    console.error('Error getting all indexed files:', error);
    perfTracker.end('getAllIndexedFiles', 'FAILED');
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get the total number of documents in the search index
 * @returns Number of indexed documents
 */
export async function getSearchIndexDocCount(): Promise<number> {
  // Skip in browser environment - search functionality not available
  if (!(window as any).__TAURI__) {
    console.log('[searchApi] Skipping getSearchIndexDocCount: not running inside Tauri runtime');
    return 0;
  }

  perfTracker.start('getSearchIndexDocCount');
  try {
    const count = await invoke<number>('get_search_index_doc_count');
    perfTracker.end('getSearchIndexDocCount', `count: ${count} documents`);
    return count;
  } catch (error) {
    console.error('Error getting search index document count:', error);
    perfTracker.end('getSearchIndexDocCount', 'FAILED');
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get the current indexing progress
 * @returns Current indexing progress information
 */
export async function getIndexingProgress(): Promise<IndexingProgress> {
  // Skip in browser environment - search functionality not available
  if (!(window as any).__TAURI__) {
    console.log('[searchApi] Skipping getIndexingProgress: not running inside Tauri runtime');
    return {
      current_phase: 'idle',
      is_complete: true,
      total_files: 0,
      processed_files: 0,
      current_file: null
    };
  }

  perfTracker.start('getIndexingProgress');
  try {
    const progress = await invoke<IndexingProgress>('get_indexing_progress');
    perfTracker.end('getIndexingProgress', `phase: ${progress.current_phase}, complete: ${progress.is_complete}`);
    return progress;
  } catch (error) {
    console.error('Error getting indexing progress:', error);
    perfTracker.end('getIndexingProgress', 'FAILED');
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Force reindex of all markdown files
 * @returns A promise that resolves when the reindexing has started
 */
export async function forceReindexMarkdownFiles(): Promise<string> {
  // Skip in browser environment - search functionality not available
  if (!(window as any).__TAURI__) {
    console.log('[searchApi] Skipping forceReindexMarkdownFiles: not running inside Tauri runtime');
    return 'Reindexing not available in browser environment';
  }

  perfTracker.start('forceReindexMarkdownFiles');
  try {
    const result = await invoke<string>('force_reindex_markdown_files');
    perfTracker.end('forceReindexMarkdownFiles');
    return result;
  } catch (error) {
    console.error('Error starting reindexing:', error);
    perfTracker.end('forceReindexMarkdownFiles', 'FAILED');
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}