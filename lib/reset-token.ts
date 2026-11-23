// lib/reset-token.ts
import crypto from 'crypto';

/** Password reset tokens are stored as SHA-256 hashes; the raw token only travels in the email link. */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
