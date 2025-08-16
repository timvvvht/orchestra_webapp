/**
 * Unit tests for DedupeCache utility
 */

import { DedupeCache } from '../DedupeCache';

describe('DedupeCache', () => {
  let cache: DedupeCache<string>;

  beforeEach(() => {
    cache = new DedupeCache<string>(1000, 5); // 1s TTL, max 5 entries for testing
  });

  it('should return false for new keys', () => {
    expect(cache.seen('key1')).toBe(false);
    expect(cache.seen('key2')).toBe(false);
  });

  it('should return true for recently seen keys', () => {
    expect(cache.seen('key1')).toBe(false); // First time
    expect(cache.seen('key1')).toBe(true);  // Duplicate
    expect(cache.seen('key1')).toBe(true);  // Still duplicate
  });

  it('should handle different key types', () => {
    const numCache = new DedupeCache<number>(1000, 5);
    
    expect(numCache.seen(123)).toBe(false);
    expect(numCache.seen(123)).toBe(true);
    expect(numCache.seen(456)).toBe(false);
  });

  it('should enforce max size limit', () => {
    const smallCache = new DedupeCache<string>(10000, 2); // Long TTL, max 2 entries
    
    expect(smallCache.seen('key1')).toBe(false);
    expect(smallCache.seen('key2')).toBe(false);
    expect(smallCache.size()).toBe(2);
    
    // Adding third key should evict oldest
    expect(smallCache.seen('key3')).toBe(false);
    expect(smallCache.size()).toBe(2);
    
    // key1 should have been evicted
    expect(smallCache.seen('key1')).toBe(false); // Treated as new again
  });

  it('should clear all entries', () => {
    cache.seen('key1');
    cache.seen('key2');
    expect(cache.size()).toBe(2);
    
    cache.clear();
    expect(cache.size()).toBe(0);
    
    // Keys should be treated as new after clear
    expect(cache.seen('key1')).toBe(false);
  });

  it('should purge expired entries', async () => {
    const shortTtlCache = new DedupeCache<string>(50, 10); // 50ms TTL
    
    shortTtlCache.seen('key1');
    shortTtlCache.seen('key2');
    expect(shortTtlCache.size()).toBe(2);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 60));
    
    const purged = shortTtlCache.purgeExpired();
    expect(purged).toBe(2);
    expect(shortTtlCache.size()).toBe(0);
  });

  it('should handle TTL expiration correctly', async () => {
    const shortTtlCache = new DedupeCache<string>(50, 10); // 50ms TTL
    
    expect(shortTtlCache.seen('key1')).toBe(false); // First time
    expect(shortTtlCache.seen('key1')).toBe(true);  // Duplicate within TTL
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 60));
    
    expect(shortTtlCache.seen('key1')).toBe(false); // Should be treated as new after TTL
  });
});