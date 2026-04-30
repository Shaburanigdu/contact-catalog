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
import { Tag as TagIcon, Trash2, Plus, AlertCircle, CalendarIcon, Activity } from 'lucide-react';
import { api } from '@/lib/api-client';

interface Tag {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  contactCount: number;
  eventCount: number;
}

interface EventType {
  id: string;
  name: string;
  color: string | null;
  is_system?: boolean;
}

interface InteractionType {
  id: string;
  name: string;
  color: string | null;
  is_system: boolean;
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

interface InteractionTypesResponse {
  success: boolean;
  data?: InteractionType[];
  error?: string;
}

export default function TagsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tags' | 'event-types' | 'interaction-types'>('tags');
  const [tags, setTags] = useState<Tag[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [interactionTypes, setInteractionTypes] = useState<InteractionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'tag' | 'event-type' | 'interaction-type' } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'contacts' | 'events'>('all');
  const [showCreateTagForm, setShowCreateTagForm] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' });

  useEffect(() => {
    if (activeTab === 'tags') {
      fetchTags();
    } else if (activeTab === 'event-types') {
      fetchEventTypes();
    } else {
      fetchInteractionTypes();
    }
  }, [activeTab, entityFilter]);

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/tags';
      if (entityFilter !== 'all') url += `?entity=${entityFilter}`;
      else url += '?entity=all';
      const result = await api.get<TagsResponse>(url);
      if (result.success) {
        const sortedTags = (result.data?.tags || []).sort((a, b) => {
          if (a.is_system === b.is_system) return a.name.localeCompare(b.name);
          return a.is_system ? 1 : -1;
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
          if (aSystem === bSystem) return a.name.localeCompare(b.name);
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

  const fetchInteractionTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<InteractionTypesResponse>('/api/interaction-types');
      if (result.success) {
        const sorted = (result.data || []).sort((a, b) => {
          if (a.is_system === b.is_system) return a.name.localeCompare(b.name);
          return a.is_system ? 1 : -1;
        });
        setInteractionTypes(sorted);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки типов взаимодействий');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const result = await api.delete<{ success: boolean; error?: string }>(`/api/tags/${tagId}`);
      if (!result.success) throw new Error(result.error || 'Ошибка удаления');
      setTags(tags.filter(t => t.id !== tagId));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении');
    }
  };

  const handleDeleteEventType = async (typeId: string) => {
    try {
      const result = await api.delete<{ success: boolean; error?: string }>(`/api/event-types/${typeId}`);
      if (!result.success) throw new Error(result.error || 'Ошибка удаления');
      setEventTypes(eventTypes.filter(t => t.id !== typeId));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении');
    }
  };

  const handleDeleteInteractionType = async (typeId: string) => {
    try {
      const result = await api.delete<{ success: boolean; error?: string }>(`/api/interaction-types/${typeId}`);
      if (!result.success) throw new Error(result.error || 'Ошибка удаления');
      setInteractionTypes(interactionTypes.filter(t => t.id !== typeId));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении');
    }
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'tag') handleDeleteTag(itemToDelete.id);
    else if (itemToDelete.type === 'event-type') handleDeleteEventType(itemToDelete.id);
    else if (itemToDelete.type === 'interaction-type') handleDeleteInteractionType(itemToDelete.id);
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const createTag = async () => {
    if (!newTag.name.trim()) return;
    try {
      const result = await api.post<{ success: boolean; data?: { tag: Tag }; error?: string }>('/api/tags', {
        name: newTag.name.trim(),
        color: newTag.color,
      });
      if (result.success && result.data) {
        setTags(prev => [...prev, result.data!.tag]);
        setShowCreateTagForm(false);
        setNewTag({ name: '', color: '#3B82F6' });
      } else {
        throw new Error(result.error || 'Ошибка создания');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при создании тега');
    }
  };

  const filteredTags = tags.filter(tag => tag.name.toLowerCase().includes(search.toLowerCase()));
  const filteredEventTypes = eventTypes.filter(type => type.name.toLowerCase().includes(search.toLowerCase()));
  const filteredInteractionTypes = interactionTypes.filter(type => type.name.toLowerCase().includes(search.toLowerCase()));

  const getTagColumns = () => {
    const base = [{ key: 'name', label: 'Тег' }, { key: 'color', label: 'Цвет' }];
    if (entityFilter === 'contacts') return [...base, { key: 'contactCount', label: 'Контакты' }, { key: 'actions', label: 'Действия' }];
    if (entityFilter === 'events') return [...base, { key: 'eventCount', label: 'События' }, { key: 'actions', label: 'Действия' }];
    return [...base, { key: 'contactCount', label: 'Контакты' }, { key: 'eventCount', label: 'События' }, { key: 'actions', label: 'Действия' }];
  };

  if (loading) return <div className="flex justify-center p-8">Загрузка...</div>;
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Ошибка загрузки</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <Button variant="outline" size="sm" onClick={() => {
              if (activeTab === 'tags') fetchTags();
              else if (activeTab === 'event-types') fetchEventTypes();
              else fetchInteractionTypes();
            }} className="mt-2">Повторить</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление</h1>
        <Button onClick={() => router.push('/dashboard/contacts/new')}>
          <Plus className="h-4 w-4 mr-2" /> Новый контакт
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="tags">Теги</TabsTrigger>
          <TabsTrigger value="event-types">Типы событий</TabsTrigger>
          <TabsTrigger value="interaction-types">Типы взаимодействий</TabsTrigger>
        </TabsList>

        <TabsContent value="tags">
          <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              <Button variant={entityFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setEntityFilter('all')}>Все</Button>
              <Button variant={entityFilter === 'contacts' ? 'default' : 'outline'} size="sm" onClick={() => setEntityFilter('contacts')}>Контакты</Button>
              <Button variant={entityFilter === 'events' ? 'default' : 'outline'} size="sm" onClick={() => setEntityFilter('events')}>События</Button>
            </div>
            <Button size="sm" onClick={() => setShowCreateTagForm(!showCreateTagForm)}>
              <Plus className="h-4 w-4 mr-1" /> Создать тег
            </Button>
          </div>

          {showCreateTagForm && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Название" value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} />
                <div className="flex items-center gap-2">
                  <input type="color" value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} className="w-10 h-10 p-1 border rounded" />
                  <span>{newTag.color}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createTag} disabled={!newTag.name.trim()}>Сохранить</Button>
                  <Button variant="outline" onClick={() => setShowCreateTagForm(false)}>Отмена</Button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <Input placeholder="Поиск тегов..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {getTagColumns().map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTags.map((tag) => (
                  <tr key={tag.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <TagIcon className="h-4 w-4 mr-2" style={{ color: tag.color }} />
                        <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                        {tag.is_system && <span className="ml-2 text-xs text-gray-500">(системный)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-5 w-5 rounded-full mr-2" style={{ backgroundColor: tag.color }} />
                        <span className="text-sm text-gray-600">{tag.color}</span>
                      </div>
                    </td>
                    {(entityFilter === 'all' || entityFilter === 'contacts') && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{tag.contactCount}</td>
                    )}
                    {(entityFilter === 'all' || entityFilter === 'events') && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{tag.eventCount}</td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
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
            {filteredTags.length === 0 && <div className="text-center py-12 text-gray-500">Теги не найдены</div>}
          </div>
        </TabsContent>

        <TabsContent value="event-types">
          <div className="mb-4">
            <Input placeholder="Поиск типов событий..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цвет</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEventTypes.map((type) => (
                  <tr key={type.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2" style={{ color: type.color || '#000' }} />
                        <span className="text-sm font-medium text-gray-900">{type.name}{type.is_system && <span className="ml-2 text-xs text-gray-500">(системный)</span>}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-5 w-5 rounded-full mr-2" style={{ backgroundColor: type.color || '#ccc' }} />
                        <span className="text-sm text-gray-600">{type.color || 'Не указан'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {!type.is_system && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => {
                          setItemToDelete({ id: type.id, name: type.name, type: 'event-type' });
                          setDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEventTypes.length === 0 && <div className="text-center py-12 text-gray-500">Типы событий не найдены. Создайте первый в форме создания события.</div>}
          </div>
        </TabsContent>

        <TabsContent value="interaction-types">
          <div className="mb-4">
            <Input placeholder="Поиск типов взаимодействий..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цвет</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInteractionTypes.map((type) => (
                  <tr key={type.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-2" style={{ color: type.color || '#000' }} />
                        <span className="text-sm font-medium text-gray-900">{type.name}{type.is_system && <span className="ml-2 text-xs text-gray-500">(системный)</span>}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-5 w-5 rounded-full mr-2" style={{ backgroundColor: type.color || '#ccc' }} />
                        <span className="text-sm text-gray-600">{type.color || 'Не указан'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {!type.is_system && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => {
                          setItemToDelete({ id: type.id, name: type.name, type: 'interaction-type' });
                          setDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInteractionTypes.length === 0 && <div className="text-center py-12 text-gray-500">Типы взаимодействий не найдены. Создайте первый в форме добавления взаимодействия.</div>}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {itemToDelete?.type === 'tag' ? 'тег' : itemToDelete?.type === 'event-type' ? 'тип события' : 'тип взаимодействия'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'tag' ? (
                <>Тег «{itemToDelete?.name}» будет удалён навсегда. Сущности, использующие этот тег, потеряют его.</>
              ) : itemToDelete?.type === 'event-type' ? (
                <>Тип события «{itemToDelete?.name}» будет удалён. У всех событий с этим типом он будет сброшен.</>
              ) : (
                <>Тип взаимодействия «{itemToDelete?.name}» будет удалён. У всех взаимодействий с этим типом он будет сброшен.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}