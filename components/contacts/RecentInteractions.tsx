'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
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

interface Interaction {
  id: string;
  title: string;
  description: string | null;
  started_at: string;
  duration_minutes: number | null;
  mood_before: number | null;
  mood_after: number | null;
  importance: number | null;
  interaction_types: { name: string; icon: string | null; color: string | null } | null;
}

export function RecentInteractions({ contactId }: { contactId: string }) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (contactId) fetchInteractions();
  }, [contactId]);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const result = await api.get<{ success: boolean; data: { interactions: Interaction[] } }>(
        `/api/contacts/${contactId}/interactions?limit=10`
      );
      if (result.success) {
        setInteractions(result.data.interactions);
      }
    } catch (error) {
      console.error('Failed to fetch interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/contacts/${contactId}/interactions?interactionId=${deleteId}`);
      await fetchInteractions();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Ошибка при удалении');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Последние взаимодействия</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (interactions.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Последние взаимодействия</CardTitle></CardHeader>
        <CardContent className="text-center py-6 text-gray-500">
          Нет записей о взаимодействиях с этим контактом.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Последние взаимодействия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex gap-3 border-b pb-3 last:border-0">
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm">
                      {interaction.title}
                    </h4>
                    {interaction.description && (
                      <p className="text-sm text-gray-600 mt-1">{interaction.description}</p>
                    )}
                    {(interaction.duration_minutes || interaction.importance) && (
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {interaction.duration_minutes && <span>⏱ {interaction.duration_minutes} мин</span>}
                        {interaction.importance && <span>⭐ Важность: {interaction.importance}/3</span>}
                        {interaction.mood_before && interaction.mood_after && (
                          <span>😊 {interaction.mood_before} → {interaction.mood_after}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(interaction.started_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => {
                        setDeleteId(interaction.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить взаимодействие?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Взаимодействие будет удалено, а счётчик и дата последнего взаимодействия обновятся.
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
    </>
  );
}