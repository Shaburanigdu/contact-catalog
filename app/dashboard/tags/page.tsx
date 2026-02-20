'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Tag as TagIcon, Trash2, Plus, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

interface Tag {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  _count?: { contact_tags: number };
}

interface TagsResponse {
  success: boolean;
  data?: { tags: Tag[] };
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  error?: string;
}

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<TagsResponse>('/api/tags');
      if (result.success) {
        setTags(result.data?.tags || []);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки тегов');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;
    try {
      const result = await api.delete<DeleteResponse>(`/api/tags/${tagToDelete.id}`);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка удаления');
      }
      setTags(tags.filter(t => t.id !== tagToDelete.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении');
    } finally {
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8">Загрузка...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Ошибка загрузки тегов</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchTags} className="mt-2">
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
        <h1 className="text-2xl font-bold">Управление тегами</h1>
        <Button onClick={() => router.push('/dashboard/contacts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Новый контакт
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тег
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Цвет
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Использований
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {tag._count?.contact_tags || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!tag.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => {
                        setTagToDelete(tag);
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тег?</AlertDialogTitle>
            <AlertDialogDescription>
              Тег «{tagToDelete?.name}» будет удалён навсегда. Контакты, помеченные этим тегом, потеряют его, но останутся в базе.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}