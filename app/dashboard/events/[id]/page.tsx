'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, MapPin, Users, Clock, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  location?: string;
  event_types?: { id: string; name: string; color: string };
  participants: Array<{ id: string; first_name: string; last_name: string; avatar_url?: string }>;
  reminders?: Array<{ id: string; due_at: string; title?: string }>;
  status: string;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { id } = await params;
        const res = await api.get<{ success: boolean; data: Event }>(`/api/events/${id}`);
        if (res.success) {
          setEvent(res.data);
        } else {
          setError('Событие не найдено');
        }
      } catch (err) {
        setError('Ошибка при загрузке события');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [params]);

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm('Вы уверены, что хотите удалить событие? Оно будет перемещено в архив.')) return;
    try {
      const res = await api.delete<{ success: boolean }>(`/api/events/${event.id}`);
      if (res.success) {
        router.push('/dashboard/events');
        router.refresh();
      }
    } catch (err) {
      console.error('Ошибка при удалении:', err);
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-6">Загрузка...</div>;
  if (error || !event) return (
    <div className="container mx-auto px-4 py-6">
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Ошибка</h2>
        <p className="text-gray-600 mb-6">{error || 'Событие не найдено'}</p>
        <Button onClick={() => router.push('/dashboard/events')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Вернуться к списку
        </Button>
      </div>
    </div>
  );

  const startDate = new Date(event.start_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/events')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> К списку
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">{event.title}</h1>
        {event.event_types && (
          <Badge style={{ backgroundColor: event.event_types.color, color: '#fff' }}>
            {event.event_types.name}
          </Badge>
        )}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Детали события</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Дата и время</p>
                <p className="text-gray-600">
                  {format(startDate, 'dd MMMM yyyy, HH:mm', { locale: ru })}
                  {endDate && ` — ${format(endDate, 'HH:mm')}`}
                </p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Место</p>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              </div>
            )}

            {event.description && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5" /> {/* отступ для выравнивания */}
                <div>
                  <p className="font-medium">Описание</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {event.participants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Участники
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {event.participants.map(p => (
                  <Link
                    key={p.id}
                    href={`/dashboard/contacts/${p.id}`}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                    )}
                    <span className="text-sm">{p.first_name} {p.last_name}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {event.reminders && event.reminders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Напоминания
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {event.reminders.map(r => (
                  <li key={r.id} className="text-sm text-gray-600">
                    {format(new Date(r.due_at), 'dd MMM yyyy, HH:mm', { locale: ru })} — {r.title || 'Напоминание'}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Редактировать
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}