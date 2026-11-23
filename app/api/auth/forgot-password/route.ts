// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { clientIp, passwordResetLimiter } from '@/lib/rate-limit';
import { hashResetToken } from '@/lib/reset-token';

const GENERIC_RESPONSE = { message: 'Если email существует, инструкции отправлены' };

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    // Limit reset emails per IP so the endpoint cannot be used to spam mailboxes.
    const ip = clientIp(request.headers);
    const retryAfter = passwordResetLimiter.retryAfter(ip);
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }
    passwordResetLimiter.hit(ip);

    const user = await prisma.user.findUnique({
      where: { email, deleted_at: null },
    });

    // Same response whether or not the user exists
    if (!user) return NextResponse.json(GENERIC_RESPONSE);

    // Only a hash of the token is stored, so a database leak does not expose reset links.
    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: hashResetToken(resetToken),
        password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await sendPasswordResetEmail(user.email, resetToken);

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Ошибка запроса сброса пароля:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
