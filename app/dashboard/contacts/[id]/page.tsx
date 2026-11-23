'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Building, Calendar, Tag, Home } from 'lucide-react';
import { RELATIONSHIP_LABELS } from '@/lib/constants';
import { api } from '@/lib/api-client';
import { ContactTimeline } from '@/components/contacts/timeline/ContactTimeline';
import { QuickInteractionButton } from '@/components/contacts/QuickInteractionButton';
import { RecentInteractions } from '@/components/contacts/RecentInteractions';
import { ContactRelationships } from '@/components/contacts/ContactRelationships';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  city?: string;
  company?: string;
  relationship_type?: string;
  date_of_birth?: string;
  avatar_url?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ContactResponse {
  success: boolean;
  data?: Contact;
  error?: string;
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchContact = async () => {
    try {
      const result = await api.get<ContactResponse>(`/api/contacts/${id}`);
      if (result.success) {
        setContact(result.data || null);
      } else {
        setContact(null);
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      setContact(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [id]);

  const handleInteractionAdded = () => {
    fetchContact();
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Контакт не найден</h2>
          <Link
            href="/dashboard/contacts"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  // Общие классы для кнопок, чтобы они были одинаковой высоты
  const buttonBaseClass = "px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base h-9 sm:h-10 inline-flex items-center justify-center gap-2 rounded-lg transition-colors";

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 max-w-4xl">
      {/* Верхняя панель — адаптивная */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title="На главную"
          >
            <Home size={22} className="md:size-[25px]" />
          </Link>
          <Link
            href="/dashboard/contacts"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
            title="К списку контактов"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
            {contact.first_name} {contact.last_name}
          </h1>
        </div>
        <div className="flex gap-2 self-start sm:self-auto items-stretch">
          {/* Оборачиваем QuickInteractionButton в div с теми же классами, что и кнопка редактирования */}
          <div className={buttonBaseClass}>
            <QuickInteractionButton
              contactId={contact.id}
              onSuccess={handleInteractionAdded}
            />
          </div>
          <Link href={`/dashboard/contacts/${contact.id}/edit`}>
            <button className={`${buttonBaseClass} bg-blue-600 text-white hover:bg-blue-700`}>
              <Edit className="h-4 w-4" />
              <span>Редактировать</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Карточка контакта */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 sm:gap-6">
          {/* Аватар */}
          <div className="flex-shrink-0">
            {contact.avatar_url ? (
              <img
                src={contact.avatar_url}
                alt={`${contact.first_name} ${contact.last_name}`}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-semibold text-blue-600">
                  {contact.first_name?.[0]}
                  {contact.last_name?.[0]}
                </span>
              </div>
            )}
          </div>

          {/* Информация — на мобильных одна колонка, на планшетах+ две */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Тип отношений</p>
                  <p className="text-sm sm:text-base font-medium capitalize break-words">
                    {RELATIONSHIP_LABELS[contact.relationship_type || ''] ||
                      contact.relationship_type ||
                      'Не указан'}
                  </p>
                </div>

                {contact.email && (
                  <div className="flex items-center gap-2 text-sm break-all">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:underline truncate"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <a href={`tel:${contact.phone}`} className="text-gray-700">
                      {contact.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-2 sm:space-y-3">
                {contact.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="break-words">{contact.city}</span>
                  </div>
                )}

                {contact.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="break-words">{contact.company}</span>
                  </div>
                )}

                {contact.date_of_birth && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>
                      {new Date(contact.date_of_birth).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Теги */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Теги</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Связи с другими людьми */}
      <div className="mt-6 sm:mt-8">
        <ContactRelationships
          contactId={contact.id}
          contactName={`${contact.first_name} ${contact.last_name || ''}`.trim()}
        />
      </div>

      {/* Лента воспоминаний */}
      <div className="mt-6 sm:mt-8">
        <ContactTimeline
          key={refreshKey}
          contactId={contact.id}
          contactName={`${contact.first_name} ${contact.last_name}`}
          contactAvatar={contact.avatar_url}
        />
      </div>

      {/* Последние взаимодействия */}
      <div className="mt-6 sm:mt-8">
        <RecentInteractions contactId={contact.id} key={refreshKey} />
      </div>
    </div>
  );
}