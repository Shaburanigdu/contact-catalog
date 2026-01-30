// scripts/test-refresh-in-app.js
// Тест, как будет работать в реальном браузере
const axios = require('axios');

async function simulateBrowserBehavior() {
  console.log('🌐 Имитация работы браузера\n');

  // Создаем экземпляр axios, который будет сохранять cookies
  const instance = axios.create({
    baseURL: 'http://localhost:3000',
    withCredentials: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  // 1. Логинимся
  console.log('1. Логинимся...');
  const loginRes = await instance.post('/api/auth/login', {
    email: 'testuser@example.com',
    password: 'password123'
  });

  console.log('✅ Логин успешен');
  console.log('Set-Cookie заголовки:', loginRes.headers['set-cookie'] ? 'Есть' : 'Нет');

  // 2. Проверяем /api/users/me
  console.log('\n2. Проверяем /api/users/me сразу после логина...');
  try {
    const meRes = await instance.get('/api/users/me');
    console.log('✅ Пользователь получен:', meRes.data);
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }

  // 3. Пробуем refresh
  console.log('\n3. Пробуем refresh...');
  try {
    const refreshRes = await instance.post('/api/auth/refresh', {});
    console.log('✅ Refresh успешен:', refreshRes.data);
  } catch (error) {
    console.error('❌ Ошибка refresh:', error.response?.data || error.message);
  }
}

simulateBrowserBehavior();