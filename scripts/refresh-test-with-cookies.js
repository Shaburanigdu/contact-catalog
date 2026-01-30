// scripts/refresh-test-with-cookies.js
const axios = require('axios');

async function testRefreshWithCookies() {
  console.log('🚀 Тест refresh с явной передачей cookies\n');

  // Будем хранить cookies вручную
  let cookies = [];

  // 1. Логинимся
  console.log('1. Логинимся...');
  const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'testuser@example.com',
    password: 'password123'
  });

  // Сохраняем cookies из ответа
  if (loginRes.headers['set-cookie']) {
    cookies = loginRes.headers['set-cookie'].map(cookie => {
      // Берем только перную часть до ';'
      return cookie.split(';')[0];
    });
    console.log('✅ Cookies получены:', cookies);
  } else {
    console.log('❌ Нет cookies в ответе');
    return;
  }

  // 2. Пытаемся сделать refresh сразу
  console.log('\n2. Пробуем refresh сразу...');
  
  try {
    const refreshRes = await axios.post('http://localhost:3000/api/auth/refresh', {}, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('✅ Refresh успешен!');
    console.log('Ответ:', refreshRes.data);
    
    // Обновляем cookies
    if (refreshRes.headers['set-cookie']) {
      cookies = refreshRes.headers['set-cookie'].map(cookie => cookie.split(';')[0]);
      console.log('Обновленные cookies:', cookies);
    }
    
  } catch (error) {
    console.error('❌ Ошибка refresh:', error.response?.data || error.message);
  }

  // 3. Проверяем /api/users/me
  console.log('\n3. Проверяем /api/users/me...');
  
  try {
    const meRes = await axios.get('http://localhost:3000/api/users/me', {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('✅ Пользователь получен:', meRes.data);
  } catch (error) {
    console.error('❌ Ошибка /api/users/me:', error.response?.data || error.message);
  }
}

testRefreshWithCookies();