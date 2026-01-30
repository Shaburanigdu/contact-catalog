// scripts/test-refresh-simple.js
import axios from 'axios';

async function testRefresh() {
  try {
    // 1. Сначала залогинимся, чтобы получить реальные токены
    console.log('🔐 Логинимся...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'testuser@example.com', // Используйте реальный email
      password: 'password123'    // Используйте реальный пароль
    }, {
      withCredentials: true
    });

    console.log('✅ Логин успешен');
    console.log('Cookies из ответа:', loginResponse.headers['set-cookie']);

    // 2. Проверяем текущего пользователя
    console.log('\n👤 Проверяем текущего пользователя...');
    const userResponse = await axios.get('http://localhost:3000/api/users/me', {
      withCredentials: true
    });
    console.log('✅ Пользователь:', userResponse.data);

    // 3. Ждем 1 минуту (имитируем истечение access токена)
    console.log('\n⏳ Ждем 1 минуту...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 4. Пробуем обновить токены
    console.log('\n🔄 Пробуем обновить токены...');
    const refreshResponse = await axios.post('http://localhost:3000/api/auth/refresh', {}, {
      withCredentials: true
    });
    
    console.log('✅ Refresh успешен:', refreshResponse.data);
    console.log('Новые cookies:', refreshResponse.headers['set-cookie']);

    // 5. Проверяем пользователя с новыми токенами
    console.log('\n👤 Проверяем пользователя после refresh...');
    const userAfterRefresh = await axios.get('http://localhost:3000/api/users/me', {
      withCredentials: true
    });
    console.log('✅ Пользователь после refresh:', userAfterRefresh.data);

  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

testRefresh();