import { describe, expect, it } from 'vitest';
import path from 'path';
import { UPLOAD_DIR, resolveUploadUrl } from '@/lib/uploads';

const uuid = '5b26d364-9402-4e4f-b6a0-b60430ec823a';

describe('resolveUploadUrl', () => {
  it('maps a valid upload URL into the upload directory', () => {
    expect(resolveUploadUrl(`/uploads/2026/03/${uuid}.jpg`)).toBe(
      path.join(UPLOAD_DIR, '2026', '03', `${uuid}.jpg`)
    );
    expect(resolveUploadUrl(`/uploads/2026/03/thumb_${uuid}.jpg`)).not.toBeNull();
  });

  it('accepts legacy image extensions', () => {
    expect(resolveUploadUrl(`/uploads/2026/02/${uuid}.png`)).not.toBeNull();
  });

  it.each([
    '/uploads/../../.env',
    `/uploads/2026/03/../../../${uuid}.jpg`,
    '/uploads/2026/03/..%2F..%2F.env',
    `/uploads/2026/03/${uuid}.html`,
    `/uploads/2026/03/${uuid}.jpg/../../x`,
    '/etc/passwd',
    `uploads/2026/03/${uuid}.jpg`,
    '',
  ])('rejects %s', (url) => {
    expect(resolveUploadUrl(url)).toBeNull();
  });
});
