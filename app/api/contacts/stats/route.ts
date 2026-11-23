// app/api/contacts/stats/route.ts — numbers for the dashboard cards
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, ApiResponse } from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

const DAY = 24 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const now = Date.now()
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0))

    const [totalContacts, contactsByCityRaw, contactsWithoutInteraction, upcomingEventsCount, interactionsLast30Days] =
      await Promise.all([
        prisma.contact.count({ where: { user_id: user.id, deleted_at: null } }),
        prisma.contact.groupBy({
          by: ['city'],
          where: { user_id: user.id, deleted_at: null, city: { not: null } },
          _count: true,
          orderBy: { _count: { city: 'desc' } },
          take: 5,
        }),
        // No interaction for more than 3 months
        prisma.contact.count({
          where: {
            user_id: user.id,
            deleted_at: null,
            OR: [
              { last_interaction_date: null },
              { last_interaction_date: { lt: new Date(now - 90 * DAY) } },
            ],
          },
        }),
        prisma.event.count({
          where: { user_id: user.id, deleted_at: null, start_at: { gte: startOfToday } },
        }),
        prisma.interaction.count({
          where: { user_id: user.id, deleted_at: null, started_at: { gte: new Date(now - 30 * DAY) } },
        }),
      ])

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        totalContacts,
        contactsByCity: contactsByCityRaw.map((item) => ({ city: item.city, count: item._count })),
        contactsWithoutInteraction,
        upcomingEventsCount,
        interactionsLast30Days,
      },
    })
  } catch (error) {
    console.error('Failed to fetch contact stats:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке статистики' },
      { status: 500 }
    )
  }
}
