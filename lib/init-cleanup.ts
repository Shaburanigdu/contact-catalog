// lib/init-cleanup.ts
import { sessionCleanup } from './session-cleanup'

// Функция для инициализации при старте приложения
export async function initializeSessionCleanup() {
  try {
    console.log('🔧 Инициализация системы очистки сессий...')
    
    // Проверяем состояние сессий
    const stats = await sessionCleanup.getSessionStats()
    console.log('📊 Статистика сессий:', stats)
    
    // Если много старых сессий, запускаем немедленную очистку
    if (stats.cleanupRecommended) {
      console.log('⚠️  Обнаружено много сессий, запускаем очистку...')
      await sessionCleanup.cleanupOldSessions()
    }
    
    // Запускаем автоматическую очистку (каждые 24 часа)
    sessionCleanup.startAutomaticCleanup(24)
    
    console.log('✅ Система очистки сессий инициализирована')
    
    return stats
    
  } catch (error) {
    console.error('❌ Ошибка при инициализации очистки сессий:', error)
    return null
  }
}