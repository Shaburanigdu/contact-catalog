import * as jose from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production'

export interface UserPayload {
  id: string
  email: string
  username?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function generateTokens(user: UserPayload): Promise<AuthTokens> {
  console.log('🔐 Генерация токенов для:', user.email)
  
  const secret = new TextEncoder().encode(JWT_SECRET)
  const refreshSecret = new TextEncoder().encode(REFRESH_TOKEN_SECRET)

  const accessToken = await new jose.SignJWT({ 
    id: user.id, 
    email: user.email,
    username: user.username 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret)

  const refreshToken = await new jose.SignJWT({ 
    id: user.id, 
    email: user.email,
    username: user.username 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(refreshSecret)

  console.log('✅ Access токен сгенерирован, длина:', accessToken.length)
  console.log('✅ Refresh токен сгенерирован, длина:', refreshToken.length)
  
  return { accessToken, refreshToken }
}

export async function verifyAccessToken(token: string): Promise<UserPayload> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256']
    })
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      username: payload.username as string | undefined
    }
  } catch (error) {
    throw new AuthError('Invalid or expired access token')
  }
}

export async function verifyRefreshToken(token: string): Promise<UserPayload> {
  try {
    const secret = new TextEncoder().encode(REFRESH_TOKEN_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256']
    })
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      username: payload.username as string | undefined
    }
  } catch (error) {
    throw new AuthError('Invalid or expired refresh token')
  }
}

export async function createSession(userId: string, refreshToken: string, userAgent?: string, ipAddress?: string) {
  const refreshTokenHash = await hashPassword(refreshToken)
  
  const session = await prisma.user_sessions.create({
    data: {
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user_agent: userAgent,
      ip_address: ipAddress
    }
  })

  return session
}

export async function validateSession(refreshToken: string, sessionId: string) {
  const session = await prisma.user_sessions.findUnique({
    where: { id: sessionId },
    include: { users: true }
  })

  if (!session || session.revoked_at || session.expires_at < new Date()) {
    throw new AuthError('Invalid session')
  }

  const isValid = await verifyPassword(refreshToken, session.refresh_token_hash)
  if (!isValid) {
    throw new AuthError('Invalid refresh token')
  }

  return session
}

export async function revokeSession(sessionId: string) {
  await prisma.user_sessions.update({
    where: { id: sessionId },
    data: { revoked_at: new Date() }
  })
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.user_sessions.updateMany({
    where: { 
      user_id: userId,
      revoked_at: null 
    },
    data: { revoked_at: new Date() }
  })
}

export function setAuthCookies(accessToken: string, refreshToken: string) {
  console.log('🍪 Установка cookies...')
  console.log('   Access токен (первые 20 символов):', accessToken.substring(0, 20) + '...')
  console.log('   Refresh токен (первые 20 символов):', refreshToken.substring(0, 20) + '...')
  
  const cookieStore = cookies()
  
  if (!cookieStore) {
    console.error('❌ Cookie store не доступен!')
    return
  }
  
  try {
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/'
    })
    console.log('✅ Access токен cookie установлен')
    
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })
    console.log('✅ Refresh токен cookie установлен')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Ошибка установки cookies:', errorMessage)
  }
}

export function clearAuthCookies() {
  const cookieStore = cookies()
  
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies()
    const accessToken = cookieStore.get('access_token')?.value
    
    if (!accessToken) {
      return null
    }

    const user = await verifyAccessToken(accessToken)
    return user
  } catch (error) {
    return null
  }
}