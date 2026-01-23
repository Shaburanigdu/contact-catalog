const { Client } = require('pg')
require('dotenv').config({ path: '.env' })

async function testPostgreSQL() {
  console.log('🔍 Тестируем подключение к PostgreSQL...')
  
  const connectionConfigs = [
    {
      name: 'Прямое подключение к postgres',
      connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    },
    {
      name: 'Подключение к dbname',
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dbname'
    }
  ]

  for (const config of connectionConfigs) {
    console.log(`\n📊 ${config.name}:`)
    console.log(`Строка подключения: ${config.connectionString}`)
    
    const client = new Client({
      connectionString: config.connectionString,
      connectionTimeoutMillis: 5000
    })

    try {
      await client.connect()
      console.log('✅ Подключение успешно!')
      
      // Проверяем список баз данных
      const result = await client.query('SELECT datname FROM pg_database ORDER BY datname')
      console.log('📋 Доступные базы данных:')
      result.rows.forEach(row => {
        console.log(`  - ${row.datname}`)
      })

      // Проверяем текущую базу
      const currentDB = await client.query('SELECT current_database()')
      console.log(`Текущая база данных: ${currentDB.rows[0].current_database}`)

      // Проверяем схему Contact_catalog
      const schemaCheck = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'Contact_catalog'
      `)
      
      if (schemaCheck.rows.length > 0) {
        console.log('✅ Схема Contact_catalog существует')
        
        // Проверяем таблицы в схеме
        const tables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'Contact_catalog'
          ORDER BY table_name
        `)
        
        console.log('📋 Таблицы в схеме Contact_catalog:')
        if (tables.rows.length > 0) {
          tables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`)
          })
        } else {
          console.log('  ❌ Нет таблиц в схеме')
        }
      } else {
        console.log('❌ Схема Contact_catalog не существует')
      }

      await client.end()
      
    } catch (error) {
      console.error(`❌ Ошибка подключения: ${error.message}`)
      if (error.code === '28P01') {
        console.error('Неверный пароль. Проверьте пароль в .env')
      } else if (error.code === '3D000') {
        console.error('База данных не существует')
        console.log('Создайте базу данных командой:')
        console.log('  psql -U postgres -c "CREATE DATABASE dbname;"')
      }
    }
  }
}

// Проверяем переменные окружения
console.log('🔧 Проверка переменных окружения:')
console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`)
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Установлен' : '❌ Не установлен'}`)

testPostgreSQL()