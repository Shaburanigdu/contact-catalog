// app/api/users/me/route.ts - исправленная версия
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  console.log('👤 /api/users/me - получение данных пользователя')
  
  try {
    // Получаем access token из cookies
    const accessToken = request.cookies.get('access_token')?.value
    
    console.log('🍪 Access token в cookies:', accessToken ? 'Есть' : 'Нет')
    
    if (!accessToken) {
      console.log('❌ Нет access токена в cookies')
      return NextResponse.json(
        { error: 'Не авторизован', details: 'No access token' },
        { status: 401 }
      )
    }

    console.log('🔐 Проверяем access токен...')
    
    // Проверяем токен
    const userPayload = await verifyAccessToken(accessToken)
    
    console.log('✅ Токен валиден, пользователь:', userPayload.email)

    // Ищем пользователя в базе 
    const userData = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: {
        id: true,
        email: true,
        username: true,
        email_verified: true,
        full_name: true,
        avatar_url: true,
        settings: true,
        timezone: true,
        language: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
      }
    })

    if (!userData) {
      console.log('❌ Пользователь не найден в БД')
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    console.log('✅ Данные пользователя получены')
    
    // Форматируем даты для клиента (опционально)
    const formattedUserData = {
      ...userData,
      created_at: userData.created_at?.toISOString(),
      updated_at: userData.updated_at?.toISOString(),
      last_login_at: userData.last_login_at?.toISOString(),
      // Парсим settings JSON, если он есть
      settings: userData.settings ? 
        (typeof userData.settings === 'string' ? 
          JSON.parse(userData.settings) : 
          userData.settings) : 
        null
    }
    
    return NextResponse.json(formattedUserData)
    
  } catch (error: any) {
    console.error('❌ Ошибка в /api/users/me:', error.message)
    
    // Обработка специфичных ошибок Prisma
    if (error.code === 'P2025') { // Record not found
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }
    
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Невалидный или истекший токен' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Ошибка при получении данных пользователя',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Метод для обновления данных пользователя
export async function PATCH(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const userPayload = await verifyAccessToken(accessToken)
    const body = await request.json()

    // Тип для allowedUpdates
    type AllowedUpdates = {
      username?: string;
      full_name?: string;
      avatar_url?: string;
      timezone?: string;
      language?: string;
      settings?: any;
    }

    // Разрешаем обновлять только определенные поля
    const allowedUpdates: AllowedUpdates = {
      username: body.username,
      full_name: body.full_name,
      avatar_url: body.avatar_url,
      timezone: body.timezone,
      language: body.language,
      settings: body.settings
    }

    // Удаляем undefined поля
    const filteredUpdates: Record<string, any> = {}
    Object.entries(allowedUpdates).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredUpdates[key] = value
      }
    })

    const updatedUser = await prisma.user.update({
      where: { id: userPayload.id },
      data: {
        ...filteredUpdates,
        updated_at: new Date()
      },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        avatar_url: true,
        settings: true,
        timezone: true,
        language: true,
        created_at: true,
        updated_at: true
      }
    })

    // Форматируем ответ
    const formattedResponse = {
      ...updatedUser,
      created_at: updatedUser.created_at?.toISOString(),
      updated_at: updatedUser.updated_at?.toISOString(),
      settings: updatedUser.settings ? 
        (typeof updatedUser.settings === 'string' ? 
          JSON.parse(updatedUser.settings) : 
          updatedUser.settings) : 
        null
    }

    return NextResponse.json(formattedResponse)
    
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении пользователя:', error)
    
    if (error.code === 'P2002') { // Unique constraint violation
      return NextResponse.json(
        { error: 'Пользователь с таким именем или email уже существует' },
        { status: 409 }
      )
    }

    if (error.code === 'P2025') { // Record not found
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }
    
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Невалидный или истекший токен' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Ошибка при обновлении данных',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}