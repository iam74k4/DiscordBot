/**
 * Fuzzy search utilities for autocomplete
 */

/**
 * Calculate similarity score between two strings (0-1)
 * Uses a combination of includes check and character matching
 */
export function calculateSimilarity(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (t === q) return 1;

  // Contains query (high score)
  if (t.includes(q)) {
    // Bonus for starting with query
    if (t.startsWith(q)) return 0.95;
    return 0.8;
  }

  // Character-based similarity for typo tolerance
  let matches = 0;
  let lastIndex = -1;

  for (const char of q) {
    const index = t.indexOf(char, lastIndex + 1);
    if (index > lastIndex) {
      matches++;
      lastIndex = index;
    }
  }

  // Calculate score based on matching characters
  const score = matches / Math.max(q.length, t.length);

  // Minimum threshold
  return score > 0.3 ? score * 0.7 : 0;
}

/**
 * Filter and sort items by fuzzy match score
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
  minScore: number = 0.3
): T[] {
  if (!query.trim()) {
    return items;
  }

  const scored = items
    .map((item) => ({
      item,
      score: calculateSimilarity(query, getSearchText(item)),
    }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.item);
}

/**
 * Simple contains-based filter with fuzzy fallback
 */
export function smartFilter<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string
): T[] {
  const q = query.toLowerCase().trim();

  if (!q) {
    return items;
  }

  // First try exact contains match
  const exactMatches = items.filter((item) =>
    getSearchText(item).toLowerCase().includes(q)
  );

  if (exactMatches.length > 0) {
    // Sort by position of match (earlier = better)
    return exactMatches.sort((a, b) => {
      const aText = getSearchText(a).toLowerCase();
      const bText = getSearchText(b).toLowerCase();
      const aIndex = aText.indexOf(q);
      const bIndex = bText.indexOf(q);

      // Prioritize starts-with
      if (aText.startsWith(q) && !bText.startsWith(q)) return -1;
      if (!aText.startsWith(q) && bText.startsWith(q)) return 1;

      return aIndex - bIndex;
    });
  }

  // Fallback to fuzzy search
  return fuzzyFilter(items, query, getSearchText, 0.4);
}
