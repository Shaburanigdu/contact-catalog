// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateTokens, createSession } from '@/lib/auth'  // Импортируем правильную createSession
import { loginSchema } from '@/lib/validation'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  console.log('\n🔵 ======= НОВЫЙ ЗАПРОС LOGIN =======')
  
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)
    
    console.log('📝 Данные для входа:', { 
      email: validatedData.email,
      password: '***'
    })

    // Ищем пользователя
    console.log('🔍 Поиск пользователя по email...')
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (!user) {
      console.log('❌ Пользователь не найден')
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }
    
    console.log('✅ Пользователь найден:', user.email)

    // Проверяем пароль
    console.log('🔐 Проверка пароля...')
    const isValidPassword = await verifyPassword(validatedData.password, user.password_hash)
    if (!isValidPassword) {
      console.log('❌ Неверный пароль')
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }
    
    console.log('✅ Пароль верный')

    // Генерируем токены
    console.log('🎫 Генерация токенов...')
    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username || undefined
    })

    // СОЗДАЕМ СЕССИЮ С ПРАВИЛЬНОЙ ФУНКЦИЕЙ createSession
    console.log('📱 Создание сессии...')
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    
    const session = await createSession(
      user.id,
      tokens.refreshToken,
      userAgent,
      ipAddress
    )

    console.log('✅ Сессия создана с ID:', session.id)

    // Обновляем последний вход
    console.log('🔄 Обновление времени последнего входа...')
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    })

    // Создаем ответ
    const response = NextResponse.json({
      message: 'Успешный вход',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    })

    // Устанавливаем cookies
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

    console.log('✅ Cookies установлены')
    console.log('🟢 ======= LOGIN УСПЕШЕН =======\n')
    return response

  } catch (error) {
    console.error('❌ Ошибка при входе:', error)
    
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