import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchResult } from '../types/search';
import { searchDocuments, getAllIndexedFiles } from '../api';

/**
 * Very small debounce helper with cancel ability.
 */
function useDebouncedCallback<T extends (...args: any[]) => any>(callback: T, delay: number) {
    const timeoutRef = useRef<number | undefined>();

    const debounced = useCallback(
        (...args: Parameters<T>) => {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = window.setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    );

    // Cancel on unmount
    useEffect(() => {
        return () => window.clearTimeout(timeoutRef.current);
    }, []);

    return debounced;
}

/**
 * Local in-memory cache so we never ask the backend twice for the same prefix.
 */
const prefixCache = new Map<string, SearchResult[]>();

// In-memory file list for quick filtering on short queries
let allFilesCache: SearchResult[] | null = null;
let allFilesCacheLastUpdated = 0;
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes - increased to reduce frequency

// Flag to track if we're actively fetching file list
let isCurrentlyFetchingFiles = false;

// Flag to track if we've already scheduled a prefetch
let prefetchScheduled = false;

/**
 * Get all available files from the index for in-memory filtering
 */
async function getAllFiles(): Promise<SearchResult[]> {
    // Skip in browser environment - search functionality not available
    if (!(window as any).__TAURI__) {
        console.log('[useRaycastSearch] Skipping getAllFiles: not running inside Tauri runtime');
        return [];
    }

    // If we're already fetching, don't start another fetch
    if (isCurrentlyFetchingFiles) {
        // Wait for fetch to complete
        console.log('File fetch already in progress, waiting...');
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (!isCurrentlyFetchingFiles && allFilesCache) {
                    clearInterval(checkInterval);
                    resolve(allFilesCache);
                }
            }, 50);
        });
    }

    const now = Date.now();

    // Return cached results if available and fresh
    if (allFilesCache && now - allFilesCacheLastUpdated < CACHE_TTL) {
        console.log('Using cached file list:', allFilesCache.length, 'files');
        return allFilesCache;
    }

    console.log('Fetching complete file list for fast filtering');
    isCurrentlyFetchingFiles = true;

    try {
        // Get all files from the index using a backend command
        console.time('getAllIndexedFiles');
        const files = await getAllIndexedFiles();
        console.timeEnd('getAllIndexedFiles');

        // Sort by filename for more intuitive results
        const sorted = files.sort((a, b) => {
            // Add safety checks to handle possible undefined values
            const aName = (a.title || a.path || '').toLowerCase();
            const bName = (b.title || b.path || '').toLowerCase();
            return aName.localeCompare(bName);
        });

        // Update cache
        allFilesCache = sorted;
        allFilesCacheLastUpdated = now;

        console.log('File list refreshed with', sorted.length, 'files');
        return sorted;
    } catch (error) {
        console.error('Failed to get all indexed files:', error);
        // Fallback to empty array
        return [];
    } finally {
        isCurrentlyFetchingFiles = false;
    }
}

// Start prefetching file list with a more conservative approach
// Only prefetch once and with a longer delay to avoid unnecessary indexing
(function schedulePrefetch() {
    // Skip prefetch in browser environment - search functionality not available
    if (!(window as any).__TAURI__) {
        console.log('[useRaycastSearch] Skipping prefetch: not running inside Tauri runtime');
        return;
    }

    // Only schedule prefetch if it hasn't been scheduled yet
    if (!prefetchScheduled) {
        prefetchScheduled = true;
        // Use a longer delay to ensure app is fully loaded and stable
        setTimeout(() => {
            // Only prefetch if cache is empty or stale
            if (!allFilesCache || Date.now() - allFilesCacheLastUpdated > CACHE_TTL) {
                console.log('Pre-fetching file list in background...');
                getAllFiles().then(files => {
                    console.log('File list pre-fetched:', files.length, 'files');
                });
            } else {
                console.log('Skipping prefetch, using existing cache with', allFilesCache?.length || 0, 'files');
            }
        }, 5000); // 5 second delay - increased to ensure app is fully loaded
    }
})();

// Simple filter function for quick in-memory filtering of files
function quickFilterFiles(files: SearchResult[], query: string): SearchResult[] {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    const limit = 20;

    // Simple but fast filtering logic
    return files
        .filter(file => {
            // Add safety checks to handle undefined fields
            const titleLower = (file.title || '').toLowerCase();
            const pathLower = (file.path || '').toLowerCase();

            return titleLower.includes(lowerQuery) || pathLower.includes(lowerQuery);
        })
        .slice(0, limit)
        .map(file => ({
            ...file,
            // Assign simple score based on match position with safety check
            score: (file.title || '').toLowerCase().includes(lowerQuery) ? 5.0 : 1.0
        }));
}

export interface RaycastSearchHook {
    query: string;
    setQuery: (v: string) => void;
    results: SearchResult[];
    highlighted: number;
    moveHighlight: (dir: 1 | -1) => void;
    selectCurrent: () => void;
    updateResults: () => Promise<void>;
}

/**
 * Deduplicate search results by path to prevent duplicate keys in React lists
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
        // If this path hasn't been seen or the current result has a higher score than the existing one
        if (!seen.has(result.path) || result.score > seen.get(result.path)!.score) {
            seen.set(result.path, result);
        }
    }

    return Array.from(seen.values());
}

/**
 * Main hook powering the Raycast‑style search modal.
 * @param onSelect callback to open the file in the editor
 */
export function useRaycastSearch(onSelect: (path: string) => void): RaycastSearchHook {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [highlighted, setHighlighted] = useState(0);

    // Loading state for getting all files
    const [inMemoryFiles, setInMemoryFiles] = useState<SearchResult[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    // Bring highlight back to top when results change
    useEffect(() => {
        setHighlighted(0);
    }, [results]);

    // Load in-memory file list when component mounts - only once
    useEffect(() => {
        // Only load files if they're not already being loaded and we don't have them in memory
        if (inMemoryFiles.length === 0 && !isLoadingFiles && allFilesCache === null) {
            console.log('Loading file list for search on component mount');
            setIsLoadingFiles(true);
            getAllFiles()
                .then(files => {
                    console.log(`Loaded ${files.length} files for search component`);
                    setInMemoryFiles(files);
                })
                .finally(() => {
                    setIsLoadingFiles(false);
                });
        } else if (allFilesCache && inMemoryFiles.length === 0) {
            // If we already have a global cache but component state is empty, use the cache
            console.log('Using existing file cache for search component');
            setInMemoryFiles(allFilesCache);
        }
    }, []); // Empty dependency array - only run once on mount

    const performSearch = useCallback(
        async (q: string) => {
            if (!q) {
                console.log('🔍 Empty query, clearing results');
                setResults([]);
                return;
            }

            // Try cache first
            if (prefixCache.has(q)) {
                console.log(`🔍 Using cached results for "${q}" (${prefixCache.get(q)!.length} results)`);
                setResults(prefixCache.get(q)!);
                return;
            }

            // For short queries (1-2 chars), use the fast in-memory filtering
            if (q.length <= 2 && inMemoryFiles.length > 0) {
                console.log(`🔍 Using fast in-memory filtering for short query: "${q}" (${inMemoryFiles.length} files in memory)`);
                const filteredResults = quickFilterFiles(inMemoryFiles, q);
                console.log(`🔍 Fast filtering found ${filteredResults.length} results for "${q}"`);

                // Log the first few results for debugging
                if (filteredResults.length > 0) {
                    console.log(
                        '🔍 First 3 results:',
                        filteredResults.slice(0, 3).map(r => ({
                            path: r.path,
                            title: r.title,
                            score: r.score,
                            id: r.id
                        }))
                    );
                }

                setResults(filteredResults);
                prefixCache.set(q, filteredResults);
                return;
            }

            try {
                const limit = 20; // smaller limit for sub‑ms response
                console.log(`🔍 Performing backend search for "${q}" (limit: ${limit})`);
                console.time(`Search for "${q}"`);
                const res = await searchDocuments(q, limit);
                console.timeEnd(`Search for "${q}"`);

                // Deduplicate the results before storing and displaying
                const uniqueResults = deduplicateResults(res);
                console.log(`🔍 Search found ${res.length} results, ${uniqueResults.length} after deduplication`);

                // Log the first few results for debugging
                if (uniqueResults.length > 0) {
                    console.log(
                        '🔍 First 3 results:',
                        uniqueResults.slice(0, 3).map(r => ({
                            path: r.path,
                            title: r.title,
                            score: r.score,
                            id: r.id
                        }))
                    );
                }

                prefixCache.set(q, uniqueResults);
                setResults(uniqueResults);
            } catch (err) {
                console.error('🔍 RaycastSearch: search error', err);
                setResults([]);
            }
        },
        [inMemoryFiles]
    );

    // Debounce 50 ms for fast feedback without spam
    const debouncedSearch = useDebouncedCallback(performSearch, 50);

    useEffect(() => {
        debouncedSearch(query);
    }, [query, debouncedSearch]);

    // Reset the search state
    const resetSearch = useCallback(() => {
        setQuery('');
        setResults([]);
    }, []);

    const moveHighlight = useCallback(
        (dir: 1 | -1) => {
            setHighlighted(h => {
                if (!results.length) return 0;
                // Logging added here
                console.log('[useRaycastSearch] moveHighlight: current=', h, 'dir=', dir, 'new=', (h + dir + results.length) % results.length);
                return (h + dir + results.length) % results.length;
            });
        },
        [results]
    );

    const selectCurrent = useCallback(() => {
        if (!results.length) return;
        const item = results[highlighted];
        if (item) {
            console.log('🔍 Selecting current result:', {
                path: item.path,
                title: item.title || item.path.split('/').pop(),
                id: item.id,
                score: item.score,
                highlighted_index: highlighted,
                total_results: results.length
            });
            // Call onSelect with the selected file path
            // This will trigger the navigation to the file in App.tsx
            console.log('🔍 Calling onSelect with path:', item.path);
            onSelect(item.path);
            // We don't call close() here anymore as it's handled by the modal store
            resetSearch();
        } else {
            console.warn('🔍 No item found at highlighted index:', highlighted);
        }
    }, [results, highlighted, onSelect, resetSearch]);

    // Keyboard navigation listener (only for arrow keys, enter, etc.)
    // The global Cmd+K / Ctrl+K shortcut is now handled by the keyboard shortcuts system
    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            // Only handle navigation keys when the modal is open
            // We know the modal is open if this component is mounted and rendered
            console.log('[useRaycastSearch] Keydown in modal listener:', e.key); // Log all keys received by this listener

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                console.log('[useRaycastSearch] ArrowDown detected by modal listener');
                moveHighlight(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                console.log('[useRaycastSearch] ArrowUp detected by modal listener');
                moveHighlight(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                console.log('[useRaycastSearch] Enter detected by modal listener');
                selectCurrent();
            }
            // Escape is now handled by the modal store through the SearchIntegration component and useSearchShortcut hook
        };
        document.addEventListener('keydown', listener);
        return () => {
            console.log('[useRaycastSearch] Cleaning up modal keydown listener');
            document.removeEventListener('keydown', listener);
        };
    }, [moveHighlight, selectCurrent]); // Dependencies ensure the listener always has the latest functions

    const updateResults = useCallback(async () => {
        await performSearch(query);
    }, [performSearch, query]);

    return {
        query,
        setQuery,
        results,
        highlighted,
        moveHighlight,
        selectCurrent,
        updateResults
    };
}
