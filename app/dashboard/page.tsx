'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
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

          {/* Статистика (теперь кликабельные карточки вместо быстрых действий) */}
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
                {/* Всего контактов → список всех контактов */}
                <Link href="/dashboard/contacts" className="block transition-all duration-200 hover:shadow-lg hover:bg-gray-50 cursor-pointer rounded-lg">
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
                </Link>

                {/* Нуждаются во внимании → фильтр 90 дней без взаимодействия */}
                <Link href="/dashboard/contacts?last_interaction_days=90" className="block transition-all duration-200 hover:shadow-lg hover:bg-gray-50 cursor-pointer rounded-lg">
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
                </Link>

                {/* Предстоящие события → страница событий */}
                <Link href="/dashboard/events" className="block transition-all duration-200 hover:shadow-lg hover:bg-gray-50 cursor-pointer rounded-lg">
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
                </Link>

                {/* Активность → аналитика и отчёты */}
                <Link href="/dashboard/analytics" className="block transition-all duration-200 hover:shadow-lg hover:bg-gray-50 cursor-pointer rounded-lg">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Аналитика</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            )}
          </div>

          {/* Контакты */}
          <div className="mb-8">
            <ContactList limit={6} showFilters={false} onContactDeleted={handleContactDeleted} />
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
                    className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-all duration-200 group"
                  >
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 group-hover:text-gray-600 transition-colors" />
                      <span className="text-gray-700 group-hover:text-gray-900">{item.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 group-hover:text-gray-900">{item.count}</span>
                      {/* Стрелочка, появляющаяся при наведении */}
                      <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                    </div>
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