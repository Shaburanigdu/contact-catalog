import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJwtSecret, isCookieSecure } from '@/lib/config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isCookieSecure', () => {
  it('is secure in production by default', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECURE', undefined as unknown as string);
    delete process.env.COOKIE_SECURE;
    expect(isCookieSecure()).toBe(true);
  });

  it('can be disabled for plain-HTTP deployments', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECURE', 'false');
    expect(isCookieSecure()).toBe(false);
  });

  it('is not secure in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env.COOKIE_SECURE;
    expect(isCookieSecure()).toBe(false);
  });
});

describe('getJwtSecret', () => {
  it('refuses to run without a secret', () => {
    vi.stubEnv('JWT_SECRET', '');
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('refuses short secrets', () => {
    vi.stubEnv('JWT_SECRET', 'too-short');
    expect(() => getJwtSecret()).toThrow(/32 characters/);
  });

  it('returns the encoded secret', () => {
    vi.stubEnv('JWT_SECRET', 'a'.repeat(40));
    expect(getJwtSecret()).toHaveLength(40);
  });
});
