// lib/auth.ts
import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production';

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
  const secret = new TextEncoder().encode(JWT_SECRET);
  const refreshSecret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);

  const accessToken = await new jose.SignJWT({
    id: user.id,
    email: user.email,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1m')
    .sign(secret);

  const refreshToken = await new jose.SignJWT({
    id: user.id,
    email: user.email,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2m')
    .sign(refreshSecret);

  return { accessToken, refreshToken };
}

// Проверка access токена
export async function verifyAccessToken(token: string): Promise<UserPayload> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
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
    const secret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);
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