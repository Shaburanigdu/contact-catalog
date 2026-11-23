// app/api/calendar/route.ts
// Everything that happens in a date range: events, pending reminders and birthdays.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { birthdaysInRange } from '@/lib/birthdays';

const MAX_RANGE_DAYS = 62;

function ageLabel(age: number): string {
  const mod10 = age % 10;
  const mod100 = age % 100;
  const word =
    mod10 === 1 && mod100 !== 11 ? 'год'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'года'
    : 'лет';
  return `исполняется ${age} ${word}`;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const from = new Date(sp.get('from') || '');
  const to = new Date(sp.get('to') || '');
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) {
    return NextResponse.json({ success: false, error: 'from/to are required ISO dates' }, { status: 400 });
  }
  if ((to.getTime() - from.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
    return NextResponse.json({ success: false, error: 'Range is too long' }, { status: 400 });
  }

  const [events, reminders, contacts] = await Promise.all([
    prisma.event.findMany({
      where: {
        user_id: user.id,
        start_at: { gte: from, lte: to },
        deleted_at: null, // past events stay visible as "completed"
      },
      select: {
        id: true,
        title: true,
        start_at: true,
        end_at: true,
        is_all_day: true,
        location: true,
        event_types: { select: { name: true, color: true } },
      },
      orderBy: { start_at: 'asc' },
    }),
    prisma.reminder.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        status: 'pending',
        due_at: { gte: from, lte: to },
      },
      select: {
        id: true,
        title: true,
        due_at: true,
        is_recurring: true,
        contacts: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { due_at: 'asc' },
    }),
    prisma.contact.findMany({
      where: { user_id: user.id, deleted_at: null, date_of_birth: { not: null } },
      select: { id: true, first_name: true, last_name: true, date_of_birth: true },
    }),
  ]);

  const items = [
    ...events.map((e) => ({
      type: 'event' as const,
      id: e.id,
      title: e.title,
      date: e.start_at,
      allDay: e.is_all_day ?? false,
      color: e.event_types?.color ?? null,
      subtitle: e.event_types?.name ?? e.location ?? null,
      href: `/dashboard/events/${e.id}`,
    })),
    ...reminders.map((r) => ({
      type: 'reminder' as const,
      id: r.id,
      title: r.title,
      date: r.due_at,
      allDay: false,
      color: null,
      subtitle: r.contacts ? [r.contacts.first_name, r.contacts.last_name].filter(Boolean).join(' ') : null,
      href: r.contacts ? `/dashboard/contacts/${r.contacts.id}` : null,
    })),
    ...contacts.flatMap((c) =>
      birthdaysInRange(c.date_of_birth!, from, to).map((date) => ({
        type: 'birthday' as const,
        id: `${c.id}-${date.getFullYear()}`,
        title: [c.first_name, c.last_name].filter(Boolean).join(' '),
        date,
        allDay: true,
        color: null,
        subtitle: ageLabel(date.getFullYear() - c.date_of_birth!.getUTCFullYear()),
        href: `/dashboard/contacts/${c.id}`,
      }))
    ),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({ success: true, data: items });
}
