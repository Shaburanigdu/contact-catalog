'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Home, XCircle } from 'lucide-react';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  company: string;
  avatar_url?: string;
}

export default function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Распаковываем searchParams (Next.js 15)
  const params = use(searchParams);
  const lastInteractionDays = params.last_interaction_days as string | undefined;

  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchContacts();
  }, [lastInteractionDays]); // перезагружаем при изменении параметра

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // Формируем URL с query-параметрами
      const query = new URLSearchParams();
      if (lastInteractionDays) {
        query.set('last_interaction_days', lastInteractionDays);
      }
      // Добавляем сортировку (например, по дате создания)
      query.set('sort', 'created_at_desc');
      query.set('limit', '50'); // ограничим количество

      const response = await fetch(`/api/contacts?${query}`);
      const result = await response.json();
      if (result.success) {
        setContacts(result.data?.contacts || []);
        setTotal(result.data?.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Сброс фильтра
  const clearFilter = () => {
    router.push('/dashboard/contacts');
  };

  // Перевод дней в текст
  const getFilterDescription = () => {
    if (lastInteractionDays === '90') {
      return 'Не общались более 3 месяцев';
    }
    if (lastInteractionDays) {
      return `Не общались более ${lastInteractionDays} дней`;
    }
    return null;
  };

  const filterDescription = getFilterDescription();

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Заголовок и кнопки */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title="На главную"
          >
            <Home size={30} />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Контакты</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Индикатор активного фильтра */}
          {filterDescription && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg">
              <span className="text-sm font-medium">{filterDescription}</span>
              <button
                onClick={clearFilter}
                className="p-1 hover:bg-yellow-100 rounded-full transition-colors"
                title="Сбросить фильтр"
              >
                <XCircle size={18} />
              </button>
            </div>
          )}

          <Link
            href="/dashboard/contacts/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Добавить контакт</span>
            <span className="sm:hidden">Добавить</span>
          </Link>
        </div>
      </div>

      {/* Статистика (если фильтр не активен) */}
      {!filterDescription && !loading && (
        <p className="text-gray-600 mb-4">
          Всего контактов: <span className="font-semibold">{total}</span>
        </p>
      )}

      {/* Состояние загрузки */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600">Загрузка контактов...</p>
        </div>
      )}

      {/* Пустой результат */}
      {!loading && contacts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {filterDescription ? 'Контакты не найдены' : 'У вас пока нет контактов'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filterDescription
              ? 'Попробуйте изменить параметры фильтра'
              : 'Начните добавлять людей в свою базу'}
          </p>
          {filterDescription ? (
            <button
              onClick={clearFilter}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Показать все контакты
            </button>
          ) : (
            <Link
              href="/dashboard/contacts/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Добавить первый контакт
            </Link>
          )}
        </div>
      )}

      {/* Список контактов */}
      {!loading && contacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/dashboard/contacts/${contact.id}`}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                {contact.avatar_url ? (
                  <img
                    src={contact.avatar_url}
                    alt={`${contact.first_name} ${contact.last_name}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {contact.first_name?.[0]}
                      {contact.last_name?.[0]}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {contact.first_name} {contact.last_name}
                  </h3>
                  <p className="text-gray-600 text-sm">{contact.company}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {contact.email && <p>📧 {contact.email}</p>}
                {contact.phone && <p>📱 {contact.phone}</p>}
                {contact.city && <p>📍 {contact.city}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}