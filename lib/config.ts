// lib/config.ts
// Centralised access to environment-dependent settings.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(
      `Environment variable ${name} must be set to a random string of at least 32 characters`
    );
  }
  return value;
}

// Secrets are read lazily so that `next build` works without runtime secrets.
export function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv('JWT_SECRET'));
}

export function getRefreshSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv('REFRESH_TOKEN_SECRET'));
}

/**
 * Cookies get the `secure` flag in production by default.
 * Set COOKIE_SECURE=false when serving over plain HTTP (e.g. a LAN IP without TLS),
 * otherwise browsers silently drop the cookies and login never sticks.
 */
export function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === 'true';
  }
  return process.env.NODE_ENV === 'production';
}

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}

export const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
