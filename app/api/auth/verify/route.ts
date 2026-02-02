import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'No access token' },
        { status: 401 }
      )
    }

    const decoded = await verifyAccessToken(token)
    
    return NextResponse.json({
      valid: true,
      user: decoded
    })
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}