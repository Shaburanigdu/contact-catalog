// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: 'Успешный выход',
    });

    // Удаление cookies
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    // Опционально: удаление всех возможных auth cookies
    const cookiesToDelete = [
      'access_token',
      'refresh_token',
      'session_id',
      'token',
      'auth_token',
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
    ];

    cookiesToDelete.forEach((cookieName) => {
      response.cookies.delete(cookieName);
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Ошибка при выходе' },
      { status: 500 }
    );
  }
}