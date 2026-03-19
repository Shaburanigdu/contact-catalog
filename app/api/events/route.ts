// app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';

// Функция для автоматического архивирования прошедших событий
async function archivePastEvents(userId: string) {
  try {
    const now = new Date();
    const pastEvents = await prisma.event.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        start_at: { lt: now },
      },
      select: { id: true },
    });

    if (pastEvents.length > 0) {
      await prisma.event.updateMany({
        where: {
          id: { in: pastEvents.map(e => e.id) },
        },
        data: { deleted_at: now },
      });
      console.log(`✅ Archived ${pastEvents.length} past events for user ${userId}`);
    }
  } catch (error) {
    console.error('Error archiving past events:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Автоматически архивируем прошедшие события перед формированием ответа
    await archivePastEvents(user.id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const status = searchParams.get('status') || 'scheduled';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const typeId = searchParams.get('typeId');
    const contactId = searchParams.get('contactId');
    const search = searchParams.get('search');

    const where: any = {
      user_id: user.id,
    };

    if (status === 'archived') {
      // В архиве: события с deleted_at не null (прошедшие или удалённые)
      where.deleted_at = { not: null };
    } else {
      // Активные: не удалённые
      where.deleted_at = null;
      if (status === 'scheduled') {
        where.status = 'scheduled';
        // Показываем только будущие и текущие (прошедшие уже ушли в архив)
        where.start_at = { gte: new Date() };
      } else {
        where.status = status;
      }
    }

    // Фильтр по диапазону дат (start_at)
    if (startDate || endDate) {
      const startAtFilter: any = {};
      if (startDate) startAtFilter.gte = startOfDay(new Date(startDate));
      if (endDate) startAtFilter.lte = endOfDay(new Date(endDate));
      
      if (where.start_at) {
        // Если уже есть условие по дате (например, для scheduled), комбинируем через AND
        where.AND = [
          { start_at: where.start_at },
          { start_at: startAtFilter }
        ];
        delete where.start_at;
      } else {
        where.start_at = startAtFilter;
      }
    }

    if (typeId) {
      where.event_type_id = typeId;
    }

    if (contactId) {
      where.event_participants = {
        some: { contact_id: contactId },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          event_types: true,
          event_participants: {
            include: {
              contacts: {
                select: { id: true, first_name: true, last_name: true, avatar_url: true },
              },
            },
          },
          reminders: {
            where: { deleted_at: null },
            select: { id: true, due_at: true, title: true },
          },
          event_tags: {
            include: {
              tags: true,
            },
          },
        },
        orderBy: { start_at: 'asc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events: events.map(event => ({
          ...event,
          participants: event.event_participants.map(p => p.contacts),
          tags: event.event_tags.map(et => et.tags),
        })),
        pagination: { page, limit, total },
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = await getCurrentUser();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      event_type_id,
      start_at,
      end_at,
      is_all_day,
      timezone,
      location,
      location_lat,
      location_lng,
      is_recurring,
      recurrence_rule,
      participants,
      reminder,
      tags,
    } = body;

    // Валидация
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }
    if (!start_at) {
      return NextResponse.json({ error: 'Дата начала обязательна' }, { status: 400 });
    }

    const startDate = new Date(start_at);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Неверный формат даты начала' }, { status: 400 });
    }

    // Приводим event_type_id: пустую строку → null
    const finalEventTypeId = event_type_id && event_type_id !== '' ? event_type_id : null;

    // Получаем пользователя для timezone
    const user = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: { timezone: true }
    });
    const userTimezone = user?.timezone || 'UTC';

    // Создание события
    const event = await prisma.event.create({
      data: {
        user_id: userPayload.id,
        title: title.trim(),
        description: description || null,
        event_type_id: finalEventTypeId,
        start_at: startDate,
        end_at: end_at ? new Date(end_at) : null,
        is_all_day: is_all_day || false,
        timezone: timezone || userTimezone,
        location: location || null,
        location_lat,
        location_lng,
        is_recurring: is_recurring || false,
        recurrence_rule: recurrence_rule || null,
        status: 'scheduled',
      },
    });

    // Добавление участников
    if (participants && Array.isArray(participants) && participants.length > 0) {
      await prisma.eventParticipant.createMany({
        data: participants.map((contactId: string) => ({
          event_id: event.id,
          contact_id: contactId,
          user_id: userPayload.id,
        })),
      });
    }

    // Добавление тегов
    if (tags && Array.isArray(tags) && tags.length > 0) {
      await prisma.eventTag.createMany({
        data: tags.map((tagId: string) => ({
          event_id: event.id,
          tag_id: tagId,
        })),
      });
    }

    // Создание напоминания (если указано)
    if (reminder && reminder.due_at) {
      const dueDate = new Date(reminder.due_at);
      if (!isNaN(dueDate.getTime())) {
        await prisma.reminder.create({
          data: {
            user_id: userPayload.id,
            event_id: event.id,
            title: reminder.title || `Напоминание: ${title}`,
            due_at: dueDate,
            status: 'pending',
          },
        });
      } else {
        console.warn('Invalid reminder due date:', reminder.due_at);
      }
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}