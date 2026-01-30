// scripts/test-refresh-final.js
const axios = require('axios');

async function testRefreshWithExistingUser() {
  console.log('🔄 Тест refresh с существующим пользователем\n');

  const testEmail = 'testuser@example.com';
  const testPassword = 'password123';

  let cookies = [];

  // 1. Логинимся с существующим пользователем
  console.log('1. Логинимся...');
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: testEmail,
      password: testPassword
    }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });

    cookies = loginRes.headers['set-cookie']?.map(c => c.split(';')[0]) || [];
    console.log('✅ Логин успешен');
    console.log('Пользователь:', loginRes.data.user.email);
    
  } catch (error) {
    console.error('❌ Ошибка логина:', error.response?.data || error.message);
    console.log('\n⚠️  Возможно, пароль неверный или пользователь не существует.');
    console.log('Попробуйте создать пользователя через скрипт: node scripts/create-test-user.js');
    return;
  }

  // 2. Делаем несколько запросов
  console.log('\n2. Делаем запросы с разными интервалами...');
  
  const makeRequest = async (attempt) => {
    try {
      const res = await axios.get('http://localhost:3000/api/users/me', {
        headers: { Cookie: cookies.join('; ') }
      });
      console.log(`  ${attempt}: ✅ Успех, пользователь: ${res.data.email}`);
      return true;
    } catch (error) {
      console.log(`  ${attempt}: ❌ Ошибка: ${error.response?.data?.error || error.message}`);
      return false;
    }
  };

  await makeRequest('Запрос 1');
  
  // 3. Делаем refresh
  console.log('\n3. Делаем refresh...');
  try {
    const refreshRes = await axios.post('http://localhost:3000/api/auth/refresh', {}, {
      headers: { Cookie: cookies.join('; ') }
    });
    
    console.log('✅ Refresh успешен:', refreshRes.data.message);
    
    // Обновляем cookies
    if (refreshRes.headers['set-cookie']) {
      cookies = refreshRes.headers['set-cookie'].map(c => c.split(';')[0]);
      console.log('Cookies обновлены');
    }
    
  } catch (error) {
    console.error('❌ Ошибка refresh:', error.response?.data || error.message);
    console.log('Детали:', error.response?.data?.details);
  }

  // 4. Проверяем после refresh
  console.log('\n4. Проверяем после refresh...');
  await makeRequest('Запрос после refresh');

  // 5. Проверяем сессии в БД
  console.log('\n5. Проверяем сессии...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.users.findUnique({
      where: { email: testEmail }
    });
    
    if (user) {
      const sessions = await prisma.userSession.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        take: 3
      });
      
      console.log(`Последние 3 сессии пользователя ${user.email}:`);
      sessions.forEach((session, i) => {
        console.log(`  ${i + 1}. ID: ${session.id.substring(0, 8)}..., Отозвана: ${session.revoked_at ? 'Да' : 'Нет'}`);
      });
    }
  } catch (error) {
    console.error('Ошибка проверки сессий:', error.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🎉 Тест завершен!');
}

testRefreshWithExistingUser();