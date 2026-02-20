import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  try {
    await verifyAccessToken(token);
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}