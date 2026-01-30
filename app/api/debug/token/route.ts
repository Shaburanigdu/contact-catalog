// app/api/debug/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production';

export async function GET(request: NextRequest) {
  // Получаем токены из cookies
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  let accessPayload = null;
  let refreshPayload = null;
  let accessError = null;
  let refreshError = null;

  // Проверяем access токен
  if (accessToken) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jose.jwtVerify(accessToken, secret, {
        algorithms: ['HS256']
      });
      accessPayload = payload;
    } catch (error: any) {
      accessError = error.message;
    }
  }

  // Проверяем refresh токен
  if (refreshToken) {
    try {
      const secret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);
      const { payload } = await jose.jwtVerify(refreshToken, secret, {
        algorithms: ['HS256']
      });
      refreshPayload = payload;
    } catch (error: any) {
      refreshError = error.message;
    }
  }

  return NextResponse.json({
    cookies: {
      access_token: accessToken ? 'Есть' : 'Нет',
      refresh_token: refreshToken ? 'Есть' : 'Нет',
    },
    access_token: {
      valid: !!accessPayload,
      payload: accessPayload,
      error: accessError
    },
    refresh_token: {
      valid: !!refreshPayload,
      payload: refreshPayload,
      error: refreshError
    }
  });
}