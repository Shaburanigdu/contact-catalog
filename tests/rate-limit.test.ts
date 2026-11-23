import { describe, expect, it } from 'vitest';
import { RateLimiter, clientIp } from '@/lib/rate-limit';

function limiter(limit = 3, windowMs = 1000) {
  let now = 0;
  const l = new RateLimiter(limit, windowMs, () => now);
  return { l, advance: (ms: number) => (now += ms) };
}

describe('RateLimiter', () => {
  it('blocks a key after the limit is reached', () => {
    const { l } = limiter(3);
    expect(l.hit('a')).toBe(false);
    expect(l.hit('a')).toBe(false);
    expect(l.retryAfter('a')).toBe(0);
    expect(l.hit('a')).toBe(true);
    expect(l.retryAfter('a')).toBe(1);
  });

  it('keeps keys independent', () => {
    const { l } = limiter(1);
    l.hit('a');
    expect(l.retryAfter('a')).toBeGreaterThan(0);
    expect(l.retryAfter('b')).toBe(0);
  });

  it('unblocks after the window passes', () => {
    const { l, advance } = limiter(1, 1000);
    l.hit('a');
    advance(1001);
    expect(l.retryAfter('a')).toBe(0);
    expect(l.hit('a')).toBe(true); // a fresh window starts counting again
  });

  it('reset clears the counter', () => {
    const { l } = limiter(2);
    l.hit('a');
    l.reset('a');
    expect(l.hit('a')).toBe(false);
  });
});

describe('clientIp', () => {
  it('takes the first address from x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip and then to "unknown"', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
