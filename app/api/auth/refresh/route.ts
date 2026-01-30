import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateTokens, validateSession, revokeSession, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Получаем refresh token из cookies
    const refreshToken = request.cookies.get('refresh_token')?.value
    const sessionId = request.cookies.get('session_id')?.value

    if (!refreshToken || !sessionId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Валидируем refresh token
    const userPayload = await verifyRefreshToken(refreshToken)
    
    // Проверяем сессию в БД
    const session = await validateSession(refreshToken, sessionId)
    
    // Отзываем старую сессию (security best practice)
    await revokeSession(sessionId)
    
    // Генерируем новые токены
    const tokens = await generateTokens(userPayload)
    
    // Создаем новую сессию
    const newSession = await createSession(
      userPayload.id,
      tokens.refreshToken,
      session.user_agent || undefined,
      session.ip_address || undefined
    )

    // Создаем ответ
    const response = NextResponse.json({
      success: true,
      accessToken: tokens.accessToken
    })

    // Устанавливаем новые cookies
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

    response.cookies.set('session_id', newSession.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Token refresh error:', error)
    
    const response = NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
    
    // Очищаем cookies при неудачной попытке обновления
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    response.cookies.delete('session_id')
    
    return response
  }
}