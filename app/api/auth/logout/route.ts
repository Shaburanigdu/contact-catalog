import { NextRequest, NextResponse } from 'next/server'
import { revokeSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get session ID from cookies or request body
    const sessionId = request.cookies.get('session_id')?.value
    const refreshToken = request.cookies.get('refresh_token')?.value
    
    if (sessionId) {
      try {
        await revokeSession(sessionId)
      } catch (error) {
        console.log('Не удалось отозвать сессию:', error)
      }
    }
    
    // Clear cookies
    const response = NextResponse.json({
      message: 'Успешный выход'
    })
    
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    response.cookies.delete('session_id')
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Ошибка при выходе' },
      { status: 500 }
    )
  }
}