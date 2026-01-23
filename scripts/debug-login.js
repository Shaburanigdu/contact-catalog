const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

async function debugLogin() {
  console.log('🔍 Отладка проблемы входа...\n')
  
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn']
  })

  try {
    await prisma.$connect()
    
    // 1. Получаем последнего зарегистрированного пользователя
    const latestUser = await prisma.users.findFirst({
      orderBy: { created_at: 'desc' }
    })
    
    if (!latestUser) {
      console.log('❌ Нет пользователей в базе')
      return
    }
    
    console.log('📋 Информация о последнем пользователе:')
    console.log(`   ID: ${latestUser.id}`)
    console.log(`   Email: ${latestUser.email}`)
    console.log(`   Username: ${latestUser.username}`)
    console.log(`   Password hash: ${latestUser.password_hash}`)
    console.log(`   Hash длина: ${latestUser.password_hash.length}`)
    
    // 2. Попробуем разные варианты пароля
    console.log('\n🔑 Тестируем разные пароли:')
    const testPasswords = [
      '123456',           // Минимальный пароль
      'password',         // Слово password
      latestUser.email,   // email как пароль
      '12345678',         // 8 символов
    ]
    
    for (const password of testPasswords) {
      const isValid = await bcrypt.compare(password, latestUser.password_hash)
      console.log(`   "${password}" - ${isValid ? '✅ СОВПАДАЕТ' : '❌ не совпадает'}`)
    }
    
    // 3. Проверим хеш
    console.log('\n🔍 Анализ хеша:')
    const hashParts = latestUser.password_hash.split('$')
    if (hashParts.length === 4) {
      console.log(`   Алгоритм: ${hashParts[1]}`)
      console.log(`   Соль: ${hashParts[2].substring(0, 10)}...`)
      console.log(`   Хеш: ${hashParts[3].substring(0, 20)}...`)
    }
    
    // 4. Создадим тестовый хеш для сравнения
    console.log('\n🧪 Тестовое создание хеша:')
    const testPassword = '123456'  // Попробуйте тот пароль, который вводите при регистрации
    const testHash = await bcrypt.hash(testPassword, 10)
    console.log(`   Хеш для "${testPassword}": ${testHash}`)
    
    // 5. Сравним с хешем в базе
    const testCompare = await bcrypt.compare(testPassword, latestUser.password_hash)
    console.log(`   Сравнение с хешем в базе: ${testCompare ? '✅ СОВПАДАЕТ' : '❌ НЕ СОВПАДАЕТ'}`)
    
    // 6. Проверим, что хеш создается правильно в вашем коде
    console.log('\n📝 Проверка функции hashPassword из lib/auth.ts:')
    console.log('   Убедитесь, что в app/api/auth/register/route.ts:')
    console.log('   используется await hashPassword(password)')
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

debugLogin()