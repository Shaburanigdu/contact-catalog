'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Home } from 'lucide-react';

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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      const result = await response.json();
      if (result.success) {
        setContacts(result.data?.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          {/* Добавлена кнопка возврата на главную */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
            title="На главную"
          >
            <Home size={30} />
            <span className="hidden sm:inline">{/*На главную*/}</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Контакты</h1>
        </div>
        <Link
          href="/dashboard/contacts/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Добавить контакт</span>
          <span className="sm:hidden">Добавить</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600">Загрузка контактов...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">У вас пока нет контактов</h3>
          <p className="text-gray-600 mb-6">Начните добавлять людей в свою базу</p>
          <Link
            href="/dashboard/contacts/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Добавить первый контакт
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map(contact => (
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
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
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