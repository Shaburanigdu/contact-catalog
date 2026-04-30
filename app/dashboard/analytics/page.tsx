'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Loader2 } from 'lucide-react'

interface AnalyticsData {
  totalContacts: number
  totalEvents: number
  contactsWithoutInteraction: number
  upcomingEvents: number
  contactsByCity: Array<{ city: string; count: number }>
  contactsByRelationship: Array<{ relationship: string; count: number }>
  contactsByTag: Array<{ tag: string; count: number }>
  interactionsByMonth: Array<{ month: string; count: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

const translateMonth = (monthStr: string): string => {
  const parts = monthStr.split(' ')
  const monthEng = parts[0]
  const year = parts[1] ? ` ${parts[1]}` : ''

  const months: Record<string, string> = {
    January: 'Январь',
    February: 'Февраль',
    March: 'Март',
    April: 'Апрель',
    May: 'Май',
    June: 'Июнь',
    July: 'Июль',
    August: 'Август',
    September: 'Сентябрь',
    October: 'Октябрь',
    November: 'Ноябрь',
    December: 'Декабрь',
    Jan: 'Янв',
    Feb: 'Фев',
    Mar: 'Мар',
    Apr: 'Апр',
    Jun: 'Июн',
    Jul: 'Июл',
    Aug: 'Авг',
    Sep: 'Сен',
    Oct: 'Окт',
    Nov: 'Ноя',
    Dec: 'Дек',
  }
  const monthRu = months[monthEng] || monthEng
  return monthRu + year
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const result = await api.get<{ success: boolean; data: AnalyticsData }>('/api/analytics/overview')
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-center text-red-500">Не удалось загрузить аналитику</div>
  }

  const interactionsData = data.interactionsByMonth.map(item => ({
    ...item,
    month: translateMonth(item.month),
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
        <p className="text-gray-600 mt-1">Статистика и тренды ваших контактов и событий</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Всего контактов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Всего событий</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Требуют внимания</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.contactsWithoutInteraction}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Предстоящие события</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.upcomingEvents}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Динамика взаимодействий</CardTitle>
          <CardDescription>Количество взаимодействий по месяцам</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={interactionsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" name="Взаимодействия" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Контакты по городам</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.contactsByCity}
                  dataKey="count"
                  nameKey="city"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ payload }: any) => {
                    if (!payload) return ''
                    return `${payload.city}: ${payload.count}`
                  }}
                  fontSize={12}
                >
                  {data.contactsByCity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Контакты по типу связи</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.contactsByRelationship} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="relationship" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" name="Количество" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {data.contactsByTag.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Популярные теги</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.contactsByTag.map((tag) => (
                <span
                  key={tag.tag}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  {tag.tag} ({tag.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}