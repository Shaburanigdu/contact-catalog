// scripts/test-refresh-token.js
import axios from 'axios';
import * as jose from 'jose';

const JWT_SECRET = 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = 'your-refresh-secret-change-in-production';

async function testRefreshToken() {
  try {
    // 1. Создаем истекший access токен (1 минута)
    const secret = new TextEncoder().encode(JWT_SECRET);
    const expiredAccessToken = await new jose.SignJWT({ 
      id: 'test-user-id', 
      email: 'test@example.com'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1m')
      .sign(secret);

    console.log('📝 Истекший access токен создан');
    
    // 2. Создаем валидный refresh токен (7 дней)
    const refreshSecret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);
    const refreshToken = await new jose.SignJWT({ 
      id: 'test-user-id', 
      email: 'test@example.com'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(refreshSecret);

    console.log('📝 Refresh токен создан');
    
    // 3. Пытаемся обновить токены через API
    const response = await axios.post('http://localhost:3000/api/auth/refresh', {}, {
      headers: {
        Cookie: `refresh_token=${refreshToken}`
      },
      withCredentials: true
    });

    console.log('✅ Ответ от сервера:', response.data);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

testRefreshToken();