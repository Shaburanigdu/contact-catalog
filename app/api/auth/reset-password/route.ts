// app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { sendPasswordChangedEmail } from '@/lib/email';

// GET для проверки токена (оставляем без изменений)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Токен не указан' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires_at: { gt: new Date() },
        deleted_at: null,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверная или просроченная ссылка для сброса пароля' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Токен действителен', valid: true });
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST для установки нового пароля
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Токен и пароль обязательны' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен содержать минимум 6 символов' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires_at: { gt: new Date() },
        deleted_at: null,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверная или просроченная ссылка для сброса пароля' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires_at: null,
        updated_at: new Date(),
      },
    });

    // Отправляем уведомление об успешной смене пароля
    try {
      await sendPasswordChangedEmail(user.email);
    } catch (emailError) {
      console.error('Не удалось отправить уведомление о смене пароля:', emailError);
      // Не прерываем успешный ответ
    }

    return NextResponse.json({
      message: 'Пароль успешно изменен',
      email: user.email,   // добавляем email пользователя
    });
    
  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}