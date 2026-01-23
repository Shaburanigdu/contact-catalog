const { Client } = require('pg')
require('dotenv').config({ path: '.env' })

async function checkDbname() {
  console.log('🔍 Проверяем базу данных dbname...\n')
  
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/dbname'
  })

  try {
    await client.connect()
    
    // 1. Проверяем текущую базу
    const dbResult = await client.query('SELECT current_database()')
    console.log(`✅ Подключены к базе: ${dbResult.rows[0].current_database}`)
    
    // 2. Проверяем все таблицы в схеме Contact_catalog
    console.log('\n📋 Все таблицы в схеме Contact_catalog:')
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'Contact_catalog'
      ORDER BY table_name
    `)
    
    console.log(`Всего таблиц: ${tables.rows.length}`)
    tables.rows.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name}`)
    })
    
    // 3. Проверяем количество записей в users
    const usersCount = await client.query(`
      SELECT COUNT(*) as count FROM "Contact_catalog".users
    `)
    console.log(`\n👤 Пользователей в базе dbname: ${usersCount.rows[0].count}`)
    
    // 4. Сравниваем с базой postgres
    console.log('\n🔍 Сравнение с базой postgres:')
    const postgresClient = new Client({
      connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    })
    
    await postgresClient.connect()
    const postgresTables = await postgresClient.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'Contact_catalog'
    `)
    
    console.log(`Таблиц в postgres.Contact_catalog: ${postgresTables.rows[0].count}`)
    console.log(`Таблиц в dbname.Contact_catalog: ${tables.rows.length}`)
    
    await client.end()
    await postgresClient.end()
    
    if (tables.rows.length > 2) {
      console.log('\n✅ УРА! Ваша полная база данных найдена в dbname!')
      console.log('   Исправьте .env чтобы использовать DATABASE_URL с dbname')
    } else {
      console.log('\n❌ Ой! В dbname тоже только 2 таблицы...')
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    if (error.code === '3D000') {
      console.error('База данных dbname не существует!')
      console.error('Создайте её: psql -U postgres -c "CREATE DATABASE dbname;"')
    }
  }
}

checkDbname()