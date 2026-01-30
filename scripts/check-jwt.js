// scripts/check-jwt.js
import * as jose from 'jose';

// Те же секреты, что и в auth.ts
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production';

async function decodeAndVerifyToken(token, isRefresh = false) {
  try {
    const secret = new TextEncoder().encode(isRefresh ? REFRESH_TOKEN_SECRET : JWT_SECRET);
    const { payload, protectedHeader } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256']
    });
    
    console.log('✅ Токен валиден');
    console.log('Заголовок:', protectedHeader);
    console.log('Полезная нагрузка:', payload);
    console.log('Истекает:', new Date(payload.exp * 1000).toLocaleString());
    return true;
  } catch (error) {
    console.error('❌ Ошибка верификации:', error.message);
    return false;
  }
}

// Пример токена из вашего лога
const accessToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsImVtYWlsIjoidGVzdHVzZXJAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNzY5Nzk1NDY3fQ.u3cKjKODoaUU-Wwj8wYIstPVmeRFHH9PvoXqXZ9MfXI';
const refreshToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsImVtYWlsIjoidGVzdHVzZXJAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNzcwMzk5MzY3fQ.Ylg2FHfhTgKftxjn16Wcp3EWIfV5scvXBvtROwJ4n90';

console.log('🔍 Проверяем ACCESS токен:');
await decodeAndVerifyToken(accessToken);

console.log('\n🔍 Проверяем REFRESH токен:');
await decodeAndVerifyToken(refreshToken, true);

// Также проверим время истечения
const now = Math.floor(Date.now() / 1000);
console.log('\n📅 Текущее время (timestamp):', now);