// lib/search-ranking.ts

export interface ScoredResult {
  id: string;
  type: string;
  /** 1.0 for exact text matches, cosine similarity for semantic matches */
  similarity: number;
}

/**
 * Merges exact and semantic search hits:
 * - exact matches (similarity 1) are always kept;
 * - semantic matches must reach `minSimilarity` and lie within `gap` of the best hit;
 * - duplicates (same type + id) keep their first, highest-priority occurrence.
 */
export function rankResults<T extends ScoredResult>(
  items: T[],
  minSimilarity: number,
  gap: number,
  limit = 10
): T[] {
  if (items.length === 0) return [];
  const best = Math.max(...items.map((i) => i.similarity));
  const cutoff = Math.max(minSimilarity, best - gap);

  const seen = new Map<string, T>();
  for (const item of items) {
    const exact = item.similarity >= 1;
    if (!exact && item.similarity < cutoff) continue;
    const key = `${item.type}_${item.id}`;
    if (!seen.has(key)) seen.set(key, item);
  }

  return Array.from(seen.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
