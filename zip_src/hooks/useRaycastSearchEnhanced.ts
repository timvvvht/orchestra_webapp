import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchResult } from '../types/search';
import { searchDocuments, getAllIndexedFiles } from '../api';

/**
 * Enhanced debounce with immediate execution option
 */
function useSmartDebounce<T extends (...args: any[]) => any>(
  callback: T, 
  delay: number,
  immediate: boolean = false
) {
  const timeoutRef = useRef<number | undefined>();
  const lastCallTime = useRef<number>(0);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime.current;
      
      // If immediate and enough time has passed, execute immediately
      if (immediate && timeSinceLastCall > delay) {
        callback(...args);
        lastCallTime.current = now;
      } else {
        // Otherwise debounce
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          callback(...args);
          lastCallTime.current = Date.now();
        }, delay);
      }
    },
    [callback, delay, immediate]
  );

  // Cancel on unmount
  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  return debounced;
}

/**
 * Enhanced search cache with TTL and smart invalidation
 */
class SearchCache {
  private cache = new Map<string, { results: SearchResult[], timestamp: number }>();
  private readonly ttl = 1000 * 60 * 5; // 5 minutes
  
  get(query: string): SearchResult[] | null {
    const cached = this.cache.get(query);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(query);
      return null;
    }
    
    return cached.results;
  }
  
  set(query: string, results: SearchResult[]) {
    this.cache.set(query, { results, timestamp: Date.now() });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  // Intelligent cache warming - pre-fetch likely next queries
  warmCache(currentQuery: string, allFiles: SearchResult[]) {
    if (currentQuery.length >= 2) {
      // Pre-fetch results for query + next likely character
      const likelyNextChars = ['a', 'e', 'i', 'o', 'u', 'n', 't', 's', 'r'];
      likelyNextChars.forEach(char => {
        const nextQuery = currentQuery + char;
        if (!this.cache.has(nextQuery)) {
          // Simulate search for cache warming
          const filtered = this.filterFiles(allFiles, nextQuery);
          this.set(nextQuery, filtered);
        }
      });
    }
  }
  
  private filterFiles(files: SearchResult[], query: string): SearchResult[] {
    const lowerQuery = query.toLowerCase();
    return files
      .filter(file => {
        const titleLower = (file.title || '').toLowerCase();
        const pathLower = (file.path || '').toLowerCase();
        return titleLower.includes(lowerQuery) || pathLower.includes(lowerQuery);
      })
      .slice(0, 20);
  }
}

const searchCache = new SearchCache();

// Enhanced file cache with better memory management
let fileCache: {
  files: SearchResult[] | null;
  timestamp: number;
  promise: Promise<SearchResult[]> | null;
} = {
  files: null,
  timestamp: 0,
  promise: null
};

const FILE_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

/**
 * Get all files with enhanced caching and performance
 */
async function getAllFilesEnhanced(): Promise<SearchResult[]> {
  const now = Date.now();
  
  // Return cached if fresh
  if (fileCache.files && now - fileCache.timestamp < FILE_CACHE_TTL) {
    return fileCache.files;
  }
  
  // If already fetching, return the existing promise
  if (fileCache.promise) {
    return fileCache.promise;
  }
  
  // Start new fetch
  fileCache.promise = getAllIndexedFiles()
    .then(files => {
      // Enhanced sorting with multiple criteria
      const sorted = files.sort((a, b) => {
        // First by type (folders first)
        const aIsFolder = a.path.endsWith('/');
        const bIsFolder = b.path.endsWith('/');
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        
        // Then by name
        const aName = (a.title || a.path || '').toLowerCase();
        const bName = (b.title || b.path || '').toLowerCase();
        return aName.localeCompare(bName);
      });
      
      fileCache.files = sorted;
      fileCache.timestamp = now;
      fileCache.promise = null;
      
      return sorted;
    })
    .catch(error => {
      console.error('Failed to get files:', error);
      fileCache.promise = null;
      return [];
    });
  
  return fileCache.promise;
}

// Smart result scoring based on multiple factors
function scoreResult(result: SearchResult, query: string): number {
  const lowerQuery = query.toLowerCase();
  const title = (result.title || '').toLowerCase();
  const path = (result.path || '').toLowerCase();
  
  let score = result.score || 0;
  
  // Exact match bonus
  if (title === lowerQuery) score += 10;
  if (path.endsWith('/' + lowerQuery)) score += 8;
  
  // Start of word match bonus
  if (title.startsWith(lowerQuery)) score += 5;
  if (title.includes(' ' + lowerQuery)) score += 3;
  
  // Recent file bonus (would need to track this)
  // if (isRecentlyAccessed(result.path)) score += 2;
  
  return score;
}

export interface EnhancedRaycastSearchHook {
  query: string;
  setQuery: (v: string) => void;
  results: SearchResult[];
  highlighted: number;
  moveHighlight: (dir: 1 | -1) => void;
  selectCurrent: () => void;
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  clearSearch: () => void;
}

/**
 * Enhanced Raycast search hook with improved performance and UX
 */
export function useRaycastSearchEnhanced(
  onSelect: (path: string) => void
): EnhancedRaycastSearchHook {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  
  // Preload file cache on mount
  useEffect(() => {
    getAllFilesEnhanced().then(files => {
      console.log(`Preloaded ${files.length} files for instant search`);
    });
  }, []);
  
  // Reset highlight when results change
  useEffect(() => {
    setHighlighted(0);
    setDisplayLimit(20); // Reset display limit
  }, [results]);
  
  const performSearch = useCallback(async (q: string) => {
    if (!q) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    // Check cache first
    const cached = searchCache.get(q);
    if (cached) {
      setResults(cached);
      setHasMore(cached.length > displayLimit);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // For very short queries, use local filtering for speed
      if (q.length <= 2) {
        const allFiles = await getAllFilesEnhanced();
        const filtered = allFiles
          .filter(file => {
            const titleLower = (file.title || '').toLowerCase();
            const pathLower = (file.path || '').toLowerCase();
            return titleLower.includes(q.toLowerCase()) || 
                   pathLower.includes(q.toLowerCase());
          })
          .map(file => ({ ...file, score: scoreResult(file, q) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 50); // Get more than display limit for "load more"
        
        searchCache.set(q, filtered);
        setResults(filtered.slice(0, displayLimit));
        setHasMore(filtered.length > displayLimit);
        
        // Warm cache for likely next queries
        searchCache.warmCache(q, allFiles);
      } else {
        // Use backend search for longer queries
        const searchResults = await searchDocuments(q, 50);
        
        // Score and sort results
        const scored = searchResults
          .map(result => ({ ...result, score: scoreResult(result, q) }))
          .sort((a, b) => b.score - a.score);
        
        searchCache.set(q, scored);
        setResults(scored.slice(0, displayLimit));
        setHasMore(scored.length > displayLimit);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [displayLimit]);
  
  // Smart debouncing - immediate for cache hits, delayed for new searches
  const debouncedSearch = useSmartDebounce(performSearch, 50, true);
  
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);
  
  const moveHighlight = useCallback((dir: 1 | -1) => {
    setHighlighted(h => {
      const visibleResults = results.slice(0, displayLimit);
      if (!visibleResults.length) return 0;
      return (h + dir + visibleResults.length) % visibleResults.length;
    });
  }, [results, displayLimit]);
  
  const selectCurrent = useCallback(() => {
    const visibleResults = results.slice(0, displayLimit);
    if (!visibleResults.length) return;
    
    const item = visibleResults[highlighted];
    if (item) {
      // Track selection for better future predictions
      const recentSelections = JSON.parse(
        localStorage.getItem('recentSelections') || '[]'
      );
      const updated = [item.path, ...recentSelections.filter(p => p !== item.path)].slice(0, 20);
      localStorage.setItem('recentSelections', JSON.stringify(updated));
      
      onSelect(item.path);
      clearSearch();
    }
  }, [results, highlighted, displayLimit, onSelect]);
  
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setHighlighted(0);
    setDisplayLimit(20);
  }, []);
  
  const loadMore = useCallback(() => {
    setDisplayLimit(limit => Math.min(limit + 20, results.length));
  }, [results]);
  
  // Enhanced keyboard navigation
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveHighlight(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveHighlight(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectCurrent();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        // Jump down 5 items
        for (let i = 0; i < 5; i++) moveHighlight(1);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        // Jump up 5 items
        for (let i = 0; i < 5; i++) moveHighlight(-1);
      }
    };
    
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [moveHighlight, selectCurrent]);
  
  return {
    query,
    setQuery,
    results: results.slice(0, displayLimit),
    highlighted,
    moveHighlight,
    selectCurrent,
    isLoading,
    hasMore: results.length > displayLimit,
    loadMore,
    clearSearch
  };
}