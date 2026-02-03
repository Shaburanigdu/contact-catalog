// app/api/auth/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Запуск очистки старых сессий...')
    
    // Проверяем секретный ключ для безопасности
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.CRON_SECRET || 'cron-secret'}`
    
    if (authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const now = new Date()
    
    // 1. Удаляем истекшие сессии старше 30 дней
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const expiredSessions = await prisma.userSession.deleteMany({
      where: {
        expires_at: { lt: thirtyDaysAgo }
      }
    })
    
    console.log(`✅ Удалено ${expiredSessions.count} истекших сессий старше 30 дней`)
    
    // 2. Отзываем старые активные сессии (старше 14 дней)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    const revokedSessions = await prisma.userSession.updateMany({
      where: {
        revoked_at: null,
        created_at: { lt: fourteenDaysAgo }
      },
      data: {
        revoked_at: now
      }
    })
    
    console.log(`✅ Отозвано ${revokedSessions.count} старых сессий`)
    
    // 3. Удаляем сессии с пустым refresh_token_hash (если такое возможно)
    // Только если это поле может быть пустым
    const emptyHashSessions = await prisma.userSession.deleteMany({
      where: {
        refresh_token_hash: ''
      }
    })
    
    console.log(`✅ Удалено ${emptyHashSessions.count} сессий с пустым хэшем`)
    
    // 4. Статистика
    const totalSessions = await prisma.userSession.count()
    const activeSessions = await prisma.userSession.count({
      where: {
        revoked_at: null,
        expires_at: { gt: now }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Очистка завершена',
      stats: {
        expiredDeleted: expiredSessions.count,
        revoked: revokedSessions.count,
        emptyHashDeleted: emptyHashSessions.count,
        totalSessions,
        activeSessions
      }
    })
    
  } catch (error: any) {
    console.error('❌ Ошибка при очистке сессий:', error)
    return NextResponse.json(
      { 
        error: 'Cleanup failed', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET метод для проверки состояния
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    
    const stats = {
      totalSessions: await prisma.userSession.count(),
      activeSessions: await prisma.userSession.count({
        where: {
          revoked_at: null,
          expires_at: { gt: now }
        }
      }),
      expiredSessions: await prisma.userSession.count({
        where: {
          expires_at: { lt: now }
        }
      }),
      oldSessions14Days: await prisma.userSession.count({
        where: {
          created_at: { 
            lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      oldSessions30Days: await prisma.userSession.count({
        where: {
          created_at: { 
            lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      stats,
      recommendations: {
        cleanupRecommended: stats.oldSessions30Days > 0 || stats.expiredSessions > 100,
        estimatedStorage: `${(stats.totalSessions * 0.5).toFixed(2)} KB`
      }
    })
    
  } catch (error: any) {
    console.error('❌ Ошибка при получении статистики:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}