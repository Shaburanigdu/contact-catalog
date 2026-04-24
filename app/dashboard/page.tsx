'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth';
import { ContactList } from '@/components/contacts/ContactList'
import { api } from '@/lib/api-client'
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
  PlusCircle,
  HeartHandshake,
} from 'lucide-react'

interface DashboardStats {
  totalContacts?: number
  contactsByCity?: Array<{ city: string; count: number }>
  contactsWithoutInteraction?: number
  upcomingEventsCount?: number   // новое поле
}

export default function DashboardPage() {
  const router = useRouter()
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({})
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const result = await api.get<{ success: boolean; data?: DashboardStats }>('/api/contacts/stats')
      if (result.success) {
        setStats(result.data || {})
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleContactDeleted = () => {
    fetchStats()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Убираем русское слово "Дашборд", оставляем краткий заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Обзор</h1>
            <p className="text-gray-600 mt-2">Ваши контакты и активность</p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Всего контактов</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalContacts || 0}</p>
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
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.contactsWithoutInteraction || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Bell className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                {/* Карточка "Предстоящие события" с реальным числом */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Предстоящие события</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcomingEventsCount || 0}</p>
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
              </>
            )}
          </div>

          {/* Контакты */}
          <div className="mb-8">
            <ContactList limit={6} showFilters={false} onContactDeleted={handleContactDeleted} />
          </div>

          {/* Быстрые действия */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Быстрые действия</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/contacts/new">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Добавить контакт</h4>
                  <p className="text-sm text-gray-600 mt-1">Создать новый контакт</p>
                </div>
              </Link>

              {/* Исправленная кнопка "Предстоящие события" — активная ссылка на /dashboard/events */}
              <Link href="/dashboard/events">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Предстоящие события</h4>
                  <p className="text-sm text-gray-600 mt-1">Просмотр и управление</p>
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

          {/* Города */}
          {!statsLoading && stats.contactsByCity && stats.contactsByCity.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Контакты по городам</h3>
              <div className="space-y-4">
                {stats.contactsByCity.map((item, index) => (
                  <Link
                    key={index}
                    href={`/dashboard/contacts?city=${encodeURIComponent(item.city)}`}
                    className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-700">{item.city}</span>
                    </div>
                    <span className="font-medium">{item.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}