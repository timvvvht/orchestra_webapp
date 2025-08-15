/**
 * DedupeCache - Generic TTL-based deduplication cache
 * 
 * Prevents duplicate processing of items within a time window.
 * Automatically expires old entries and enforces memory limits.
 */

export class DedupeCache<K = string> {
  private map = new Map<K, number>(); // K → timestamp

  constructor(
    private ttlMs: number = 30_000,     // 30 seconds default TTL
    private max: number = 2000          // cap memory usage
  ) {}

  /**
   * Check if key has been seen recently, and mark it as seen
   * @param key - The key to check/mark
   * @returns true if key was already seen within TTL, false if new
   */
  seen(key: K): boolean {
    const now = Date.now();
    const ts = this.map.get(key);
    
    // Check if we've seen this key recently
    if (ts && now - ts < this.ttlMs) {
      return true; // Duplicate - already seen within TTL
    }
    
    // Mark as seen with current timestamp
    this.map.set(key, now);
    
    // Enforce max size with simple FIFO purge
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    
    return false; // New - not seen recently
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.map.size;
  }

  /**
   * Manually purge expired entries
   */
  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    
    for (const [key, timestamp] of this.map.entries()) {
      if (now - timestamp >= this.ttlMs) {
        this.map.delete(key);
        purged++;
      }
    }
    
    return purged;
  }
}