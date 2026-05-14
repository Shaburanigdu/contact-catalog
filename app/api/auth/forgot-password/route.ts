// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email, deleted_at: null },
    });

    // Безопасность: всегда возвращаем одинаковый ответ, даже если пользователь не найден
    if (!user) {
      console.log(`Запрос сброса для несуществующего email: ${email}`);
      return NextResponse.json({
        message: 'Если email существует, инструкции отправлены',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 час

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetToken,
        password_reset_expires_at: resetTokenExpiry,
      },
    });

    // Отправляем письмо
    await sendPasswordResetEmail(user.email, resetToken);

    return NextResponse.json({
      message: 'Если email существует, инструкции отправлены',
    });
  } catch (error) {
    console.error('Ошибка запроса сброса пароля:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}