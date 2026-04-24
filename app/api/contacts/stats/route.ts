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

    // Общее количество контактов
    const totalContacts = await prisma.contact.count({
      where: { user_id: user.id, deleted_at: null },
    })

    // Контакты по городам
    const contactsByCityRaw = await prisma.contact.groupBy({
      by: ['city'],
      where: { user_id: user.id, deleted_at: null, city: { not: null } },
      _count: true,
      orderBy: { _count: { city: 'desc' } },
      take: 5,
    })
    const contactsByCity = contactsByCityRaw.map((item) => ({
      city: item.city,
      count: item._count,
    }))

    // Контакты по типу отношений
    const contactsByRelationshipRaw = await prisma.contact.groupBy({
      by: ['relationship_type'],
      where: { user_id: user.id, deleted_at: null, relationship_type: { not: null } },
      _count: true,
      orderBy: { _count: { relationship_type: 'desc' } },
    })
    const contactsByRelationship = contactsByRelationshipRaw.map((item) => ({
      type: item.relationship_type,
      count: item._count,
    }))

    // Последние добавленные контакты (5 штук)
    const recentContacts = await prisma.contact.findMany({
      where: { user_id: user.id, deleted_at: null },
      select: { id: true, first_name: true, last_name: true, avatar_url: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5,
    })

    // Контакты без взаимодействия более 3 месяцев
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const contactsWithoutInteraction = await prisma.contact.count({
      where: {
        user_id: user.id,
        deleted_at: null,
        OR: [
          { last_interaction_date: null },
          { last_interaction_date: { lt: threeMonthsAgo } },
        ],
      },
    })

    // Предстоящие события (сегодня и позже) – используем правильное имя модели и поля
    let upcomingEventsCount = 0
    try {
      // Проверяем, существует ли модель event в Prisma (на случай, если ещё нет событий)
      upcomingEventsCount = await prisma.event.count({
        where: {
          user_id: user.id,
          deleted_at: null,
          start_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      })
    } catch (err) {
      console.error('Ошибка при подсчёте предстоящих событий (возможно, модель Event не синхронизирована):', err)
      upcomingEventsCount = 0
    }

    // Дни рождения в ближайшие 30 дней (если нужно для дашборда)
    const today = new Date()
    const next30Days = new Date()
    next30Days.setDate(today.getDate() + 30)
    const upcomingBirthdays = await prisma.contact.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        date_of_birth: { not: null },
        // Упрощённая фильтрация: сравниваем месяц и день
      },
      select: { id: true, first_name: true, last_name: true, date_of_birth: true, avatar_url: true },
      take: 5,
    })
    // Отфильтруем и вычислим дни до дня рождения на клиенте или здесь
    const birthdaysWithDays = upcomingBirthdays
      .map((contact) => ({
        ...contact,
        daysUntilBirthday: calculateDaysUntilBirthday(contact.date_of_birth!),
      }))
      .filter((b) => b.daysUntilBirthday <= 30)
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday)

    const stats = {
      totalContacts,
      contactsByCity,
      contactsByRelationship,
      recentContacts,
      upcomingBirthdays: birthdaysWithDays,
      contactsWithoutInteraction,
      upcomingEventsCount,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to fetch contact stats:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке статистики: ' + String(error) },
      { status: 500 }
    )
  }
}

function calculateDaysUntilBirthday(birthday: Date): number {
  const today = new Date()
  const currentYear = today.getFullYear()
  const nextBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate())
  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1)
  }
  const diffTime = nextBirthday.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}