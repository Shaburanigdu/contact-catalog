// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateTokens } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Проверка пароля
    const isValidPassword = await verifyPassword(validatedData.password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Генерация токенов
    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username || undefined,
    });

    // Обновление времени последнего входа
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
      },
    });

    // Установка cookies
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