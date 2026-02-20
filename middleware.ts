// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path === '/login' || path === '/register';

  const token = request.cookies.get('access_token')?.value;

  // Для публичных страниц: если есть токен, проверяем его валидность
  if (isPublicPath && token) {
    try {
      const statusUrl = new URL('/api/auth/status', request.url);
      const statusResponse = await fetch(statusUrl, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });
      if (statusResponse.ok) {
        // Токен валиден — редирект на dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      // Токен невалиден — пропускаем на публичную страницу
    } catch {
      // Ошибка запроса — пропускаем
    }
  }

  // Защита маршрутов /dashboard
  if (path.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Токен есть — пропускаем, даже если истек (клиент сам обновит или перенаправит)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
  runtime: 'nodejs',
};