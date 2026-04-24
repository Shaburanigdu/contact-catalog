import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, ApiResponse } from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'   // обратите внимание: фигурные скобки
import { startOfMonth, subMonths, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Общее количество контактов
    const totalContacts = await prisma.contact.count({
      where: { user_id: userId, deleted_at: null }
    })

    // Всего событий
    const totalEvents = await prisma.event.count({
      where: { user_id: userId, deleted_at: null }
    })

    // Контакты без взаимодействия > 90 дней
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const contactsWithoutInteraction = await prisma.contact.count({
      where: {
        user_id: userId,
        deleted_at: null,
        OR: [
          { last_interaction_date: null },
          { last_interaction_date: { lt: threeMonthsAgo } }
        ]
      }
    })

    // Предстоящие события (сегодня и в будущем)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const upcomingEvents = await prisma.event.count({
      where: {
        user_id: userId,
        deleted_at: null,
        start_at: { gte: todayStart }
      }
    })

    // Контакты по городам
    const contactsByCityRaw = await prisma.contact.groupBy({
      by: ['city'],
      where: { user_id: userId, deleted_at: null, city: { not: null } },
      _count: { city: true },
      orderBy: { _count: { city: 'desc' } },
      take: 5
    })
    const contactsByCity: Array<{ city: string; count: number }> = contactsByCityRaw.map((item) => ({
      city: item.city!,
      count: item._count.city
    }))

    // Контакты по типу отношений
    const contactsByRelationshipRaw = await prisma.contact.groupBy({
      by: ['relationship_type'],
      where: { user_id: userId, deleted_at: null, relationship_type: { not: null } },
      _count: { relationship_type: true },
      orderBy: { _count: { relationship_type: 'desc' } }
    })
    const contactsByRelationship: Array<{ relationship: string; count: number }> = contactsByRelationshipRaw.map((item) => ({
      relationship: item.relationship_type!,
      count: item._count.relationship_type
    }))

    // Теги (через связь contact_tags)
    const tagsAgg = await prisma.tag.findMany({
      where: {
        user_id: userId,
        contact_tags: { some: { contacts: { deleted_at: null } } }
      },
      select: {
        name: true,
        _count: { select: { contact_tags: { where: { contacts: { deleted_at: null } } } } }
      }
    })
    const contactsByTag: Array<{ tag: string; count: number }> = tagsAgg.map((tag) => ({
      tag: tag.name,
      count: tag._count.contact_tags
    }))

    // Взаимодействия по месяцам (последние 12 месяцев)
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, i)
      return {
        start: startOfMonth(d),
        monthName: format(d, 'MMM yyyy')
      }
    }).reverse()

    const interactionsByMonth: Array<{ month: string; count: number }> = []
    for (const { start, monthName } of months) {
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      const count = await prisma.interaction.count({
        where: {
          user_id: userId,
          started_at: { gte: start, lte: end }
        }
      })
      interactionsByMonth.push({ month: monthName, count })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        totalContacts,
        totalEvents,
        contactsWithoutInteraction,
        upcomingEvents,
        contactsByCity,
        contactsByRelationship,
        contactsByTag,
        interactionsByMonth
      }
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке аналитики' },
      { status: 500 }
    )
  }
}