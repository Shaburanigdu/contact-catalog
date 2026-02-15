// lib/middleware-auth.ts
import * as jose from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production'

export interface UserPayload {
  id: string
  email: string
  username?: string
}

export async function verifyAccessTokenForMiddleware(token: string) {
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
    // Определяем тип ошибки для лучшей диагностики
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error('Token expired')
    }
    throw new Error('Invalid token')
  }
}

export async function verifyRefreshTokenForMiddleware(token: string): Promise<UserPayload> {
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
    throw new Error('Invalid or expired refresh token')
  }
}