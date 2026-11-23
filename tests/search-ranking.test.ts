import { describe, expect, it } from 'vitest';
import { rankResults } from '@/lib/search-ranking';

const r = (id: string, similarity: number, type = 'contact') => ({ id, type, similarity });

describe('rankResults', () => {
  it('keeps only semantic hits close to the best one', () => {
    const out = rankResults([r('a', 0.79), r('b', 0.76), r('c', 0.71)], 0.5, 0.05);
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('always keeps exact matches and drops weaker semantic ones', () => {
    const out = rankResults([r('a', 1), r('b', 1, 'event'), r('c', 0.67)], 0.5, 0.05);
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('applies the absolute minimum', () => {
    expect(rankResults([r('a', 0.4), r('b', 0.38)], 0.5, 0.05)).toEqual([]);
  });

  it('removes duplicates of the same entity', () => {
    const out = rankResults([r('a', 1), r('a', 0.9)], 0.5, 0.05);
    expect(out).toHaveLength(1);
    expect(out[0].similarity).toBe(1);
  });

  it('treats the same id of different types as different results', () => {
    expect(rankResults([r('a', 0.8, 'contact'), r('a', 0.8, 'event')], 0.5, 0.05)).toHaveLength(2);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => r(String(i), 1));
    expect(rankResults(many, 0.5, 0.05, 10)).toHaveLength(10);
  });
});
