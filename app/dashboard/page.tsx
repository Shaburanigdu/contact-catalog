'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ContactList } from '@/components/contacts/ContactList'
import { api } from '@/lib/api-client' // Импортируем новый api-клиент
import { useTokenRefresh } from '@/hooks/useTokenRefresh' // Импортируем хук
import {
  Users,
  Calendar,
  Bell,
  TrendingUp,
  UserPlus,
  Activity,
  MapPin,
  Settings,
  LogOut,
} from 'lucide-react'

interface DashboardStats {
  totalContacts?: number
  contactsByCity?: Array<{ city: string; count: number }>
  recentContacts?: Array<{ id: string; first_name: string; last_name?: string; avatar_url?: string }>
  contactsWithoutInteraction?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({})
  const [loading, setLoading] = useState(true)
  
  // Используем хук для периодического обновления токена
  useTokenRefresh()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [contactsResponse, statsResponse] = await Promise.all([
        api.get('/api/contacts?limit=5'),
        api.get('/api/contacts/stats'),
      ])

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json()
        // Обрабатываем данные контактов (если нужно)
        if (contactsData.data) {
          // Сохраняем данные, если они нужны
        }
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data || {})
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      
      // Если ошибка авторизации, middleware уже перенаправит на логин
      if (error instanceof Error && error.message === 'Authentication failed') {
        console.log('❌ Ошибка авторизации, перенаправление на логин...')
        return
      }
      
      // Обработка других ошибок
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('🚪 Выход из системы...');
      
      // Очищаем локальное хранилище
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        sessionStorage.removeItem('auth_token');
      }
      
      // Используем новый api-клиент для выхода
      const response = await api.post('/api/auth/logout', {})
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Выход успешен');
        
        // Принудительно обновляем страницу для сброса состояния
        window.location.href = '/login';
      } else {
        console.error('❌ Ошибка выхода:', data.error);
        alert('Ошибка при выходе из системы');
      }
    } catch (error) {
      console.error('❌ Ошибка при выходе:', error);
      // Даже при ошибке перенаправляем на логин
      window.location.href = '/login';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">Contact Catalog</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Заголовок и приветствие */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
            <p className="text-gray-600 mt-2">Обзор ваших контактов и активности</p>
          </div>

          {/* Карточки статистики */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Всего контактов</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalContacts || 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Нуждаются во внимании</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.contactsWithoutInteraction || 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Предстоящие события</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Активность</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Распределение по городам */}
          {stats.contactsByCity && stats.contactsByCity.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Контакты по городам</h3>
              <div className="space-y-4">
                {stats.contactsByCity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-700">{item.city}</span>
                    </div>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Последние контакты */}
          {stats.recentContacts && stats.recentContacts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Последние контакты</h3>
                <Link href="/dashboard/contacts">
                  <Button variant="outline">Все контакты</Button>
                </Link>
              </div>
              <div className="space-y-4">
                {stats.recentContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {contact.avatar_url ? (
                        <img
                          src={contact.avatar_url}
                          alt={`${contact.first_name} ${contact.last_name}`}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </p>
                      </div>
                    </div>
                    <Link href={`/dashboard/contacts/${contact.id}`}>
                      <Button variant="ghost" size="sm">
                        Просмотр
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Быстрые действия */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Быстрые действия</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/contacts/new">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Добавить контакт</h4>
                  <p className="text-sm text-gray-600 mt-1">Создать новый контакт</p>
                </div>
              </Link>

              <Link href="/dashboard/contacts?has_upcoming_events=true">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Предстоящие события</h4>
                  <p className="text-sm text-gray-600 mt-1">Посмотреть события</p>
                </div>
              </Link>

              <Link href="/dashboard/contacts?last_interaction_days=90">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-yellow-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Требуют внимания</h4>
                  <p className="text-sm text-gray-600 mt-1">Не общались более 3 месяцев</p>
                </div>
              </Link>

              <Link href="/dashboard/analytics">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Аналитика</h4>
                  <p className="text-sm text-gray-600 mt-1">Статистика и отчеты</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Последние контакты (полный список) */}
          <div className="mb-8">
            <ContactList limit={6} showFilters={false} />
          </div>
        </div>
      </div>
    </div>
  )
}