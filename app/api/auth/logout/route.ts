import { NextRequest, NextResponse } from 'next/server'
import { revokeSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value
    
    if (sessionId) {
      try {
        // Отзываем сессию в БД
        await revokeSession(sessionId)
      } catch (error) {
        console.log('Session revocation failed:', error)
      }
    }
    
    const response = NextResponse.json({
      message: 'Успешный выход'
    })
    
    // Очищаем ВСЕ auth cookies с разными параметрами
    const cookiesToDelete = [
      'access_token',
      'refresh_token', 
      'session_id',
      'token',
      'auth_token',
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url'
    ]
    
    cookiesToDelete.forEach(cookieName => {
      // Удаляем cookie с разными доменами и путями для надежности
      response.cookies.delete(cookieName)
      
      // Дополнительные параметры для полного удаления
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
        maxAge: 0
      })
    })
    
    // Также удаляем все cookies, которые могут быть связаны с аутентификацией
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.includes('auth') || 
          cookie.name.includes('token') || 
          cookie.name.includes('session')) {
        response.cookies.delete(cookie.name)
      }
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Ошибка при выходе' },
      { status: 500 }
    )
  }
}