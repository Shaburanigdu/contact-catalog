const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env' })

async function testPrisma() {
  console.log('🔍 Тестируем Prisma подключение...')
  
  try {
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    })

    // Тест 1: Подключение к БД
    console.log('\n1. Тестируем подключение...')
    await prisma.$connect()
    console.log('✅ Prisma подключился к БД')

    // Тест 2: Проверяем существование таблиц
    console.log('\n2. Проверяем таблицы...')
    
    try {
      const userCount = await prisma.users.count()
      console.log(`✅ Таблица users существует, записей: ${userCount}`)
    } catch (e) {
      console.log('❌ Таблица users не существует или нет доступа')
    }

    try {
      const sessionCount = await prisma.user_sessions.count()
      console.log(`✅ Таблица user_sessions существует, записей: ${sessionCount}`)
    } catch (e) {
      console.log('❌ Таблица user_sessions не существует или нет доступа')
    }

    // Тест 3: Пробуем создать тестового пользователя
    console.log('\n3. Тест создания пользователя...')
    try {
      const testUser = await prisma.users.create({
        data: {
          email: `test_${Date.now()}@test.com`,
          password_hash: 'test_hash',
          username: 'test_user'
        }
      })
      console.log(`✅ Тестовый пользователь создан: ${testUser.email}`)
      
      // Удаляем тестового пользователя
      await prisma.users.delete({
        where: { id: testUser.id }
      })
      console.log('✅ Тестовый пользователь удален')
    } catch (e) {
      console.log(`❌ Ошибка создания пользователя: ${e.message}`)
    }

    await prisma.$disconnect()
    console.log('\n✅ Все тесты Prisma пройдены!')
    
  } catch (error) {
    console.error('❌ Ошибка Prisma:', error.message)
    if (error.code === 'P1001') {
      console.error('Не могу подключиться к серверу БД')
      console.error('Убедитесь, что PostgreSQL запущен:')
      console.error('  Для Windows: services.msc → PostgreSQL')
    } else if (error.code === 'P1003') {
      console.error('База данных не существует')
    } else if (error.code === 'P1017') {
      console.error('Сервер закрыл соединение')
    }
  }
}

testPrisma()