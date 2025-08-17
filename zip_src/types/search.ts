/**
 * Search result interface for the search functionality
 */
export interface SearchResult {
  id: string;
  path: string;
  title: string;
  score: number;
  snippet?: string;
}

/**
 * Indexing progress information
 */
export interface IndexingProgress {
  current_phase: string;
  total_items: number;
  processed_items: number;
  is_complete: boolean;
  changed_items: number;
  elapsed_ms: number;
}