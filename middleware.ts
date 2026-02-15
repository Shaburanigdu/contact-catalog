// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessTokenForMiddleware } from '@/lib/middleware-auth'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicPath = path === '/login' || path === '/register'
  
  console.log('\n🔍 Middleware запущен:')
  console.log('   Путь:', path)
  console.log('   Публичный путь?', isPublicPath)
  
  const token = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value
  
  if (token) {
    console.log('   Access токен найден:', token.substring(0, 20) + '...')
  } else {
    console.log('   Access токен НЕ найден')
  }

  // Redirect authenticated users away from auth pages
  if (isPublicPath && token) {
    console.log('   👤 Пользователь аутентифицирован, перенаправляем с публичной страницы...')
    try {
      const user = await verifyAccessTokenForMiddleware(token)
      console.log('   ✅ Токен валиден, пользователь:', user.email)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('   ❌ Токен невалиден:', errorMessage)
      // Token is invalid, continue
    }
  }

  // Protect dashboard routes
  if (path.startsWith('/dashboard')) {
    console.log('   🛡️  Защищенный маршрут, проверяем доступ...')
    
    if (!token) {
      console.log('   ❌ Нет access токена')
      
      // Проверяем наличие refresh токена
      if (refreshToken) {
        console.log('   🔄 Есть refresh токен, пытаемся обновить...')
        
        // Пробуем обновить токен
        try {
          const refreshUrl = new URL('/api/auth/refresh', request.url)
          
          // Создаем заголовки для запроса refresh
          const headers = new Headers()
          if (request.headers.has('cookie')) {
            headers.set('Cookie', request.headers.get('cookie')!)
          }
          
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: headers,
            credentials: 'include'
          })
          
          if (refreshResponse.ok) {
            console.log('   ✅ Токен успешно обновлен')
            
            // Клонируем response для установки новых cookies
            const response = NextResponse.next()
            
            // Копируем cookies из refresh response
            const setCookieHeader = refreshResponse.headers.get('set-cookie')
            if (setCookieHeader) {
              console.log('   🍪 Получены новые cookies:', setCookieHeader)
              
              // Разделяем cookies (могут быть несколько)
              const cookies = setCookieHeader.split(',').map(cookie => cookie.trim())
              
              cookies.forEach(cookie => {
                // Извлекаем имя cookie
                const match = cookie.match(/^([^=]+)=([^;]+)/)
                if (match) {
                  const [, name, value] = match
                  console.log(`   🍪 Устанавливаем cookie: ${name}=${value.substring(0, 20)}...`)
                  
                  // Находим параметры cookie
                  const maxAgeMatch = cookie.match(/Max-Age=(\d+)/i)
                  const expiresMatch = cookie.match(/Expires=([^;]+)/i)
                  const pathMatch = cookie.match(/Path=([^;]+)/i)
                  const sameSiteMatch = cookie.match(/SameSite=([^;]+)/i)
                  const httpOnly = cookie.includes('HttpOnly')
                  const secure = cookie.includes('Secure')
                  
                  // Устанавливаем cookie в ответ
                  response.cookies.set({
                    name,
                    value,
                    httpOnly,
                    secure,
                    sameSite: sameSiteMatch ? (sameSiteMatch[1].toLowerCase() as 'lax' | 'strict' | 'none') : 'lax',
                    maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1]) : undefined,
                    expires: expiresMatch ? new Date(expiresMatch[1]) : undefined,
                    path: pathMatch ? pathMatch[1] : '/'
                  })
                }
              })
            }
            
            console.log('   ✅ Cookies обновлены, пропускаем запрос')
            return response
          } else {
            console.log('   ❌ Не удалось обновить токен, статус:', refreshResponse.status)
          }
        } catch (refreshError) {
          console.log('   ❌ Ошибка при обновлении токена:', refreshError)
        }
      }
      
      console.log('   🔄 Перенаправляем на логин...')
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    try {
      console.log('   🔍 Проверяем токен...')
      const user = await verifyAccessTokenForMiddleware(token)
      console.log('   ✅ Токен валиден, пользователь:', user.email)
      return NextResponse.next()
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('   ❌ Токен невалиден:', errorMessage)
      
      // Если токен истек, пробуем обновить
      if (errorMessage.includes('expired') && refreshToken) {
        console.log('   🔄 Токен истек, пытаемся обновить...')
        
        try {
          const refreshUrl = new URL('/api/auth/refresh', request.url)
          
          // Создаем заголовки для запроса refresh
          const headers = new Headers()
          if (request.headers.has('cookie')) {
            headers.set('Cookie', request.headers.get('cookie')!)
          }
          
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: headers,
            credentials: 'include'
          })
          
          if (refreshResponse.ok) {
            console.log('   ✅ Токен успешно обновлен')
            
            // Клонируем response для установки новых cookies
            const response = NextResponse.next()
            
            // Копируем cookies из refresh response
            const setCookieHeader = refreshResponse.headers.get('set-cookie')
            if (setCookieHeader) {
              console.log('   🍪 Получены новые cookies:', setCookieHeader)
              
              // Разделяем cookies (могут быть несколько)
              const cookies = setCookieHeader.split(',').map(cookie => cookie.trim())
              
              cookies.forEach(cookie => {
                // Извлекаем имя cookie
                const match = cookie.match(/^([^=]+)=([^;]+)/)
                if (match) {
                  const [, name, value] = match
                  
                  // Находим параметры cookie
                  const maxAgeMatch = cookie.match(/Max-Age=(\d+)/i)
                  const expiresMatch = cookie.match(/Expires=([^;]+)/i)
                  const pathMatch = cookie.match(/Path=([^;]+)/i)
                  const sameSiteMatch = cookie.match(/SameSite=([^;]+)/i)
                  const httpOnly = cookie.includes('HttpOnly')
                  const secure = cookie.includes('Secure')
                  
                  // Устанавливаем cookie в ответ
                  response.cookies.set({
                    name,
                    value,
                    httpOnly,
                    secure,
                    sameSite: sameSiteMatch ? (sameSiteMatch[1].toLowerCase() as 'lax' | 'strict' | 'none') : 'lax',
                    maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1]) : undefined,
                    expires: expiresMatch ? new Date(expiresMatch[1]) : undefined,
                    path: pathMatch ? pathMatch[1] : '/'
                  })
                }
              })
            }
            
            console.log('   ✅ Cookies обновлены, пропускаем запрос')
            return response
          } else {
            console.log('   ❌ Не удалось обновить токен, статус:', refreshResponse.status)
          }
        } catch (refreshError) {
          console.log('   ❌ Ошибка при обновлении токена:', refreshError)
        }
      }
      
      console.log('   🔄 Перенаправляем на логин и очищаем cookies...')
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }
  }

  console.log('   ✅ Пропускаем запрос')
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register'
  ],
  runtime: 'nodejs' // Явно указываем Node.js runtime для поддержки crypto
}