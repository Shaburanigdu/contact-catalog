// app/api/auth/login/route.ts (чистая версия)
import { NextRequest, NextResponse } from 'next/server';
import { authCookieOptions, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '@/lib/config';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateTokens } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { z } from 'zod';
import { clientIp, loginIpLimiter, loginLimiter } from '@/lib/rate-limit';

// bcrypt hash of a random string, compared against when the user does not exist
const DUMMY_HASH = '$2b$10$Pv9ioM7IN5vK9hHF/6i6oez8ZFT15xdtXfYFVV82KGUzE4hTAl81u';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const ip = clientIp(request.headers);
    const limitKey = `${validatedData.email.toLowerCase()}|${ip}`;
    const retryAfter = Math.max(loginLimiter.retryAfter(limitKey), loginIpLimiter.retryAfter(ip));
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: 'Слишком много попыток входа. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    // Always run bcrypt so the response time does not reveal whether the email exists.
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user && !user.deleted_at ? user.password_hash : DUMMY_HASH
    );
    if (!user || user.deleted_at || !isValidPassword) {
      loginLimiter.hit(limitKey);
      loginIpLimiter.hit(ip);
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }
    loginLimiter.reset(limitKey);

    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username || undefined,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const response = NextResponse.json({
      message: 'Успешный вход',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        email_verified: user.email_verified, // можно оставить, не мешает
      },
    });

    response.cookies.set('access_token', tokens.accessToken, authCookieOptions(ACCESS_TOKEN_MAX_AGE));
    response.cookies.set('refresh_token', tokens.refreshToken, authCookieOptions(REFRESH_TOKEN_MAX_AGE));

    return response;
  } catch (error) {
    console.error('Ошибка входа:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Ошибка при входе' }, { status: 500 });
  }
}