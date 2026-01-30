// scripts/quick-refresh-test.js
const axios = require('axios');

async function testRefresh() {
  console.log('🚀 Быстрая проверка refresh токена\n');

  // 1. Логинимся
  console.log('1. Логинимся...');
  const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'testuser@example.com',
    password: 'password123'
  }, {
    withCredentials: true
  });
  
  console.log('✅ Логин успешен');
  console.log('   Cookies установлены\n');

  // 2. Ждем 1 минуту (имитируем истечение access токена)
  console.log('2. Ждем 1 минуту (имитация истечения access токена)...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  console.log('✅ 1 минута прошла\n');

  // 3. Пробуем refresh токен
  console.log('3. Пробуем обновить токены...');
  try {
    const refreshRes = await axios.post('http://localhost:3000/api/auth/refresh', {}, {
      withCredentials: true
    });
    
    console.log('✅ Refresh успешен!');
    console.log('   Ответ:', refreshRes.data);
    
    // 4. Проверяем, можем ли получить пользователя с новым токеном
    console.log('\n4. Проверяем пользователя с новым токеном...');
    const userRes = await axios.get('http://localhost:3000/api/users/me', {
      withCredentials: true
    });
    
    console.log('✅ Пользователь получен:', userRes.data);
    console.log('\n🎉 ВСЁ РАБОТАЕТ! Refresh токен работает корректно.');
    
  } catch (error) {
    console.error('❌ Ошибка refresh:', error.response?.data || error.message);
    console.log('\n⚠️ Refresh не работает. Проблема в эндпоинте /api/auth/refresh');
  }
}

testRefresh();