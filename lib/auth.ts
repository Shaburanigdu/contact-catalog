// lib/auth.ts
import * as jose from 'jose';
// Native bcrypt hashes in libuv worker threads; the pure-JS bcryptjs blocked the
// event loop for ~100 ms per login and stalled every other request under load.
// Hashes are format-compatible, so existing passwords keep working.
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { NextRequest } from 'next/server';
import { getJwtSecret, getRefreshSecret } from './config';

export interface UserPayload {
  id: string;
  email: string;
  username?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Хэширование пароля
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Проверка пароля
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Генерация пары токенов
export async function generateTokens(user: UserPayload): Promise<AuthTokens> {
  const secret = getJwtSecret();
  const refreshSecret = getRefreshSecret();

  const accessToken = await new jose.SignJWT({
    id: user.id,
    email: user.email,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret);

  const refreshToken = await new jose.SignJWT({
    id: user.id,
    email: user.email,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(refreshSecret);

  return { accessToken, refreshToken };
}

// Проверка access токена
export async function verifyAccessToken(token: string): Promise<UserPayload> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return {
      id: payload.id as string,
      email: payload.email as string,
      username: payload.username as string | undefined,
    };
  } catch (error) {
    throw new AuthError('Invalid or expired access token');
  }
}

// Проверка refresh токена
export async function verifyRefreshToken(token: string): Promise<UserPayload> {
  try {
    const secret = getRefreshSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return {
      id: payload.id as string,
      email: payload.email as string,
      username: payload.username as string | undefined,
    };
  } catch (error) {
    throw new AuthError('Invalid or expired refresh token');
  }
}

// Получить текущего пользователя из access токена (без проверки БД)
export async function getCurrentUser(): Promise<UserPayload | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    if (!accessToken) return null;
    return await verifyAccessToken(accessToken);
  } catch {
    return null;
  }
}

/**
 * Получить ID текущего пользователя из запроса (для API Routes)
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    return payload.id;
  } catch {
    return null;
  }
}