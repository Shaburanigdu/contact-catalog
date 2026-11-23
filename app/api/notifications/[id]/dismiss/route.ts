import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { nextOccurrence } from '@/lib/recurrence';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ожидаем params
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем, что напоминание принадлежит пользователю
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: id,
        user_id: user.id,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const now = new Date();
    const next =
      reminder.is_recurring && reminder.recurrence_pattern
        ? nextOccurrence(reminder.due_at, reminder.recurrence_pattern, now, reminder.recurrence_end_date)
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.reminder.update({
        where: { id },
        data: { status: 'completed', completed_at: now },
      });

      // A repeating reminder schedules its next occurrence when the current one is done.
      if (next) {
        await tx.reminder.create({
          data: {
            user_id: reminder.user_id,
            contact_id: reminder.contact_id,
            event_id: reminder.event_id,
            interaction_id: reminder.interaction_id,
            title: reminder.title,
            description: reminder.description,
            due_at: next,
            is_recurring: true,
            recurrence_pattern: reminder.recurrence_pattern,
            recurrence_end_date: reminder.recurrence_end_date,
            notification_channels: reminder.notification_channels,
            priority: reminder.priority,
            status: 'pending',
          },
        });
      }
    });

    return NextResponse.json({ success: true, nextDueAt: next });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}