// lib/uploads.ts
import path from 'path';

/**
 * Directory where uploaded images are stored. Defaults to public/uploads for local
 * development; in Docker it points to a mounted volume (see docker-compose.yml).
 */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads');

// Public URLs look like /uploads/2026/02/<uuid>.jpg or /uploads/2026/02/thumb_<uuid>.jpg
// (older uploads may carry other image extensions).
const UPLOAD_URL_RE =
  /^\/uploads\/(\d{4})\/(\d{2})\/((?:thumb_)?[0-9a-f-]{36}\.(?:jpe?g|png|gif|webp))$/i;

/**
 * Maps a public /uploads/... URL to an absolute file path inside UPLOAD_DIR.
 * Returns null for anything that does not match the expected shape,
 * which rules out path traversal.
 */
export function resolveUploadUrl(url: string): string | null {
  const match = UPLOAD_URL_RE.exec(url);
  if (!match) return null;
  const [, year, month, file] = match;
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, year, month, file);
}
