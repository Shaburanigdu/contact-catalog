// scripts/test-hash.js
const bcrypt = require('bcryptjs')

async function testHash() {
  // Пример JWT токена
  const jwtToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsImVtYWlsIjoidGVzdHVzZXJAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNzcwNDA3MzE3fQ.02vb3Kd__iw-ReorPOcpMoa3OV61KKAeJG2XgdKHwwc'
  
  console.log('🔐 Тест хэширования JWT токена:')
  console.log('Исходный токен (первые 50 символов):', jwtToken.substring(0, 50) + '...')
  
  // 1. Хэшируем
  const hash = await bcrypt.hash(jwtToken, 10)
  console.log('\n✅ Хэш создан:')
  console.log('   Длина хэша:', hash.length)
  console.log('   Хэш начинается с:', hash.substring(0, 20) + '...')
  console.log('   Хэш начинается с $2a$?:', hash.startsWith('$2a$'))
  
  // 2. Проверяем
  const isValid = await bcrypt.compare(jwtToken, hash)
  console.log('\n✅ Сравнение хэша с оригиналом:', isValid)
  
  // 3. Проверяем неправильный токен
  const wrongToken = jwtToken + 'wrong'
  const isWrongValid = await bcrypt.compare(wrongToken, hash)
  console.log('❌ Сравнение с неправильным токеном:', isWrongValid)
}

testHash().catch(console.error)