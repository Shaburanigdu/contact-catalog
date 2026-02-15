// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateTokens } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  console.log('\n🔵 ======= НОВЫЙ ЗАПРОС REFRESH =======')
  console.log('🔄 Обновление токенов БЕЗ создания новой сессии')
  
  try {
    // 1. Получаем refresh токен из cookies
    const refreshToken = request.cookies.get('refresh_token')?.value
    
    if (!refreshToken) {
      console.log('❌ Нет refresh токена')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Проверяем JWT refresh токен
    console.log('\n🔐 Проверяем JWT refresh токен...')
    let userPayload
    try {
      userPayload = await verifyRefreshToken(refreshToken)
      console.log('✅ JWT валиден, пользователь:', userPayload.email)
    } catch (error: any) {
      console.error('❌ Ошибка верификации JWT:', error.message)
      return NextResponse.json(
        { error: 'Invalid refresh token', details: error.message },
        { status: 401 }
      )
    }

    // 3. Ищем активные сессии пользователя
    console.log('\n🔍 Ищем активные сессии пользователя...')
    
    const activeSessions = await prisma.userSession.findMany({
      where: {
        user_id: userPayload.id,
        revoked_at: null,
        expires_at: { gt: new Date() }
      }
    })
    
    console.log(`🎯 Найдено активных сессий: ${activeSessions.length}`)

    if (activeSessions.length === 0) {
      console.log('❌ Нет активных сессий')
      return NextResponse.json(
        { 
          error: 'Invalid session',
          details: 'No active sessions found'
        },
        { status: 401 }
      )
    }

    // 4. Ищем сессию с совпадающим refresh токеном
    console.log('\n🔐 Ищем сессию с совпадающим токеном...')
    const bcrypt = await import('bcryptjs')
    let validSession = null
    
    for (const session of activeSessions) {
      try {
        const storedValue = session.refresh_token_hash
        
        if (!storedValue) {
          console.log(`    ⚠️ У сессии ${session.id} нет хэша`)
          continue
        }
        
        // Проверяем формат хэша
        const isBcryptHash = storedValue.startsWith('$2a$')
        let isValid = false
        
        if (isBcryptHash) {
          isValid = await bcrypt.compare(refreshToken, storedValue)
        } else {
          // Старый формат (токен не хэширован)
          isValid = refreshToken === storedValue
          
          // Если нашли токен в старом формате, конвертируем его в хэш
          if (isValid) {
            console.log(`    ⚠️  Исправляем сессию ${session.id}: конвертируем токен в хэш`)
            const correctHash = await bcrypt.hash(refreshToken, 10)
            await prisma.userSession.update({
              where: { id: session.id },
              data: { refresh_token_hash: correctHash }
            })
          }
        }
        
        if (isValid) {
          validSession = session
          console.log(`    ✅ Сессия найдена: ${session.id}`)
          break
        }
      } catch (error: any) {
        console.error(`    ❌ Ошибка проверки сессии:`, error.message)
      }
    }

    if (!validSession) {
      console.log('❌ Не найдено сессии с совпадающим токеном')
      return NextResponse.json(
        { 
          error: 'Invalid session', 
          details: 'No matching session found'
        },
        { status: 401 }
      )
    }

    console.log('\n✅ Сессия найдена, обновляем токены...')
    
    // 5. Генерируем новые токены
    const tokens = await generateTokens(userPayload)
    console.log('✅ Новые токены сгенерированы')
    
    // 6. Обновляем СУЩЕСТВУЮЩУЮ сессию (НЕ создаем новую!)
    const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10)
    
    await prisma.userSession.update({
      where: { id: validSession.id },
      data: { 
        refresh_token_hash: newRefreshTokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // продлеваем на 7 дней
      }
    })
    
    console.log(`✅ Существующая сессия обновлена: ${validSession.id}`)
    console.log(`📅 Новая дата истечения: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`)
    
    // 7. Создаем ответ
    const response = NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      session_id: validSession.id // Возвращаем ID той же сессии
    })

    // 8. Устанавливаем новые cookies
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

    console.log('✅ Cookies обновлены')
    console.log('🟢 ======= REFRESH УСПЕШЕН (БЕЗ СОЗДАНИЯ НОВОЙ СЕССИИ) =======\n')
    
    return response

  } catch (error: any) {
    console.error('\n❌ Критическая ошибка в refresh:', error)
    
    const response = NextResponse.json(
      { 
        error: 'Authentication failed', 
        details: error.message
      },
      { status: 401 }
    )
    
    // Очищаем cookies при ошибке
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    
    console.log('🟡 ======= REFRESH ЗАВЕРШЕН С ОШИБКОЙ =======\n')
    return response
  }
}