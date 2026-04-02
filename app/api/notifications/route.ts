import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth'; // изменено

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    //console.log('User from getCurrentUser:', user); // добавить

    if (!user) {
      //console.log('No user found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // включаем последние 24 часа
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    //console.log('Date range:', { now, weekLater }); // добавить

    const reminders = await prisma.reminder.findMany({
      where: {
        user_id: user.id,
        due_at: {
          gte: oneDayAgo,
          lte: weekLater,
        },
        status: 'pending',
        deleted_at: null,
      },
      include: {
        contacts: { select: { first_name: true, last_name: true } },
        events: { select: { title: true } },
      },
      orderBy: { due_at: 'asc' },
    });

    //console.log('Found reminders:', reminders); // добавить

    const notifications = reminders.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      dueAt: r.due_at,
      contact: r.contacts ? `${r.contacts.first_name} ${r.contacts.last_name || ''}`.trim() : null,
      eventTitle: r.events?.title,
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('GET /api/notifications error:', error); // уже есть
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}