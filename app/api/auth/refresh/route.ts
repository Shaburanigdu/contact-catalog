// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateTokens } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }

    // Проверка refresh токена
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // (Опционально) проверяем, что пользователь всё ещё существует
    const user = await prisma.user.findUnique({
      where: { id: payload.id, deleted_at: null },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Генерация новой пары токенов (ротация refresh)
    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username || undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Tokens refreshed',
    });

    // Установка новых cookies
    response.cookies.set('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}