// lib/logger.ts
import { prisma } from './prisma'

interface LogEntry {
  id: string
  action: string
  details: string
  created_at: Date
}

export class CleanupLogger {
  private static logFile = 'cleanup.log'
  
  static async log(message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      message,
      data,
      environment: process.env.NODE_ENV
    }
    
    console.log(`[${timestamp}] ${message}`, data ? data : '')
    
    // Если у вас есть таблица cleanupLog, раскомментируйте:
    /*
    try {
      await prisma.cleanupLog.create({
        data: {
          action: message,
          details: JSON.stringify(data || {}),
          created_at: new Date(timestamp)
        }
      })
    } catch (error) {
      console.error('Ошибка логирования:', error)
    }
    */
  }
  
  static async getStats(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    // Если у вас есть таблица cleanupLog, раскомментируйте:
    /*
    const logs = await prisma.cleanupLog.findMany({
      where: {
        created_at: { gte: since }
      },
      orderBy: { created_at: 'desc' }
    })
    
    return {
      totalCleanups: logs.length,
      lastCleanup: logs[0],
      sessionsRemoved: logs.reduce((acc: number, log: LogEntry) => {
        try {
          const details = JSON.parse(log.details)
          return acc + (details.deletedCount || 0)
        } catch {
          return acc
        }
      }, 0)
    }
    */
    
    return {
      totalCleanups: 0,
      lastCleanup: null,
      sessionsRemoved: 0
    }
  }
}