const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function initDatabase() {
  console.log('🚀 Инициализация базы данных...\n')
  
  const commands = [
    {
      name: 'Проверка PostgreSQL',
      cmd: 'pg_isready -U postgres -h localhost -p 5432',
      errorMessage: 'PostgreSQL не запущен или недоступен'
    },
    {
      name: 'Создание базы данных dbname',
      cmd: 'psql -U postgres -c "CREATE DATABASE dbname;"',
      ignoreError: true // Игнорируем ошибку если БД уже существует
    },
    {
      name: 'Создание схемы Contact_catalog',
      cmd: 'psql -U postgres -d dbname -c "CREATE SCHEMA IF NOT EXISTS \\"Contact_catalog\\";"',
      ignoreError: true
    },
    {
      name: 'Установка расширения uuid',
      cmd: 'psql -U postgres -d dbname -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\";"',
      ignoreError: true
    }
  ]

  for (const command of commands) {
    console.log(`▶ ${command.name}...`)
    try {
      const { stdout, stderr } = await execAsync(command.cmd)
      if (stdout) console.log(`  ${stdout}`)
      if (!command.ignoreError && stderr) {
        console.error(`  ❌ ${stderr}`)
      } else {
        console.log(`  ✅ Успешно`)
      }
    } catch (error) {
      if (command.ignoreError) {
        console.log(`  ⚠ Пропущено (возможно уже существует)`)
      } else {
        console.error(`  ❌ Ошибка: ${error.message}`)
        console.error(`  Команда: ${command.cmd}`)
      }
    }
  }

  console.log('\n📋 Итоговая команда для проверки:')
  console.log('psql -U postgres -d dbname -c "\\\\dt \\"Contact_catalog\\".*"')
}

initDatabase()