const { Client } = require('pg')
require('dotenv').config({ path: '.env' })

async function checkAllTables() {
  console.log('🔍 Проверяем ВСЕ таблицы и данные...\n')
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    
    // 1. Получаем список всех таблиц
    console.log('📊 1. Список всех таблиц в схеме Contact_catalog:')
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'Contact_catalog'
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows
    console.log(`   Всего таблиц: ${tables.length}\n`)
    
    // 2. Для каждой таблицы проверяем количество записей
    for (const [index, table] of tables.entries()) {
      try {
        const countResult = await client.query(`
          SELECT COUNT(*) as count
          FROM "Contact_catalog"."${table.table_name}"
        `)
        
        console.log(`   ${index + 1}. ${table.table_name} - ${countResult.rows[0].count} записей`)
      } catch (e) {
        console.log(`   ${index + 1}. ${table.table_name} - Ошибка: ${e.message}`)
      }
    }

    // 3. Проверяем данные в ключевых таблицах
    console.log('\n📊 2. Детальная проверка основных таблиц:')
    
    const keyTables = ['users', 'contacts', 'events', 'interactions']
    
    for (const table of keyTables) {
      try {
        const result = await client.query(`
          SELECT COUNT(*) as count, 
                 MIN(created_at) as oldest,
                 MAX(created_at) as newest
          FROM "Contact_catalog"."${table}"
        `)
        
        const row = result.rows[0]
        console.log(`\n   📁 ${table}:`)
        console.log(`     📊 Записей: ${row.count}`)
        console.log(`     📅 Диапазон дат: ${row.oldest} - ${row.newest}`)
        
        // Покажем несколько записей для users
        if (table === 'users') {
          const users = await client.query(`
            SELECT id, email, username, created_at 
            FROM "Contact_catalog"."users" 
            ORDER BY created_at DESC 
            LIMIT 3
          `)
          console.log(`     👤 Последние пользователи:`)
          users.rows.forEach(user => {
            console.log(`       - ${user.email} (${user.username}) - ${user.created_at}`)
          })
        }
        
        // Покажем несколько записей для contacts
        if (table === 'contacts') {
          const contacts = await client.query(`
            SELECT id, first_name, last_name, email, created_at 
            FROM "Contact_catalog"."contacts" 
            ORDER BY created_at DESC 
            LIMIT 3
          `)
          console.log(`     👥 Последние контакты:`)
          contacts.rows.forEach(contact => {
            console.log(`       - ${contact.first_name} ${contact.last_name} (${contact.email}) - ${contact.created_at}`)
          })
        }
        
      } catch (e) {
        console.log(`\n   ❌ Ошибка при проверке ${table}: ${e.message}`)
      }
    }

    // 4. Проверяем структуру базы
    console.log('\n📊 3. Общая информация о базе данных:')
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database,
        version() as version,
        pg_database_size(current_database()) as size_bytes,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'Contact_catalog') as table_count
    `)
    
    const info = dbInfo.rows[0]
    console.log(`   💾 База данных: ${info.database}`)
    console.log(`   🐘 PostgreSQL версия: ${info.version.split(',')[0]}`)
    console.log(`   📦 Размер базы: ${Math.round(info.size_bytes / 1024 / 1024)} MB`)
    console.log(`   📊 Таблиц в схеме Contact_catalog: ${info.table_count}`)

    await client.end()
    console.log('\n✅ Все проверки завершены. База данных цела и содержит все таблицы!')
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message)
    console.error('   Проверьте строку подключения в .env:', process.env.DATABASE_URL)
  }
}

checkAllTables()