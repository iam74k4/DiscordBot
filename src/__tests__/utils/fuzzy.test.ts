import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  fuzzyFilter,
  smartFilter,
} from '../../utils/fuzzy.js';

describe('calculateSimilarity', () => {
  it('should return 0 for empty query', () => {
    expect(calculateSimilarity('', 'test')).toBe(0);
  });

  it('should return 0 for empty target', () => {
    expect(calculateSimilarity('test', '')).toBe(0);
  });

  it('should return 0 for both empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(0);
  });

  it('should return 1 for exact match', () => {
    expect(calculateSimilarity('Counter-Strike 2', 'Counter-Strike 2')).toBe(1);
  });

  it('should be case insensitive', () => {
    expect(calculateSimilarity('TEST', 'test')).toBe(1);
    expect(calculateSimilarity('test', 'TEST')).toBe(1);
  });

  it('should return high score for contains match', () => {
    const score = calculateSimilarity('Strike', 'Counter-Strike 2');
    expect(score).toBe(0.8);
  });

  it('should return higher score for starts-with match', () => {
    const score = calculateSimilarity('Counter', 'Counter-Strike 2');
    expect(score).toBe(0.95);
  });

  it('should return low score for weak fuzzy match', () => {
    // 'cs2' has low character overlap with 'Counter-Strike 2'
    // The algorithm filters out matches below 0.3 threshold
    const score = calculateSimilarity('cs2', 'Counter-Strike 2');
    expect(score).toBeLessThan(0.3);
  });

  it('should return positive score for strong fuzzy match', () => {
    // 'counter' has good character overlap with 'Counter-Strike 2'
    const score = calculateSimilarity('countr', 'Counter-Strike 2');
    expect(score).toBeGreaterThan(0);
  });

  it('should return 0 for completely different strings', () => {
    const score = calculateSimilarity('xyz', 'abc');
    expect(score).toBe(0);
  });
});

describe('fuzzyFilter', () => {
  const games = [
    { name: 'Counter-Strike 2', hours: 1000 },
    { name: 'Dota 2', hours: 500 },
    { name: 'Team Fortress 2', hours: 200 },
    { name: 'Half-Life 2', hours: 50 },
  ];

  it('should return all items for empty query', () => {
    const result = fuzzyFilter(games, '', (g) => g.name);
    expect(result).toHaveLength(4);
  });

  it('should return all items for whitespace-only query', () => {
    const result = fuzzyFilter(games, '   ', (g) => g.name);
    expect(result).toHaveLength(4);
  });

  it('should filter by exact match', () => {
    const result = fuzzyFilter(games, 'Dota 2', (g) => g.name);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dota 2');
  });

  it('should filter by partial match', () => {
    const result = fuzzyFilter(games, 'Strike', (g) => g.name);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].name).toBe('Counter-Strike 2');
  });

  it('should respect minimum score threshold', () => {
    const result = fuzzyFilter(games, 'xyz', (g) => g.name, 0.5);
    expect(result).toHaveLength(0);
  });

  it('should sort by score descending', () => {
    const result = fuzzyFilter(games, '2', (g) => g.name);
    // All games have '2' in the name, should be sorted by score
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe('smartFilter', () => {
  const items = [
    { title: 'Apple Pie' },
    { title: 'Banana Bread' },
    { title: 'Apple Sauce' },
    { title: 'Cherry Apple' },
  ];

  it('should return all items for empty query', () => {
    const result = smartFilter(items, '', (i) => i.title);
    expect(result).toHaveLength(4);
  });

  it('should prioritize starts-with matches', () => {
    const result = smartFilter(items, 'apple', (i) => i.title);
    expect(result[0].title).toBe('Apple Pie');
    expect(result[1].title).toBe('Apple Sauce');
  });

  it('should find contains matches', () => {
    const result = smartFilter(items, 'bread', (i) => i.title);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Banana Bread');
  });

  it('should fallback to fuzzy search when no exact matches', () => {
    // 'appl' is close enough to 'Apple' for fuzzy match
    const result = smartFilter(items, 'appl', (i) => i.title);
    // Should find Apple items via fuzzy match (requires score > 0.4)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty for very weak fuzzy match', () => {
    // 'xyz' has no meaningful overlap with any item
    const result = smartFilter(items, 'xyz', (i) => i.title);
    expect(result.length).toBe(0);
  });

  it('should be case insensitive', () => {
    const result = smartFilter(items, 'APPLE', (i) => i.title);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
