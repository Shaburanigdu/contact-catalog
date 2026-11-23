// app/uploads/[...path]/route.ts
// Serves uploaded images from UPLOAD_DIR. Needed in production because Next.js
// only serves files that were present in /public at build time.
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolveUploadUrl } from '@/lib/uploads';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = resolveUploadUrl('/uploads/' + segments.join('/'));
  if (!filePath) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
