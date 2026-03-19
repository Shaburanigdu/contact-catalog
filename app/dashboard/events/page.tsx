'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Filter, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  location?: string;
  status: string;
  event_types?: { id: string; name: string; color: string };
  participants: Array<{ id: string; first_name: string; last_name: string }>;
}

interface EventType {
  id: string;
  name: string;
  color: string;
  is_system?: boolean;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    typeId: '',
    contactId: '',
    startDate: '',
    endDate: '',
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchEventTypes();
    fetchContacts();
    fetchTags();
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [filters, selectedTagIds]);

  const fetchEventTypes = async () => {
    try {
      const res = await api.get<{ success: boolean; data: EventType[] }>('/api/event-types');
      if (res.success) setEventTypes(res.data);
    } catch (error) {
      console.error('Failed to load event types', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await api.get<{ success: boolean; data: { contacts: any[] } }>('/api/contacts?limit=1000');
      if (res.success) {
        setContacts(res.data.contacts.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })));
      }
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get<{ success: boolean; data: { tags: any[] } }>('/api/tags?scope=event');
      if (res.success) {
        setAvailableTags(res.data.tags);
      }
    } catch (error) {
      console.error('Failed to load tags', error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.typeId && filters.typeId !== 'all') params.set('typeId', filters.typeId);
      if (filters.contactId) params.set('contactId', filters.contactId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (selectedTagIds.length > 0) {
        params.set('tagIds', selectedTagIds.join(','));
      }
      params.set('status', 'scheduled');

      const res = await api.get<{ success: boolean; data: { events: Event[]; pagination: any } }>(
        `/api/events?${params.toString()}`
      );
      if (res.success) {
        setEvents(res.data.events);
        setTotal(res.data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load events', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || selectedTagIds.length > 0;

  const resetAllFilters = () => {
    setFilters({ search: '', typeId: '', contactId: '', startDate: '', endDate: '' });
    setSelectedTagIds([]);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">События</h1>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Создать событие
          </Button>
        </Link>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Filter size={20} /> Фильтры
          </h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetAllFilters}>
              <XCircle size={16} className="mr-1" /> Сбросить все
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Поиск по названию"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <Select value={filters.typeId} onValueChange={(v) => setFilters(prev => ({ ...prev, typeId: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Тип события" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {eventTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.contactId} onValueChange={(v) => setFilters(prev => ({ ...prev, contactId: v === 'any' ? '' : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Участник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Любой</SelectItem>
              {contacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="Начало"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              type="date"
              placeholder="Конец"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Фильтр по тегам */}
        <div>
          <label className="text-sm font-medium mb-1 block">Теги</label>
          <MultiSelect
            options={availableTags.map(t => ({ value: t.id, label: t.name, color: t.color }))}
            selected={selectedTagIds}
            onChange={setSelectedTagIds}
            placeholder="Выберите теги"
          />
        </div>
      </div>

      {/* Список событий */}
      {loading && <div className="text-center py-12">Загрузка...</div>}
      {!loading && events.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Событий пока нет</h3>
          <p className="text-gray-600 mb-6">Создайте первое событие, чтобы начать планировать</p>
          <Link href="/dashboard/events/new">
            <Button>Создать событие</Button>
          </Link>
        </div>
      )}
      {!loading && events.length > 0 && (
        <div className="grid gap-4">
          {events.map(event => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`} className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(event.start_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    {event.end_at && ` — ${format(new Date(event.end_at), 'HH:mm')}`}
                  </p>
                  {event.location && <p className="text-sm text-gray-600 mt-1">📍 {event.location}</p>}
                  {event.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {event.participants.slice(0, 3).map(p => (
                        <Badge key={p.id} variant="secondary">{p.first_name} {p.last_name}</Badge>
                      ))}
                      {event.participants.length > 3 && <Badge variant="secondary">+{event.participants.length - 3}</Badge>}
                    </div>
                  )}
                </div>
                {event.event_types && (
                  <Badge style={{ backgroundColor: event.event_types.color, color: '#fff' }}>
                    {event.event_types.name}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}