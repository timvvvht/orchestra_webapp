/**
 * React Hook for File Search - Webapp Stub Implementation
 * 
 * This is a stub implementation for the webapp migration. The original desktop
 * version used Tauri for file system access, which is not available in webapps.
 * 
 * TODO: Implement web-based file search if needed (via API endpoints)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Stub interface matching the desktop version
export interface SearchMatch {
  display: string;
  full_path: string;
  // Add other properties as needed
}

export interface UseFileSearchOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Maximum number of results (default: 20) */
  limit?: number;
  /** Minimum query length to trigger search (default: 1) */
  minQueryLength?: number;
  /** Whether to search immediately on mount if query is provided (default: false) */
  searchOnMount?: boolean;
  /** Optional code path to include in search (e.g., session's agent_cwd) */
  codePath?: string;
}

export interface UseFileSearchResult {
  /** Current search results */
  results: SearchMatch[];
  /** Whether a search is currently in progress */
  isLoading: boolean;
  /** Any error that occurred during search */
  error: string | null;
  /** Manually trigger a search with the current query */
  search: () => void;
  /** Clear current results and error */
  clear: () => void;
  /** Whether there are any results */
  hasResults: boolean;
  /** Whether the last search returned no results (but was successful) */
  isEmpty: boolean;
}

/**
 * Hook for searching files with debouncing and state management
 * STUB IMPLEMENTATION - Returns empty results for webapp
 */
export function useFileSearch(
  query: string,
  options: UseFileSearchOptions = {}
): UseFileSearchResult {
  const {
    debounceMs = 300,
    limit = 20,
    minQueryLength = 1,
    searchOnMount = false,
    codePath,
  } = options;

  const [results, setResults] = useState<SearchMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Stub search function - doesn't actually search files
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!mountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 [useFileSearch] STUB: Would search for:', {
        query: searchQuery,
        limit,
        codePath,
        note: 'File search not implemented in webapp - Tauri functionality removed'
      });

      // Simulate brief loading time
      await new Promise(resolve => setTimeout(resolve, 100));

      if (mountedRef.current) {
        // Return empty results for webapp
        setResults([]);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        setResults([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit, codePath]);

  // Debounced search effect
  useEffect(() => {
    const trimmedQuery = query.trim();

    // Clear results if query is too short
    if (trimmedQuery.length < minQueryLength) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(trimmedQuery);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, debounceMs, minQueryLength, performSearch]);

  // Search on mount if requested
  useEffect(() => {
    if (searchOnMount && query.trim().length >= minQueryLength) {
      performSearch(query.trim());
    }
  }, [searchOnMount, query, minQueryLength, performSearch]);

  const search = useCallback(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= minQueryLength) {
      performSearch(trimmedQuery);
    }
  }, [query, minQueryLength, performSearch]);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clear,
    hasResults: results.length > 0,
    isEmpty: !isLoading && !error && results.length === 0 && query.trim().length >= minQueryLength,
  };
}

/**
 * Simplified hook for basic file search without advanced options
 */
export function useSimpleFileSearch(query: string, limit = 20, codePath?: string) {
  return useFileSearch(query, { limit, codePath });
}

/**
 * Hook for file search with custom debounce timing
 */
export function useDebouncedFileSearch(query: string, debounceMs: number, limit = 20, codePath?: string) {
  return useFileSearch(query, { debounceMs, limit, codePath });
}