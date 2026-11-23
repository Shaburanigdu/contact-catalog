'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Bell, Cake, CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ItemType = 'event' | 'reminder' | 'birthday';

interface CalendarItem {
  type: ItemType;
  id: string;
  title: string;
  date: string;
  allDay: boolean;
  color: string | null;
  subtitle: string | null;
  href: string | null;
}

const TYPE_STYLE: Record<ItemType, { dot: string; chip: string; label: string }> = {
  event: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-800', label: 'Событие' },
  reminder: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800', label: 'Напоминание' },
  birthday: { dot: 'bg-pink-500', chip: 'bg-pink-50 text-pink-800', label: 'День рождения' },
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function ItemIcon({ type }: { type: ItemType }) {
  if (type === 'birthday') return <Cake className="h-4 w-4 text-pink-500" />;
  if (type === 'reminder') return <Bell className="h-4 w-4 text-amber-500" />;
  return <CalendarDays className="h-4 w-4 text-blue-500" />;
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  useEffect(() => {
    const from = days[0];
    const to = new Date(days[days.length - 1]);
    to.setHours(23, 59, 59, 999);
    setLoading(true);
    api
      .get<{ success: boolean; data: CalendarItem[] }>(
        `/api/calendar?from=${from.toISOString()}&to=${to.toISOString()}`
      )
      .then((res) => setItems(res.success ? res.data : []))
      .catch((e) => console.error('Failed to load calendar:', e))
      .finally(() => setLoading(false));
  }, [days]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = format(new Date(item.date), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) || []), item]);
    }
    return map;
  }, [items]);

  const selectedItems = itemsByDay.get(format(selected, 'yyyy-MM-dd')) || [];

  const goTo = (m: Date) => {
    setMonth(startOfMonth(m));
    setSelected(isSameMonth(m, new Date()) ? new Date() : startOfMonth(m));
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">Календарь</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goTo(addMonths(month, -1))} aria-label="Предыдущий месяц">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center font-medium capitalize">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </span>
          <Button variant="outline" size="icon" onClick={() => goTo(addMonths(month, 1))} aria-label="Следующий месяц">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => goTo(new Date())}>
            Сегодня
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
        {(Object.keys(TYPE_STYLE) as ItemType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_STYLE[t].dot}`} />
            {TYPE_STYLE[t].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
          <div className="grid grid-cols-7 border-b bg-gray-50 text-xs font-medium text-gray-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayItems = itemsByDay.get(key) || [];
              const inMonth = isSameMonth(day, month);
              const isSelected = isSameDay(day, selected);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={[
                    'min-h-[64px] sm:min-h-[96px] border-b border-r p-1 sm:p-1.5 text-left align-top transition-colors',
                    inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400',
                    isSelected ? 'ring-2 ring-inset ring-blue-500' : 'hover:bg-blue-50/40',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm',
                      isToday(day) ? 'bg-blue-600 text-white font-semibold' : '',
                    ].join(' ')}
                  >
                    {format(day, 'd')}
                  </span>
                  {/* Compact dots on phones, titles on larger screens */}
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {dayItems.slice(0, 4).map((item) => (
                      <span key={item.type + item.id} className={`h-1.5 w-1.5 rounded-full ${TYPE_STYLE[item.type].dot}`} />
                    ))}
                  </div>
                  <div className="mt-1 hidden sm:block space-y-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.type + item.id}
                        className={`truncate rounded px-1 text-[11px] leading-4 ${TYPE_STYLE[item.type].chip}`}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[11px] text-gray-500 px-1">ещё {dayItems.length - 3}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base capitalize">
              {format(selected, 'EEEE, d MMMM', { locale: ru })}
            </CardTitle>
            <Link href="/dashboard/events/new">
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Событие
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-gray-500">На этот день ничего не запланировано.</p>
            ) : (
              <ul className="space-y-3">
                {selectedItems.map((item) => {
                  const body = (
                    <div className="flex gap-3">
                      <ItemIcon type={item.type} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          {item.allDay ? TYPE_STYLE[item.type].label : format(new Date(item.date), 'HH:mm')}
                          {item.subtitle ? ` · ${item.subtitle}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={item.type + item.id}>
                      {item.href ? (
                        <Link href={item.href} className="block rounded-md -m-1 p-1 hover:bg-gray-50">
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
