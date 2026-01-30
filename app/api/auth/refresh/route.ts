// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateTokens, createSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  console.log('\n🔵 ======= НОВЫЙ ЗАПРОС REFRESH =======')
  console.log('🔄 Обработка запроса на обновление токенов')
  
  try {
    // 1. Получаем cookies
    console.log('📦 Получаем cookies...')
    const allCookies = request.cookies.getAll()
    console.log('Все cookies:', allCookies)
    
    const refreshToken = request.cookies.get('refresh_token')?.value
    console.log('Refresh токен в cookies:', refreshToken ? `Есть (длина: ${refreshToken.length})` : 'Нет')
    
    if (!refreshToken) {
      console.log('❌ Нет refresh токена')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Проверяем refresh токен
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

    // 3. Ищем все сессии пользователя в БД для отладки
    console.log('\n🗄️ Ищем все сессии в БД для user_id:', userPayload.id)
    
    const allUserSessions = await prisma.userSession.findMany({
      where: {
        user_id: userPayload.id
      }
    })
    
    console.log(`📊 Всего сессий в БД: ${allUserSessions.length}`)
    
    // Выводим все сессии для отладки
    allUserSessions.forEach((session, index) => {
      const now = new Date()
      const isExpired = session.expires_at < now
      const isActive = !session.revoked_at && !isExpired
      
      console.log(`\n  Сессия ${index + 1}:`)
      console.log(`    ID: ${session.id}`)
      console.log(`    Создана: ${session.created_at?.toISOString() || 'null'}`)
      console.log(`    Истекает: ${session.expires_at.toISOString()}`)
      console.log(`    Отозвана: ${session.revoked_at?.toISOString() || 'нет'}`)
      console.log(`    Истекла: ${isExpired}`)
      console.log(`    Активна: ${isActive}`)
    })

    // 4. Ищем активные сессии (не отозванные и не истекшие)
    console.log('\n🔍 Ищем активные сессии (revoked_at = null, expires_at > now)...')
    
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
          details: 'No active sessions found',
          user_id: userPayload.id,
          session_count: allUserSessions.length
        },
        { status: 401 }
      )
    }

    // 5. Проверяем хэш для каждой активной сессии
    console.log('\n🔐 Проверяем хэш токена...')
    const bcrypt = await import('bcryptjs')
    let validSession = null
    
    for (const session of activeSessions) {
      console.log(`\n  Проверяем сессию ${session.id}:`)
      
      try {
        // Проверяем, что хранится в базе: хэш или сам токен
        const storedValue = session.refresh_token_hash
        
        // Если начинается с $2a$ - это bcrypt хэш
        const isBcryptHash = storedValue.startsWith('$2a$')
        
        let isValid = false
        
        if (isBcryptHash) {
          // Это bcrypt хэш - проверяем нормально
          isValid = await bcrypt.compare(refreshToken, storedValue)
          console.log(`    bcrypt хэш, совпадение: ${isValid}`)
        } else {
          // Это вероятно сам JWT токен (не хэширован)
          // ВНИМАНИЕ: ЭТО НЕБЕЗОПАСНО, НО ВРЕМЕННО ДЛЯ МИГРАЦИИ
          isValid = refreshToken === storedValue
          console.log(`    JWT токен (не хэш), совпадение: ${isValid}`)
          
          // Если нашли сессию с некорректным форматом, исправим ее
          if (isValid) {
            console.log(`    ⚠️  Исправляем сессию ${session.id}: конвертируем токен в хэш`)
            const correctHash = await bcrypt.hash(refreshToken, 10)
            await prisma.userSession.update({
              where: { id: session.id },
              data: { refresh_token_hash: correctHash }
            })
            console.log(`    ✅ Сессия исправлена`)
          }
        }
        
        if (isValid) {
          validSession = session
          console.log(`    ✅ Сессия найдена!`)
          break
        }
      } catch (error: any) {
        console.error(`    ❌ Ошибка проверки сессии:`, error.message)
      }
    }

    if (!validSession) {
      console.log('❌ Не найдено сессии с совпадающим хэшем')
      
      // Выводим пример хэша для отладки
      try {
        const testHash = await bcrypt.hash('test', 10)
        console.log('Пример хэша для "test":', testHash.substring(0, 30) + '...')
        
        if (activeSessions[0]) {
          console.log('Хэш в первой сессии:', activeSessions[0].refresh_token_hash.substring(0, 30) + '...')
        }
      } catch (error) {
        console.error('Ошибка создания тестового хэша:', error)
      }
      
      return NextResponse.json(
        { 
          error: 'Invalid session', 
          details: 'No matching hash found',
          active_sessions_count: activeSessions.length
        },
        { status: 401 }
      )
    }

    console.log('\n✅ Сессия найдена, создаем новые токены...')
    
    // 6. Отзываем старую сессию
    await prisma.userSession.update({
      where: { id: validSession.id },
      data: { revoked_at: new Date() }
    })
    console.log(`✅ Старая сессия ${validSession.id} отозвана`)
    
    // 7. Генерируем новые токены
    const tokens = await generateTokens(userPayload)
    console.log('✅ Новые токены сгенерированы')
    
    // 8. Создаем новую сессию с ПРАВИЛЬНЫМ ХЭШЕМ
    const newSession = await createSession(
      userPayload.id,
      tokens.refreshToken,
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    )

    console.log('✅ Новая сессия создана:', newSession.id)
    
    // 9. Создаем ответ
    const response = NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      new_session_id: newSession.id
    })

    // 10. Устанавливаем новые cookies
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
    console.log('🟢 ======= REFRESH УСПЕШЕН =======\n')
    
    return response

  } catch (error: any) {
    console.error('\n❌ Критическая ошибка в refresh:', error)
    console.error('Stack:', error.stack)
    
    // Создаем ответ об ошибке
    const response = NextResponse.json(
      { 
        error: 'Authentication failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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