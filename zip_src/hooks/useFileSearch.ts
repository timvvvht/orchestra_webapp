/**
 * React Hook for File Search
 * 
 * Provides debounced file searching with loading states and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchFiles, SearchMatch, FileSearchArgs } from '@/lib/tauri/fileSelector';

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
  
  // Use ref to track the latest search to avoid race conditions
  const searchIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Debug logging for options changes
  useEffect(() => {
    console.log('🔍 [useFileSearch] options changed:', {
      query,
      limit,
      codePath,
      debounceMs,
      minQueryLength
    });
  }, [query, limit, codePath, debounceMs, minQueryLength]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const performSearch = useCallback(async (searchQuery: string, searchId: number) => {
    if (!mountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const searchArgs: FileSearchArgs = {
        query: searchQuery,
        limit,
        codePath,
      };

      console.log('🔍 [useFileSearch] performSearch called with:', {
        query: searchQuery,
        limit,
        codePath,
        searchId
      });

      const searchResults = await searchFiles(searchArgs);

      console.log('🔍 [useFileSearch] search results:', {
        query: searchQuery,
        codePath,
        resultCount: searchResults.length,
        results: searchResults.slice(0, 3).map(r => ({ display: r.display, full_path: r.full_path }))
      });

      // Only update state if this is still the latest search
      if (searchId === searchIdRef.current && mountedRef.current) {
        setResults(searchResults);
      }
    } catch (err) {
      if (searchId === searchIdRef.current && mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        setResults([]);
      }
    } finally {
      if (searchId === searchIdRef.current && mountedRef.current) {
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

    // Increment search ID for race condition handling
    const currentSearchId = ++searchIdRef.current;

    const timeoutId = setTimeout(() => {
      performSearch(trimmedQuery, currentSearchId);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, debounceMs, minQueryLength, performSearch]);

  // Search on mount if requested
  useEffect(() => {
    if (searchOnMount && query.trim().length >= minQueryLength) {
      const currentSearchId = ++searchIdRef.current;
      performSearch(query.trim(), currentSearchId);
    }
  }, [searchOnMount, query, minQueryLength, performSearch]);

  const search = useCallback(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= minQueryLength) {
      const currentSearchId = ++searchIdRef.current;
      performSearch(trimmedQuery, currentSearchId);
    }
  }, [query, minQueryLength, performSearch]);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setIsLoading(false);
    searchIdRef.current++;
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