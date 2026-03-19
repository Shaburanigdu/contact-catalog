'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Loader2, Plus, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import RecurrencePicker from '@/components/events/RecurrencePicker';
import ReminderPicker from '@/components/events/ReminderPicker';

interface EventType {
  id: string;
  name: string;
  color: string;
  is_system?: boolean;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface EventFormProps {
  initialData?: any;
}

const COLOR_PALETTE = [
  { value: '#3B82F6', textColor: 'white' },  // blue-600
  { value: '#EF4444', textColor: 'white' },  // red-500
  { value: '#10B981', textColor: 'white' },  // emerald-500
  { value: '#F59E0B', textColor: 'black' },  // amber-500
  { value: '#8B5CF6', textColor: 'white' },  // violet-500
  { value: '#EC4899', textColor: 'white' },  // pink-500
  { value: '#6366F1', textColor: 'white' },  // indigo-500
  { value: '#14B8A6', textColor: 'black' },  // teal-500
  { value: '#F97316', textColor: 'black' },  // orange-500
  { value: '#84CC16', textColor: 'black' },  // lime-500
  { value: '#06B6D4', textColor: 'black' },  // cyan-500
  { value: '#059669', textColor: 'white' },  // green-600
  { value: '#D946EF', textColor: 'white' },  // fuchsia-500
  { value: '#0EA5E9', textColor: 'white' },  // sky-500
  { value: '#64748B', textColor: 'white' },  // slate-500
];

export function EventForm({ initialData }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string }>>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(initialData?.participants?.map((p: any) => p.id) || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags?.map((t: any) => t.id) || []);
  const [startDate, setStartDate] = useState<Date | undefined>(initialData?.start_at ? new Date(initialData.start_at) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(initialData?.end_at ? new Date(initialData.end_at) : undefined);
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(initialData?.recurrence_rule || null);
  const [reminder, setReminder] = useState<{ due_at: Date; title?: string } | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');

  // Состояния для диалога создания нового типа
  const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState(COLOR_PALETTE[0].value);
  const [creatingType, setCreatingType] = useState(false);

  // Состояния для диалога создания нового тега
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLOR_PALETTE[0].value);
  const [creatingTag, setCreatingTag] = useState(false);

  // Состояния для валидации
  const [errors, setErrors] = useState<{ title?: string; startDate?: string }>({});

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    event_type_id: initialData?.event_type_id || '',
    location: initialData?.location || '',
    is_all_day: initialData?.is_all_day || false,
  });

  useEffect(() => {
    fetchEventTypes();
    fetchContacts();
    fetchTags();
  }, []);

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
      const res = await api.get<{ success: boolean; data: { contacts: Contact[] } }>('/api/contacts?limit=1000');
      if (res.success) {
        setContacts(res.data.contacts.map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })));
      }
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  };

  const fetchTags = async () => {
    try {
      // Загружаем только теги, которые могут быть использованы для событий (например, все или с параметром scope)
      const res = await api.get<{ success: boolean; data: { tags: Tag[] } }>('/api/tags?scope=event');
      if (res.success) {
        setAvailableTags(res.data.tags);
      }
    } catch (error) {
      console.error('Failed to load tags', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Очищаем ошибку для этого поля, если она была
    if (e.target.name === 'title' && errors.title) {
      setErrors(prev => ({ ...prev, title: undefined }));
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date && errors.startDate) {
      setErrors(prev => ({ ...prev, startDate: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    }
    if (!startDate) {
      newErrors.startDate = 'Дата начала обязательна';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Проверка валидности даты напоминания
      const reminderPayload = reminder && reminder.due_at && !isNaN(reminder.due_at.getTime())
        ? { due_at: reminder.due_at.toISOString(), title: reminder.title }
        : null;

      const payload = {
        ...formData,
        start_at: startDate?.toISOString(),
        end_at: endDate?.toISOString(),
        participants: selectedParticipants,
        tags: selectedTags,
        recurrence_rule: recurrenceRule,
        reminder: reminderPayload,
      };

      const url = initialData ? `/api/events/${initialData.id}` : '/api/events';
      const method = initialData ? 'PUT' : 'POST';

      const res = method === 'POST'
        ? await api.post<{ success: boolean; data: any }>(url, payload)
        : await api.put<{ success: boolean; data: any }>(url, payload);

      if (res.success) {
        router.push('/dashboard/events');
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Ошибка при сохранении события');
    } finally {
      setLoading(false);
    }
  };

  const createNewType = async () => {
    if (!newTypeName.trim()) return;
    setCreatingType(true);
    try {
      const res = await api.post<{ success: boolean; data: EventType }>('/api/event-types', {
        name: newTypeName,
        color: newTypeColor,
      });
      if (res.success) {
        setEventTypes(prev => [...prev, res.data]);
        setFormData(prev => ({ ...prev, event_type_id: res.data.id }));
        setShowNewTypeDialog(false);
        setNewTypeName('');
        setNewTypeColor(COLOR_PALETTE[0].value);
      }
    } catch (error: any) {
      console.error('Error creating event type:', error);
      const errorMessage = error?.response?.data?.error || error.message || 'Ошибка при создании типа события';
      alert(errorMessage);
    } finally {
      setCreatingType(false);
    }
  };

  const createNewTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const res = await api.post<{ success: boolean; data: { tag: Tag } }>('/api/tags', {
        name: newTagName,
        color: newTagColor,
        scope: 'event', // указываем, что тег для событий
      });
      if (res.success) {
        const newTag = res.data.tag;
        setAvailableTags(prev => [...prev, newTag]);
        setSelectedTags(prev => [...prev, newTag.id]);
        setShowNewTagDialog(false);
        setNewTagName('');
        setNewTagColor(COLOR_PALETTE[0].value);
      }
    } catch (error: any) {
      console.error('Error creating tag:', error);
      const errorMessage = error?.response?.data?.error || error.message || 'Ошибка при создании тега';
      alert(errorMessage);
    } finally {
      setCreatingTag(false);
    }
  };

  const selectedType = eventTypes.find(t => t.id === formData.event_type_id);
  const filteredTypes = eventTypes.filter(t =>
    t.name.toLowerCase().includes(typeSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium mb-2">
          Название <span className="text-red-500">*</span>
        </label>
        <Input
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Введите название события"
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Описание</label>
        <Textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Подробности события..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Дата и время начала <span className="text-red-500">*</span>
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground",
                  errors.startDate && "border-red-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP HH:mm', { locale: ru }) : <span>Выберите дату</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                initialFocus
              />
              <div className="p-3 border-t">
                <Input
                  type="time"
                  onChange={(e) => {
                    if (startDate) {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(startDate);
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      handleStartDateChange(newDate);
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
          {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Дата и время окончания</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP HH:mm', { locale: ru }) : <span>Выберите дату</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
              <div className="p-3 border-t">
                <Input
                  type="time"
                  onChange={(e) => {
                    if (endDate) {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(endDate);
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      setEndDate(newDate);
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Reminder Picker */}
      <ReminderPicker
        startDate={startDate}
        onChange={setReminder}
        initialReminder={initialData?.reminders?.[0]}
      />

      {/* Тип события с кнопкой создания нового */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Тип события</label>
          <div className="flex gap-2">
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="flex-1 justify-between"
                >
                  {selectedType ? (
                    <span style={{ color: selectedType.color }}>{selectedType.name}</span>
                  ) : (
                    "Выберите тип..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Поиск типа..."
                    value={typeSearch}
                    onValueChange={setTypeSearch}
                  />
                  <CommandEmpty>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setNewTypeName(typeSearch);
                        setShowNewTypeDialog(true);
                        setOpenCombobox(false);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Создать "{typeSearch}"
                    </Button>
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredTypes.map((type) => (
                      <CommandItem
                        key={type.id}
                        value={type.id}
                        keywords={[type.name]}
                        onSelect={(currentValue) => {
                          setFormData(prev => ({ ...prev, event_type_id: currentValue }));
                          setOpenCombobox(false);
                          setTypeSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.event_type_id === type.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span style={{ color: type.color }}>{type.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewTypeDialog(true)}
              title="Создать новый тип"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Место проведения</label>
          <Input
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Москва, ул. Тверская, д.1"
          />
        </div>
      </div>

      {/* Диалог создания нового типа */}
      <Dialog open={showNewTypeDialog} onOpenChange={setShowNewTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый тип события</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-type-name">Название</Label>
              <Input
                id="new-type-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Например: Конференция"
              />
            </div>
            <div>
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewTypeColor(color.value)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newTypeColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Palette size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">Выбран: {newTypeColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTypeDialog(false)}>
              Отмена
            </Button>
            <Button onClick={createNewType} disabled={!newTypeName.trim() || creatingType}>
              {creatingType && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Участники */}
      <div>
        <label className="block text-sm font-medium mb-2">Участники</label>
        <MultiSelect
          options={contacts.map(c => ({ value: c.id, label: c.name }))}
          selected={selectedParticipants}
          onChange={setSelectedParticipants}
          placeholder="Выберите участников"
        />
      </div>

      {/* Теги события с кнопкой создания нового */}
      <div>
        <label className="block text-sm font-medium mb-2">Теги события</label>
        <div className="flex gap-2">
          <MultiSelect
            options={availableTags.map(t => ({ value: t.id, label: t.name, color: t.color }))}
            selected={selectedTags}
            onChange={setSelectedTags}
            placeholder="Выберите теги"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowNewTagDialog(true)}
            title="Создать новый тег"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Диалог создания нового тега */}
      <Dialog open={showNewTagDialog} onOpenChange={setShowNewTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый тег</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-tag-name">Название</Label>
              <Input
                id="new-tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Например: Важное"
              />
            </div>
            <div>
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewTagColor(color.value)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newTagColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Palette size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">Выбран: {newTagColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTagDialog(false)}>
              Отмена
            </Button>
            <Button onClick={createNewTag} disabled={!newTagName.trim() || creatingTag}>
              {creatingTag && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Повторение */}
      <RecurrencePicker value={recurrenceRule || undefined} onChange={setRecurrenceRule} />

      {/* Кнопки */}
      <div className="flex justify-end gap-4 pt-6">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}

function CalendarIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}