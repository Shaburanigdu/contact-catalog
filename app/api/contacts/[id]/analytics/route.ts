import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/request-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;

    // 1. Проверка авторизации
    const { user, error } = await authenticateRequest(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // 2. Проверка, что контакт принадлежит пользователю
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, user_id: user.id, deleted_at: null },
      select: { id: true, created_at: true }
    });
    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Контакт не найден' },
        { status: 404 }
      );
    }

    // 3. Общая статистика взаимодействий
    const totalInteractions = await prisma.interaction.count({
      where: { contact_id: contactId, deleted_at: null }
    });

    const lastInteraction = await prisma.interaction.findFirst({
      where: { contact_id: contactId, deleted_at: null },
      orderBy: { started_at: 'desc' },
      select: { started_at: true }
    });

    const firstInteraction = await prisma.interaction.findFirst({
      where: { contact_id: contactId, deleted_at: null },
      orderBy: { started_at: 'asc' },
      select: { started_at: true }
    });

    // 4. Динамика по месяцам (нативный SQL для группировки)
    const interactionsByMonthRaw = await prisma.$queryRaw<
      Array<{ month: string; count: bigint }>
    >`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', started_at), 'Month YYYY') as month,
        COUNT(*)::int as count
      FROM "Contact_catalog"."interactions"
      WHERE contact_id = ${contactId}::uuid
        AND deleted_at IS NULL
      GROUP BY DATE_TRUNC('month', started_at)
      ORDER BY DATE_TRUNC('month', started_at) ASC
    `;

    const interactionsByMonth = interactionsByMonthRaw.map(row => ({
      month: row.month.trim(),
      count: Number(row.count)
    }));

    // 5. Типы взаимодействий
    const interactionsByTypeRaw = await prisma.interaction.groupBy({
      by: ['interaction_type_id'],
      where: { contact_id: contactId, deleted_at: null, interaction_type_id: { not: null } },
      _count: true,
    });
    const typeIds = interactionsByTypeRaw.map(t => t.interaction_type_id!).filter(Boolean);
    const types = await prisma.interactionType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, name: true }
    });
    const typeMap = new Map(types.map(t => [t.id, t.name]));
    const interactionsByType = interactionsByTypeRaw.map(t => ({
      type: typeMap.get(t.interaction_type_id!) || 'Неизвестно',
      count: t._count
    }));

    // 6. Активность по дням недели (опционально)
    const weekdayRaw = await prisma.$queryRaw<Array<{ dow: number; count: bigint }>>`
      SELECT EXTRACT(DOW FROM started_at) as dow, COUNT(*)::int as count
      FROM "Contact_catalog"."interactions"
      WHERE contact_id = ${contactId}::uuid AND deleted_at IS NULL
      GROUP BY EXTRACT(DOW FROM started_at)
    `;
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const interactionsByWeekday = weekdayRaw.map(w => ({
      day: weekdays[Number(w.dow)],
      count: Number(w.count)
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalInteractions,
        lastInteraction: lastInteraction?.started_at || null,
        firstInteraction: firstInteraction?.started_at || null,
        interactionsByMonth,
        interactionsByType,
        interactionsByWeekday
      }
    });
  } catch (error) {
    console.error('Failed to fetch contact analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при загрузке аналитики контакта' },
      { status: 500 }
    );
  }
}