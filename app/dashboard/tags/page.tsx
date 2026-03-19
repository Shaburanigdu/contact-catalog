'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag as TagIcon, Trash2, Plus, AlertCircle, CalendarIcon } from 'lucide-react';
import { api } from '@/lib/api-client';

// Интерфейсы для тегов
interface Tag {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  contactCount: number;
  eventCount: number;
}

// Интерфейс для типов событий
interface EventType {
  id: string;
  name: string;
  color: string | null;
  icon?: string | null;
  is_system?: boolean; // добавлено для различия системных и пользовательских
}

interface TagsResponse {
  success: boolean;
  data?: { tags: Tag[] };
  error?: string;
}

interface EventTypesResponse {
  success: boolean;
  data?: EventType[];
  error?: string;
}

export default function TagsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tags' | 'event-types'>('tags');
  const [tags, setTags] = useState<Tag[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'tag' | 'event-type' } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'contacts' | 'events'>('all');

  // Загрузка данных в зависимости от активной вкладки
  useEffect(() => {
    if (activeTab === 'tags') {
      fetchTags();
    } else {
      fetchEventTypes();
    }
  }, [activeTab, entityFilter]);

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<TagsResponse>(`/api/tags?entity=${entityFilter}`);
      if (result.success) {
        const sortedTags = (result.data?.tags || []).sort((a, b) => {
          if (a.is_system === b.is_system) {
            return a.name.localeCompare(b.name);
          }
          return a.is_system ? 1 : -1; // системные в конец
        });
        setTags(sortedTags);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки тегов');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<EventTypesResponse>('/api/event-types');
      if (result.success) {
        const sortedTypes = (result.data || []).sort((a, b) => {
          const aSystem = a.is_system || false;
          const bSystem = b.is_system || false;
          if (aSystem === bSystem) {
            return a.name.localeCompare(b.name);
          }
          return aSystem ? 1 : -1;
        });
        setEventTypes(sortedTypes);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки типов событий');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const result = await api.delete<{ success: boolean; error?: string }>(`/api/tags/${tagId}`);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка удаления');
      }
      setTags(tags.filter(t => t.id !== tagId));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении');
    }
  };

  const handleDeleteEventType = async (typeId: string) => {
    try {
      const result = await api.delete<{ success: boolean; error?: string }>(`/api/event-types/${typeId}`);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка удаления');
      }
      setEventTypes(eventTypes.filter(t => t.id !== typeId));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении');
    }
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'tag') {
      handleDeleteTag(itemToDelete.id);
    } else {
      handleDeleteEventType(itemToDelete.id);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEventTypes = eventTypes.filter(type =>
    type.name.toLowerCase().includes(search.toLowerCase())
  );

  const getTagColumns = () => {
    const baseColumns = [
      { key: 'name', label: 'Тег' },
      { key: 'color', label: 'Цвет' },
    ];
    if (entityFilter === 'contacts') {
      return [
        ...baseColumns,
        { key: 'contactCount', label: 'Контакты' },
        { key: 'actions', label: 'Действия' },
      ];
    } else if (entityFilter === 'events') {
      return [
        ...baseColumns,
        { key: 'eventCount', label: 'События' },
        { key: 'actions', label: 'Действия' },
      ];
    } else {
      return [
        ...baseColumns,
        { key: 'contactCount', label: 'Контакты' },
        { key: 'eventCount', label: 'События' },
        { key: 'actions', label: 'Действия' },
      ];
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Загрузка...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Ошибка загрузки</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <Button variant="outline" size="sm" onClick={activeTab === 'tags' ? fetchTags : fetchEventTypes} className="mt-2">
              Повторить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление</h1>
        <Button onClick={() => router.push('/dashboard/contacts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Новый контакт
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tags' | 'event-types')} className="mb-4">
        <TabsList>
          <TabsTrigger value="tags">Теги</TabsTrigger>
          <TabsTrigger value="event-types">Типы событий</TabsTrigger>
        </TabsList>

        <TabsContent value="tags">
          {/* Фильтр по сущности для тегов */}
          <div className="mb-4 flex gap-2">
            <Button
              variant={entityFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEntityFilter('all')}
            >
              Все
            </Button>
            <Button
              variant={entityFilter === 'contacts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEntityFilter('contacts')}
            >
              Контакты
            </Button>
            <Button
              variant={entityFilter === 'events' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEntityFilter('events')}
            >
              События
            </Button>
          </div>

          <div className="mb-4">
            <Input
              placeholder="Поиск тегов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {getTagColumns().map(col => (
                    <th
                      key={col.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTags.map((tag) => (
                  <tr key={tag.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TagIcon className="h-4 w-4 mr-2" style={{ color: tag.color }} />
                        <span className="text-sm font-medium text-gray-900">
                          {tag.name}
                          {tag.is_system && (
                            <span className="ml-2 text-xs text-gray-500">(системный)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-5 w-5 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm text-gray-600">{tag.color}</span>
                      </div>
                    </td>
                    {(entityFilter === 'all' || entityFilter === 'contacts') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tag.contactCount}
                      </td>
                    )}
                    {(entityFilter === 'all' || entityFilter === 'events') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tag.eventCount}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!tag.is_system && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => {
                            setItemToDelete({ id: tag.id, name: tag.name, type: 'tag' });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTags.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Теги не найдены
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="event-types">
          <div className="mb-4">
            <Input
              placeholder="Поиск типов событий..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цвет
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEventTypes.map((type) => (
                  <tr key={type.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2" style={{ color: type.color || '#000' }} />
                        <span className="text-sm font-medium text-gray-900">
                          {type.name}
                          {type.is_system && (
                            <span className="ml-2 text-xs text-gray-500">(системный)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-5 w-5 rounded-full mr-2"
                          style={{ backgroundColor: type.color || '#ccc' }}
                        />
                        <span className="text-sm text-gray-600">{type.color || 'Не указан'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!type.is_system ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => {
                            setItemToDelete({ id: type.id, name: type.name, type: 'event-type' });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400"></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEventTypes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Типы событий не найдены. Создайте первый в форме создания события.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {itemToDelete?.type === 'tag' ? 'тег' : 'тип события'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'tag' ? (
                <>
                  Тег «{itemToDelete?.name}» будет удалён навсегда. В событиях этот тег будет заменён на «Другое»,
                  а контакты потеряют этот тег.
                </>
              ) : (
                <>
                  Тип события «{itemToDelete?.name}» будет удалён. У всех событий с этим типом он будет сброшен.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}