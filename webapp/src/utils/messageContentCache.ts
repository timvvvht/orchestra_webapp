/**
 * Global cache for processed message content
 * Prevents re-processing of markdown and code blocks
 */

interface ProcessedContent {
  markdown: string;
  codeBlocks: Array<{ language: string; code: string }>;
  timestamp: number;
}

class MessageContentCache {
  private cache = new Map<string, ProcessedContent>();
  private maxSize = 500; // Maximum number of cached messages
  private ttl = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get cached content or return null
   */
  get(messageId: string, timestamp: number): ProcessedContent | null {
    const key = this.getKey(messageId, timestamp);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  /**
   * Set cached content
   */
  set(messageId: string, timestamp: number, content: Omit<ProcessedContent, 'timestamp'>): void {
    const key = this.getKey(messageId, timestamp);
    
    // Implement LRU eviction if cache is too large
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      ...content,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached content
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  private getKey(messageId: string, timestamp: number): string {
    return `${messageId}-${timestamp}`;
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`[MessageContentCache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }
}

// Singleton instance
export const messageContentCache = new MessageContentCache();

// Helper to extract code blocks from markdown
export function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'plaintext',
      code: match[2].trim()
    });
  }
  
  return blocks;
}