// scripts/check-env.js
require('dotenv').config();

console.log('🔍 Проверка загрузки .env:');
console.log('JWT_SECRET:', process.env.JWT_SECRET || 'НЕ ЗАГРУЖЕН');
console.log('REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET || 'НЕ ЗАГРУЖЕН');
console.log('Длина JWT_SECRET:', process.env.JWT_SECRET?.length || 0);
console.log('Длина REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET?.length || 0);

// Проверка, совпадают ли секреты
const secretsMatch = 
  process.env.JWT_SECRET === 'your-secret-key-change-in-production' &&
  process.env.REFRESH_TOKEN_SECRET === 'your-refresh-secret-change-in-production';

console.log('\n✅ Секреты совпадают с кодом?', secretsMatch ? 'ДА' : 'НЕТ');