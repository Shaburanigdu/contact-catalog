// scripts/debug-sessions.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcryptjs')

async function debugSessions() {
  const userId = '11111111-1111-1111-1111-111111111111'
  
  console.log('🔍 Проверка сессий для пользователя:', userId)

  // 1. Проверим все сессии пользователя
  const sessions = await prisma.userSession.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  console.log(`📊 Найдено сессий: ${sessions.length}`)
  
  sessions.forEach((session, index) => {
    console.log(`\n--- Сессия ${index + 1} ---`)
    console.log('ID:', session.id)
    console.log('Создана:', session.created_at)
    console.log('Истекает:', session.expires_at)
    console.log('Отозвана:', session.revoked_at)
    console.log('User Agent:', session.user_agent)
    console.log('IP:', session.ip_address)
    console.log('Хэш токена (первые 20 символов):', session.refresh_token_hash.substring(0, 20) + '...')
    
    // Проверяем, не истекла ли сессия
    const now = new Date()
    const isExpired = session.expires_at < now
    console.log('Истекла:', isExpired)
    console.log('Активна:', !session.revoked_at && !isExpired)
  })

  // 2. Проверим, есть ли активные сессии
  const activeSessions = await prisma.userSession.findMany({
    where: {
      user_id: userId,
      revoked_at: null,
      expires_at: {
        gt: new Date()
      }
    }
  })

  console.log(`\n🎯 Активных сессий: ${activeSessions.length}`)

  // 3. Проверим последнюю сессию
  if (sessions.length > 0) {
    const lastSession = sessions[0]
    console.log('\n📝 Последняя сессия:')
    console.log('ID:', lastSession.id)
    console.log('Expires:', lastSession.expires_at)
    console.log('Revoked:', lastSession.revoked_at)
    
    // Проверим хэш
    const testToken = 'test_token'
    try {
      const hash = await bcrypt.hash(testToken, 10)
      console.log('Пример хэша для "test_token":', hash.substring(0, 30) + '...')
      console.log('Длина хэша:', hash.length)
    } catch (error) {
      console.error('Ошибка хэширования:', error.message)
    }
  }
}

debugSessions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())