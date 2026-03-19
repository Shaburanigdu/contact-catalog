'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventForm } from '@/components/events/EventForm';
import { api } from '@/lib/api-client';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { id } = await params;
        const res = await api.get<{ success: boolean; data: any }>(`/api/events/${id}`);
        if (res.success) {
          setEvent(res.data);
        }
      } catch (error) {
        console.error('Failed to load event', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [params]);

  if (loading) return <div className="container mx-auto px-4 py-6">Загрузка...</div>;
  if (!event) return <div className="container mx-auto px-4 py-6">Событие не найдено</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Назад
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">Редактирование события</h1>
      </div>
      <EventForm initialData={event} />
    </div>
  );
}