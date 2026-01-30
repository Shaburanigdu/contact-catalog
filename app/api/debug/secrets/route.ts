// app/api/debug/secrets/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      JWT_SECRET: process.env.JWT_SECRET ? 'ЗАГРУЖЕН' : 'НЕ ЗАГРУЖЕН',
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ? 'ЗАГРУЖЕН' : 'НЕ ЗАГРУЖЕН',
      JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
      REFRESH_TOKEN_SECRET_LENGTH: process.env.REFRESH_TOKEN_SECRET?.length || 0,
      NODE_ENV: process.env.NODE_ENV,
    },
    expected: {
      JWT_SECRET: 'your-secret-key-change-in-production',
      REFRESH_TOKEN_SECRET: 'your-refresh-secret-change-in-production',
    },
    matches: {
      JWT_SECRET: process.env.JWT_SECRET === 'your-secret-key-change-in-production',
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET === 'your-refresh-secret-change-in-production',
    }
  });
}