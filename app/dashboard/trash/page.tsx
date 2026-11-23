'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, RotateCcw, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContacts } from '@/hooks/useContacts';
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

export default function TrashPage() {
  const router = useRouter();
  const { fetchTrashContacts, restoreContact, hardDeleteContact, loading } = useContacts();
  const [contacts, setContacts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [hardDeleteDialog, setHardDeleteDialog] = useState(false);

  const loadTrash = async (page = 1) => {
    const result = await fetchTrashContacts({ page, limit: 20, search: search || undefined });
    if (result) {
      setContacts(result.contacts);
      setPagination(result.pagination);
    }
  };

  useEffect(() => {
    loadTrash(1);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTrash(1);
  };

  const handleRestore = async () => {
    if (selectedContact) {
      const restored = await restoreContact(selectedContact);
      if (restored) {
        loadTrash(pagination.page);
      }
    }
    setRestoreDialog(false);
    setSelectedContact(null);
  };

  const handleHardDelete = async () => {
    if (selectedContact) {
      const success = await hardDeleteContact(selectedContact);
      if (success) {
        loadTrash(pagination.page);
      }
    }
    setHardDeleteDialog(false);
    setSelectedContact(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Корзина</h1>
        </div>
        <Link href="/dashboard/contacts">
          <Button variant="outline">Вернуться к контактам</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Поиск в корзине..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Поиск
          </Button>
        </form>
      </div>

      {loading && contacts.length === 0 ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Trash2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Корзина пуста</h3>
          <p className="text-gray-600">Здесь будут отображаться удалённые контакты</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Контакт
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email / Телефон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Город / Компания
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Удалён
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-sm">
                              {contact.first_name?.[0]}{contact.last_name?.[0]}
                            </span>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{contact.relationship_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.email}</div>
                      <div className="text-sm text-gray-500">{contact.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.city}</div>
                      <div className="text-sm text-gray-500">{contact.company}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contact.deleted_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(contact.id);
                          setRestoreDialog(true);
                        }}
                        className="text-green-600 hover:text-green-900 mr-2"
                        aria-label="Восстановить"
                        title="Восстановить"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(contact.id);
                          setHardDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        aria-label="Удалить навсегда"
                        title="Удалить навсегда"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center mt-6 space-x-2">
              <Button
                variant="outline"
                onClick={() => loadTrash(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Назад
              </Button>
              <span className="py-2 px-4">
                Страница {pagination.page} из {pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() => loadTrash(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                Вперед
              </Button>
            </div>
          )}
        </>
      )}

      {/* Диалог восстановления */}
      <AlertDialog open={restoreDialog} onOpenChange={setRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Восстановить контакт?</AlertDialogTitle>
            <AlertDialogDescription>
              Контакт будет возвращён в основной список.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-green-600 hover:bg-green-700">
              Восстановить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог жёсткого удаления */}
      <AlertDialog open={hardDeleteDialog} onOpenChange={setHardDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить навсегда?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все данные контакта, включая взаимодействия и заметки, будут безвозвратно удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleHardDelete} className="bg-red-600 hover:bg-red-700">
              Удалить навсегда
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}