import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateTokens, setAuthCookies } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { z } from 'zod'

// Упрощенная функция для создания сессии без bcrypt
async function createSessionSimplified(userId: string, refreshToken: string, userAgent?: string, ipAddress?: string) {
  try {
    // Просто сохраняем сессию с refresh token (в production нужно хешировать!)
    const session = await prisma.user_sessions.create({
      data: {
        user_id: userId,
        refresh_token_hash: refreshToken, // ВНИМАНИЕ: не хешируем для простоты
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user_agent: userAgent,
        ip_address: ipAddress
      }
    })

    return session
  } catch (error) {
    console.error('Ошибка создания сессии:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // Find user
    const user = await prisma.users.findUnique({
      where: { email: validatedData.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Generate tokens
    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username || undefined
    })

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = request.headers.get('x-forwarded-for') || undefined
    
    await createSessionSimplified(user.id, tokens.refreshToken, userAgent, ipAddress)

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    })

    // Create response
    const response = NextResponse.json({
      message: 'Успешный вход',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    })

    // Set cookies in response
    response.cookies.set('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/'
    })

    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при входе' },
      { status: 500 }
    )
  }
}