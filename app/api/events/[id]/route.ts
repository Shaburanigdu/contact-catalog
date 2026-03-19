// app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: {
        id,
        user_id: user.id,
        deleted_at: null,
      },
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
        },
        event_tags: {
          include: {
            tags: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        participants: event.event_participants.map(p => p.contacts),
        tags: event.event_tags.map(et => et.tags),
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Проверяем, что событие принадлежит пользователю
    const existing = await prisma.event.findFirst({
      where: { id, user_id: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Валидация
    if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
      return NextResponse.json({ error: 'Название не может быть пустым' }, { status: 400 });
    }
    if (body.start_at) {
      const startDate = new Date(body.start_at);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'Неверный формат даты начала' }, { status: 400 });
      }
    }

    // Приводим event_type_id: пустую строку → null
    const finalEventTypeId = body.event_type_id && body.event_type_id !== '' ? body.event_type_id : null;

    // Обновляем основные поля
    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        description: body.description !== undefined ? body.description : undefined,
        event_type_id: finalEventTypeId,
        start_at: body.start_at ? new Date(body.start_at) : undefined,
        end_at: body.end_at ? new Date(body.end_at) : null,
        is_all_day: body.is_all_day,
        timezone: body.timezone,
        location: body.location,
        location_lat: body.location_lat,
        location_lng: body.location_lng,
        is_recurring: body.is_recurring,
        recurrence_rule: body.recurrence_rule,
        status: body.status,
        // поддержка мягкого удаления: если в теле явно передан deleted_at: null, то снимаем мягкое удаление,
        // иначе оставляем текущее значение (не меняем)
        deleted_at: body.deleted_at === null ? null : existing.deleted_at,
      },
    });

    // Обновление участников (удаляем старые, добавляем новые)
    if (body.participants !== undefined) {
      await prisma.eventParticipant.deleteMany({
        where: { event_id: id },
      });
      if (Array.isArray(body.participants) && body.participants.length > 0) {
        await prisma.eventParticipant.createMany({
          data: body.participants.map((contactId: string) => ({
            event_id: id,
            contact_id: contactId,
            user_id: user.id,
          })),
        });
      }
    }

    // Обновление тегов (удалить старые, добавить новые)
    if (body.tags !== undefined) {
      await prisma.eventTag.deleteMany({
        where: { event_id: id },
      });
      if (Array.isArray(body.tags) && body.tags.length > 0) {
        await prisma.eventTag.createMany({
          data: body.tags.map((tagId: string) => ({
            event_id: id,
            tag_id: tagId,
          })),
        });
      }
    }

    // Обновление напоминания (удаляем старые, создаём новое, если передано)
    if (body.reminder !== undefined) {
      await prisma.reminder.deleteMany({
        where: { event_id: id },
      });
      if (body.reminder && body.reminder.due_at) {
        const dueDate = new Date(body.reminder.due_at);
        if (!isNaN(dueDate.getTime())) {
          await prisma.reminder.create({
            data: {
              user_id: user.id,
              event_id: id,
              title: body.reminder.title || `Напоминание: ${updated.title}`,
              due_at: dueDate,
              status: 'pending',
            },
          });
        } else {
          console.warn('Invalid reminder due date:', body.reminder.due_at);
        }
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Проверяем принадлежность
    const existing = await prisma.event.findFirst({
      where: { id, user_id: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Мягкое удаление (ставим deleted_at)
    await prisma.event.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}