import * as jose from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production'

export interface UserPayload {
  id: string
  email: string
  username?: string
}


export async function verifyAccessTokenForMiddleware(token: string): Promise<UserPayload> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256']
    })
    
    console.log('   ✅ Токен валиден, пользователь:', payload.email)
    return {
      id: payload.id as string,
      email: payload.email as string,
      username: payload.username as string | undefined
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.log('   ❌ Ошибка верификации токена:', errorMessage)
    throw new Error('Invalid or expired access token')
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

export async function getAuthCookies() { // Добавлено async
  const cookieStore = await cookies() // Добавлено await
  return {
    accessToken: cookieStore.get('access_token')?.value,
    refreshToken: cookieStore.get('refresh_token')?.value,
  }
}

export async function setAuthCookiesForMiddleware(accessToken: string, refreshToken: string) { // async
  const cookieStore = await cookies() // await
  
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
    path: '/'
  })

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/'
  })
}

export async function clearAuthCookiesForMiddleware() { // async
  const cookieStore = await cookies() // await
  
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}