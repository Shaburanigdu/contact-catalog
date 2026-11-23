// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authCookieOptions, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '@/lib/config';
import { prisma } from '@/lib/prisma';
import { generateTokens, hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Проверка существующего пользователя
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email или именем уже существует' },
        { status: 400 }
      );
    }

    // Хэширование пароля
    const hashedPassword = await hashPassword(validatedData.password);

    // Создание пользователя (без верификации)
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username,
        password_hash: hashedPassword,
        settings: {
          notifications: true,
          privacy_level: 'private',
          default_view: 'list',
        },
      },
    });

    // Генерация токенов
    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username || undefined,
    });

    const response = NextResponse.json(
      {
        message: 'Пользователь успешно зарегистрирован',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    );

    // Установка cookies
    response.cookies.set('access_token', tokens.accessToken, authCookieOptions(ACCESS_TOKEN_MAX_AGE));
    response.cookies.set('refresh_token', tokens.refreshToken, authCookieOptions(REFRESH_TOKEN_MAX_AGE));

    return response;
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Ошибка при регистрации' }, { status: 500 });
  }
}