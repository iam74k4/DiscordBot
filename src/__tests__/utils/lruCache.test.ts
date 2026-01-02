import { describe, it, expect } from 'vitest';
import { LRUCache, BoundedMap } from '../../utils/lruCache.js';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('should create cache with specified max size', () => {
      const cache = new LRUCache<string, number>(10);
      expect(cache.size).toBe(0);
    });

    it('should throw error for invalid max size', () => {
      expect(() => new LRUCache<string, number>(0)).toThrow();
      expect(() => new LRUCache<string, number>(-1)).toThrow();
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('key1', 100);

      expect(cache.get('key1')).toBe(100);
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new LRUCache<string, number>(10);
      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('key1', 100);
      cache.set('key1', 200);

      expect(cache.get('key1')).toBe(200);
      expect(cache.size).toBe(1);
    });
  });

  describe('eviction', () => {
    it('should evict oldest entry when exceeding max size', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);
      cache.set('key4', 4); // This should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe(2);
      expect(cache.get('key3')).toBe(3);
      expect(cache.get('key4')).toBe(4);
      expect(cache.size).toBe(3);
    });

    it('should make accessed items most recently used', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);

      // Access key1 to make it most recently used
      cache.get('key1');

      // Add key4, which should evict key2 (now oldest)
      cache.set('key4', 4);

      expect(cache.get('key1')).toBe(1);
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe(3);
      expect(cache.get('key4')).toBe(4);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('key1', 100);
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      const cache = new LRUCache<string, number>(10);
      expect(cache.has('non-existent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('key1', 100);
      const result = cache.delete('key1');

      expect(result).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.size).toBe(0);
    });

    it('should return false for non-existent keys', () => {
      const cache = new LRUCache<string, number>(10);
      expect(cache.delete('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('iteration', () => {
    it('should iterate over entries', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const entries = [...cache.entries()];
      expect(entries.length).toBe(3);
    });

    it('should iterate over keys', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      cache.set('b', 2);

      const keys = [...cache.keys()];
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });

    it('should iterate over values', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      cache.set('b', 2);

      const values = [...cache.values()];
      expect(values).toContain(1);
      expect(values).toContain(2);
    });
  });
});

describe('BoundedMap', () => {
  it('should behave like LRUCache', () => {
    const map = new BoundedMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('d', 4);

    expect(map.has('a')).toBe(false);
    expect(map.get('b')).toBe(2);
    expect(map.size).toBe(3);
  });
});
