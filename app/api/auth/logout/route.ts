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
    
    // Очищаем ВСЕ auth cookies
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    response.cookies.delete('session_id')
    
    // Также можно добавить очистку других cookies, если они есть
    // response.cookies.getAll().forEach(cookie => {
    //   response.cookies.delete(cookie.name)
    // })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Ошибка при выходе' },
      { status: 500 }
    )
  }
}