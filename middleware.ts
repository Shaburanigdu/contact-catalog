import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessTokenForMiddleware, clearAuthCookiesForMiddleware } from '@/lib/middleware-auth'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicPath = path === '/login' || path === '/register'
  
  console.log('\n🔍 Middleware запущен:')
  console.log('   Путь:', path)
  console.log('   Публичный путь?', isPublicPath)
  
  const token = request.cookies.get('access_token')?.value
  
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
      console.log('   ❌ Нет токена, перенаправляем на логин')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      console.log('   🔍 Проверяем токен...')
      const user = await verifyAccessTokenForMiddleware(token)
      console.log('   ✅ Токен валиден, пользователь:', user.email)
      return NextResponse.next()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('   ❌ Токен невалиден:', errorMessage)
      console.log('   🔄 Перенаправляем на логин и очищаем cookies...')
      
      // Token expired or invalid, redirect to login
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