// scripts/test-users-me.js
import axios from 'axios';

async function testUsersMe() {
  try {
    // 1. Логинимся
    console.log('🔐 Логинимся...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'testuser@example.com',
      password: 'password123'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Логин успешен');
    console.log('Access токен (первые 50 символов):', loginRes.data.accessToken?.substring(0, 50) || 'Нет в теле ответа');
    
    // 2. Пробуем получить текущего пользователя
    console.log('\n👤 Пробуем получить /api/users/me...');
    
    const meRes = await axios.get('http://localhost:3000/api/users/me', {
      withCredentials: true
    });
    
    console.log('✅ Успех! Пользователь:', meRes.data);
    
  } catch (error) {
    console.error('\n❌ Ошибка:');
    console.error('Статус:', error.response?.status);
    console.error('Данные:', error.response?.data);
    console.error('Заголовки запроса:', error.request?._headers);
    
    // Выведем cookies, которые отправились
    console.error('Cookies в запросе:', error.config?.headers?.Cookie || 'Нет');
  }
}

testUsersMe();