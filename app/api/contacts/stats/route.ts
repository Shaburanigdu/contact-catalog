import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, ApiResponse } from '@/lib/request-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Получаем статистику контактов
    const [
      totalContacts,
      contactsByCity,
      contactsByRelationship,
      recentContacts,
      upcomingBirthdays,
      contactsWithoutInteraction
    ] = await Promise.all([
      // Общее количество контактов
      prisma.contact.count({
        where: {
          user_id: user.id,
          deleted_at: null,
        },
      }),

      // Контакты по городам
      prisma.contact.groupBy({
        by: ['city'],
        where: {
          user_id: user.id,
          deleted_at: null,
          city: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            city: 'desc',
          },
        },
        take: 5,
      }),

      // Контакты по типу отношений
      prisma.contact.groupBy({
        by: ['relationship_type'],
        where: {
          user_id: user.id,
          deleted_at: null,
          relationship_type: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            relationship_type: 'desc',
          },
        },
      }),

      // Последние добавленные контакты
      prisma.contact.findMany({
        where: {
          user_id: user.id,
          deleted_at: null,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          avatar_url: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),

      // Предстоящие дни рождения (в ближайшие 30 дней)
      prisma.contact.findMany({
        where: {
          user_id: user.id,
          deleted_at: null,
          date_of_birth: { not: null },
          OR: [
            {
              date_of_birth: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
                lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
              },
            },
            // Учитываем переход через год
            {
              date_of_birth: {
                gte: new Date(new Date().getFullYear(), 11, new Date().getDate()),
                lte: new Date(new Date().getFullYear() + 1, 0, new Date().getDate()),
              },
            },
          ],
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          date_of_birth: true,
          avatar_url: true,
        },
        orderBy: { date_of_birth: 'asc' },
        take: 5,
      }),

      // Контакты без взаимодействия более 3 месяцев
      prisma.contact.count({
        where: {
          user_id: user.id,
          deleted_at: null,
          OR: [
            { last_interaction_date: null },
            {
              last_interaction_date: {
                lt: new Date(new Date().setMonth(new Date().getMonth() - 3)),
              },
            },
          ],
        },
      }),
    ])

    const stats = {
      totalContacts,
      contactsByCity: contactsByCity.map(item => ({
        city: item.city,
        count: item._count,
      })),
      contactsByRelationship: contactsByRelationship.map(item => ({
        type: item.relationship_type,
        count: item._count,
      })),
      recentContacts,
      upcomingBirthdays: upcomingBirthdays.map(contact => ({
        ...contact,
        daysUntilBirthday: calculateDaysUntilBirthday(contact.date_of_birth!),
      })),
      contactsWithoutInteraction,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to fetch contact stats:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке статистики' },
      { status: 500 }
    )
  }
}

function calculateDaysUntilBirthday(birthday: Date): number {
  const today = new Date()
  const currentYear = today.getFullYear()
  
  // Устанавливаем день рождения в текущем году
  const nextBirthday = new Date(
    currentYear,
    birthday.getMonth(),
    birthday.getDate()
  )
  
  // Если день рождения в этом году уже прошел, берем следующий год
  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1)
  }
  
  // Вычисляем разницу в днях
  const diffTime = nextBirthday.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}