// scripts/check-secrets.js
console.log('🔐 Проверка секретов:');
console.log('JWT_SECRET из process.env:', process.env.JWT_SECRET?.substring(0, 10) + '...');
console.log('REFRESH_TOKEN_SECRET из process.env:', process.env.REFRESH_TOKEN_SECRET?.substring(0, 10) + '...');

// Проверим, одинаковые ли секреты в разных файлах
import fs from 'fs';
import path from 'path';

const authTs = fs.readFileSync(path.join(process.cwd(), 'lib/auth.ts'), 'utf-8');
const middlewareAuthTs = fs.readFileSync(path.join(process.cwd(), 'lib/middleware-auth.ts'), 'utf-8');

const jwtSecretRegex = /JWT_SECRET\s*=\s*process\.env\.JWT_SECRET\s*\|\|\s*['"]([^'"]+)['"]/;
const refreshSecretRegex = /REFRESH_TOKEN_SECRET\s*=\s*process\.env\.REFRESH_TOKEN_SECRET\s*\|\|\s*['"]([^'"]+)['"]/;

const authJWT = authTs.match(jwtSecretRegex)?.[1];
const authRefresh = authTs.match(refreshSecretRegex)?.[1];
const middlewareJWT = middlewareAuthTs.match(jwtSecretRegex)?.[1];
const middlewareRefresh = middlewareAuthTs.match(refreshSecretRegex)?.[1];

console.log('\n📄 auth.ts:');
console.log('  JWT_SECRET дефолт:', authJWT);
console.log('  REFRESH_TOKEN_SECRET дефолт:', authRefresh);

console.log('\n📄 middleware-auth.ts:');
console.log('  JWT_SECRET дефолт:', middlewareJWT);
console.log('  REFRESH_TOKEN_SECRET дефолт:', middlewareRefresh);

if (authJWT !== middlewareJWT || authRefresh !== middlewareRefresh) {
  console.error('\n❌ Секреты в файлах разные! Это причина проблемы.');
} else {
  console.log('\n✅ Секреты совпадают');
}