// lib/rate-limit.ts
// Fixed-window counter kept in memory. Good enough for a single app instance;
// several instances would need a shared store such as Redis.

interface Window {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now
  ) {}

  /** Seconds until the key may try again, or 0 if it is not blocked. */
  retryAfter(key: string): number {
    const w = this.windows.get(key);
    if (!w || w.resetAt <= this.now()) return 0;
    return w.count >= this.limit ? Math.ceil((w.resetAt - this.now()) / 1000) : 0;
  }

  /** Records one attempt; returns true if the key is now over the limit. */
  hit(key: string): boolean {
    const now = this.now();
    let w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, w);
    }
    w.count += 1;
    this.prune(now);
    return w.count >= this.limit;
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  private prune(now: number) {
    if (this.windows.size < 10_000) return;
    for (const [k, w] of this.windows) if (w.resetAt <= now) this.windows.delete(k);
  }
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
}

// 10 failed logins per email+IP in 15 minutes
export const loginLimiter = new RateLimiter(10, 15 * 60 * 1000);
// 50 failed logins per IP in 15 minutes, across all emails (password spraying)
export const loginIpLimiter = new RateLimiter(50, 15 * 60 * 1000);
// 5 password reset emails per IP per hour
export const passwordResetLimiter = new RateLimiter(5, 60 * 60 * 1000);
