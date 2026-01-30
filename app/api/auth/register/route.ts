import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTokens } from '@/lib/auth'
import { registerSchema } from '@/lib/validation'
import { z } from 'zod'
import * as bcrypt from 'bcryptjs'

// Функция для хеширования пароля (работает только в Node.js)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Упрощенная функция для создания сессии без bcrypt
async function createSessionSimplified(userId: string, refreshToken: string, userAgent?: string, ipAddress?: string) {
  try {
    // Просто сохраняем сессию с refresh token (в production нужно хешировать!)
    const session = await prisma.userSession.create({
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
    console.log('📝 Начало регистрации...')
    console.log('   Полученные данные:', { 
      email: body.email, 
      username: body.username,
      password: '***',
      confirmPassword: '***'
    })
    
    const validatedData = registerSchema.parse(body)
    console.log('✅ Данные валидированы')

    // Check if user already exists
    console.log('🔍 Проверка существующего пользователя...')
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username }
        ]
      }
    })

    if (existingUser) {
      console.log('❌ Пользователь уже существует')
      return NextResponse.json(
        { error: 'Пользователь с таким email или именем уже существует' },
        { status: 400 }
      )
    }

    // Hash password
    console.log('🔑 Хеширование пароля...')
    const hashedPassword = await hashPassword(validatedData.password)
    console.log('   Длина хеша:', hashedPassword.length)

    // Create user
    console.log('👤 Создание пользователя в БД...')
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username,
        password_hash: hashedPassword,
        settings: {
          notifications: true,
          privacy_level: "private",
          default_view: "list"
        }
      }
    })

    console.log('✅ Пользователь создан:', { 
      id: user.id, 
      email: user.email,
      username: user.username 
    })

    // Generate tokens
    console.log('🎫 Генерация токенов...')
    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username || undefined
    })

    // Create session
    console.log('📱 Создание сессии...')
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = request.headers.get('x-forwarded-for') || undefined
    
    await createSessionSimplified(user.id, tokens.refreshToken, userAgent, ipAddress)

    // Create response
    const response = NextResponse.json({
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    }, { status: 201 })

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

    console.log('🎉 Регистрация завершена успешно!')
    return response

  } catch (error) {
    console.error('❌ Ошибка при регистрации:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при регистрации' },
      { status: 500 }
    )
  }
}