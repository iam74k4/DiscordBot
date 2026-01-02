/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Uses a Map to maintain insertion order for efficient eviction
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Cache max size must be positive');
    }
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get a value from the cache
   * Moves the key to the end (most recently used)
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Set a value in the cache
   * Evicts the least recently used item if at capacity
   */
  set(key: K, value: V): void {
    // If key exists, delete it first to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict the oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key from the cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Iterate over all entries
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
   * Iterate over all keys
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Iterate over all values
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * Execute a callback for each entry
   */
  forEach(callback: (value: V, key: K) => void): void {
    this.cache.forEach((value, key) => callback(value, key));
  }
}

/**
 * Simple bounded Map with automatic cleanup when exceeding size limit
 * Unlike LRU, this removes oldest entries without tracking access patterns
 */
export class BoundedMap<K, V> extends Map<K, V> {
  private readonly maxSize: number;

  constructor(maxSize: number) {
    super();
    if (maxSize <= 0) {
      throw new Error('Map max size must be positive');
    }
    this.maxSize = maxSize;
  }

  override set(key: K, value: V): this {
    // If key exists, just update
    if (this.has(key)) {
      super.set(key, value);
      return this;
    }

    // Evict oldest entries if at capacity
    while (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      } else {
        break;
      }
    }

    super.set(key, value);
    return this;
  }
}

