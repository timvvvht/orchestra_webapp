/**
 * Content caching utilities for expensive operations like markdown processing
 * Implements LRU cache with memory management for optimal performance
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxAge: number; // in milliseconds

  constructor(maxSize = 1000, maxAge = 30 * 60 * 1000) { // 30 minutes default
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  set(key: string, value: T): void {
    const now = Date.now();
    
    // If already exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.timestamp = now;
      entry.lastAccessed = now;
      entry.accessCount++;
      
      // Move to end
      this.cache.delete(key);
      this.cache.set(key, entry);
      return;
    }
    
    // If at capacity, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get cache statistics for monitoring
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalAccesses: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      averageAge: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length 
        : 0,
      oldestEntry: entries.length > 0 
        ? Math.max(...entries.map(entry => now - entry.timestamp)) 
        : 0
    };
  }
}

// Create content hash for cache keys
const createContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// Global caches for different content types
const markdownCache = new LRUCache<string>(500, 60 * 60 * 1000); // 1 hour
const syntaxHighlightCache = new LRUCache<string>(200, 60 * 60 * 1000); // 1 hour
const mermaidCache = new LRUCache<string>(100, 60 * 60 * 1000); // 1 hour

/**
 * Cached markdown processing
 */
export const getCachedMarkdown = (content: string, processor: (content: string) => string): string => {
  const key = `md_${createContentHash(content)}`;
  
  let result = markdownCache.get(key);
  if (result === undefined) {
    result = processor(content);
    markdownCache.set(key, result);
  }
  
  return result;
};

/**
 * Cached syntax highlighting
 */
export const getCachedSyntaxHighlight = (
  code: string, 
  language: string, 
  processor: (code: string, language: string) => string
): string => {
  const key = `syntax_${language}_${createContentHash(code)}`;
  
  let result = syntaxHighlightCache.get(key);
  if (result === undefined) {
    result = processor(code, language);
    syntaxHighlightCache.set(key, result);
  }
  
  return result;
};

/**
 * Cached Mermaid diagram processing
 */
export const getCachedMermaidDiagram = (
  diagram: string, 
  processor: (diagram: string) => string
): string => {
  const key = `mermaid_${createContentHash(diagram)}`;
  
  let result = mermaidCache.get(key);
  if (result === undefined) {
    result = processor(diagram);
    mermaidCache.set(key, result);
  }
  
  return result;
};

/**
 * Cache management utilities
 */
export const contentCacheManager = {
  // Clear all caches
  clearAll() {
    markdownCache.clear();
    syntaxHighlightCache.clear();
    mermaidCache.clear();
  },
  
  // Get cache statistics
  getStats() {
    return {
      markdown: markdownCache.getStats(),
      syntaxHighlight: syntaxHighlightCache.getStats(),
      mermaid: mermaidCache.getStats()
    };
  },
  
  // Get total memory usage estimate (rough)
  getMemoryUsage() {
    const stats = this.getStats();
    return {
      totalEntries: stats.markdown.size + stats.syntaxHighlight.size + stats.mermaid.size,
      estimatedMemoryMB: (stats.markdown.size * 2 + stats.syntaxHighlight.size * 5 + stats.mermaid.size * 10) / 1024 // Rough estimate
    };
  }
};

/**
 * Performance monitoring hook for cache effectiveness
 */
export const useCachePerformance = () => {
  const getPerformanceMetrics = () => {
    const stats = contentCacheManager.getStats();
    const memory = contentCacheManager.getMemoryUsage();
    
    return {
      cacheStats: stats,
      memoryUsage: memory,
      hitRates: {
        markdown: stats.markdown.totalAccesses > 0 ? (stats.markdown.size / stats.markdown.totalAccesses) : 0,
        syntaxHighlight: stats.syntaxHighlight.totalAccesses > 0 ? (stats.syntaxHighlight.size / stats.syntaxHighlight.totalAccesses) : 0,
        mermaid: stats.mermaid.totalAccesses > 0 ? (stats.mermaid.size / stats.mermaid.totalAccesses) : 0
      }
    };
  };
  
  return { getPerformanceMetrics, clearCaches: contentCacheManager.clearAll };
};

/**
 * Debounced content processor to prevent excessive processing during typing
 */
export const createDebouncedProcessor = <T>(
  processor: (input: string) => T,
  delay = 300
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastResult: T | null = null;
  let lastInput = '';
  
  return (input: string): Promise<T> => {
    return new Promise((resolve) => {
      // If input hasn't changed, return cached result
      if (input === lastInput && lastResult !== null) {
        resolve(lastResult);
        return;
      }
      
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set new timeout
      timeoutId = setTimeout(() => {
        const result = processor(input);
        lastResult = result;
        lastInput = input;
        resolve(result);
      }, delay);
    });
  };
};