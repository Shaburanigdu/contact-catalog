// lib/session-cleanup.ts
import { prisma } from './prisma'

export class SessionCleanupService {
  private static instance: SessionCleanupService
  private cleanupInterval: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {}

  static getInstance(): SessionCleanupService {
    if (!SessionCleanupService.instance) {
      SessionCleanupService.instance = new SessionCleanupService()
    }
    return SessionCleanupService.instance
  }

  async cleanupOldSessions() {
    if (this.isRunning) {
      console.log('🧹 Очистка уже выполняется...')
      return
    }

    this.isRunning = true
    console.log('🧹 Запуск автоматической очистки сессий...')
    
    try {
      const now = new Date()
      
      // Удаляем сессии старше 30 дней
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const deletedExpired = await prisma.userSession.deleteMany({
        where: {
          expires_at: { lt: thirtyDaysAgo }
        }
      })
      
      // Отзываем неактивные сессии старше 14 дней
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      
      const revokedOld = await prisma.userSession.updateMany({
        where: {
          revoked_at: null,
          created_at: { lt: fourteenDaysAgo } // Используем created_at вместо last_activity_at
        },
        data: {
          revoked_at: now
        }
      })
      
      console.log(`✅ Автоочистка завершена:
        Удалено истекших: ${deletedExpired.count}
        Отозвано старых: ${revokedOld.count}`)
        
      return {
        deletedExpired: deletedExpired.count,
        revokedOld: revokedOld.count,
        timestamp: now
      }
      
    } catch (error) {
      console.error('❌ Ошибка при автоочистке:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  async getSessionStats() {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const [total, active, expired, recent] = await Promise.all([
      prisma.userSession.count(),
      prisma.userSession.count({
        where: {
          revoked_at: null,
          expires_at: { gt: now }
        }
      }),
      prisma.userSession.count({
        where: {
          expires_at: { lt: now }
        }
      }),
      prisma.userSession.count({
        where: {
          created_at: { gt: sevenDaysAgo }
        }
      })
    ])
    
    return {
      total,
      active,
      expired,
      recent,
      cleanupRecommended: expired > 100 || total > 1000
    }
  }

  startAutomaticCleanup(intervalHours = 24) {
    if (this.cleanupInterval) {
      console.log('⏰ Автоматическая очистка уже запущена')
      return
    }
    
    console.log(`⏰ Запуск автоматической очистки каждые ${intervalHours} часов`)
    
    const intervalMs = intervalHours * 60 * 60 * 1000
    
    // Запускаем сразу
    this.cleanupOldSessions().catch(console.error)
    
    // Затем по расписанию
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions().catch(console.error)
    }, intervalMs)
    
    // Также очищаем при завершении процесса
    process.on('SIGTERM', () => this.stopAutomaticCleanup())
    process.on('SIGINT', () => this.stopAutomaticCleanup())
  }

  stopAutomaticCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('⏹️ Автоматическая очистка остановлена')
    }
  }
}

// Экспортируем синглтон
export const sessionCleanup = SessionCleanupService.getInstance()