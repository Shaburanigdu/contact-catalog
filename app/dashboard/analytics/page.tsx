'use client'

import { useEffect, useState, useRef } from 'react'
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
import { Loader2, ChevronLeft, ChevronRight, Users, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'

// ---------- ИНТЕРФЕЙСЫ ----------
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

interface MonthData {
  month: string
  count: number
}

interface ContactSimple {
  id: string
  first_name: string
  last_name: string
}

interface ContactAnalytics {
  totalInteractions: number
  lastInteraction: string | null
  firstInteraction: string | null
  interactionsByMonth: MonthData[]
  interactionsByType: Array<{ type: string; count: number }>
  interactionsByWeekday: Array<{ day: string; count: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (перевод месяцев и заполнение пропусков) ----------
const translateMonth = (monthStr: string): string => {
  const parts = monthStr.split(' ')
  const monthEng = parts[0]
  const year = parts[1] ? ` ${parts[1]}` : ''
  const months: Record<string, string> = {
    January: 'Январь', February: 'Февраль', March: 'Март', April: 'Апрель',
    May: 'Май', June: 'Июнь', July: 'Июль', August: 'Август',
    September: 'Сентябрь', October: 'Октябрь', November: 'Ноябрь', December: 'Декабрь',
    Jan: 'Янв', Feb: 'Фев', Mar: 'Мар', Apr: 'Апр', Jun: 'Июн',
    Jul: 'Июл', Aug: 'Авг', Sep: 'Сен', Oct: 'Окт', Nov: 'Ноя', Dec: 'Дек',
  }
  const monthRu = months[monthEng] || monthEng
  return monthRu + year
}

const generateFullMonthsRange = (accountCreatedAt: Date): string[] => {
  const now = new Date()
  const start = new Date(accountCreatedAt)
  start.setDate(1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const months: string[] = []
  const current = new Date(start)
  while (current <= end) {
    const monthName = current.toLocaleString('en-US', { month: 'long' })
    const year = current.getFullYear()
    months.push(`${monthName} ${year}`)
    current.setMonth(current.getMonth() + 1)
  }
  return months
}

const fillMissingMonths = (
  apiData: MonthData[],
  accountCreatedAt: Date
): MonthData[] => {
  const allMonths = generateFullMonthsRange(accountCreatedAt)
  const dataMap = new Map(apiData.map(item => [item.month, item.count]))
  return allMonths.map(month => ({
    month,
    count: dataMap.get(month) || 0,
  }))
}

// ---------- КОМПОНЕНТ ГРАФИКА ДИНАМИКИ (с кнопками прокрутки) ----------
function DynamicChart({ data, title }: { data: MonthData[]; title?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const chartData = data.map(item => ({
    month: translateMonth(item.month),
    count: item.count,
  }))
  const showScrollButtons = chartData.length > 6

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 400
    scrollRef.current.scrollTo({
      left: scrollRef.current.scrollLeft + (direction === 'left' ? -amount : amount),
      behavior: 'smooth',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Динамика взаимодействий'}</CardTitle>
        <CardDescription>Количество взаимодействий по месяцам</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {showScrollButtons && (
            <>
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md hover:bg-gray-100"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md hover:bg-gray-100"
              >
                <ChevronRight className="h-6 w-6 text-gray-600" />
              </button>
            </>
          )}
          <div
            ref={scrollRef}
            className="overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div style={{ minWidth: `${Math.max(chartData.length * 100, 600)}px` }}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-25} textAnchor="end" height={60} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" name="Взаимодействия" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- КОМПОНЕНТ ОБЩЕЙ АНАЛИТИКИ ----------
function OverallAnalytics({
  data,
  userCreatedAt,
}: {
  data: AnalyticsData
  userCreatedAt: Date | null
}) {
  const fullInteractionsData = userCreatedAt
    ? fillMissingMonths(data.interactionsByMonth, userCreatedAt)
    : data.interactionsByMonth

  return (
    <>
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

      <DynamicChart data={fullInteractionsData} title="Динамика взаимодействий" />

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
                  label={({ payload }: any) => `${payload.city}: ${payload.count}`}
                  fontSize={12}
                >
                  {data.contactsByCity.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
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
              {data.contactsByTag.map(tag => (
                <span key={tag.tag} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  {tag.tag} ({tag.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ---------- КОМПОНЕНТ АНАЛИТИКИ ПО КОНТАКТУ ----------
function ContactAnalyticsView() {
  const [contacts, setContacts] = useState<ContactSimple[]>([])
  const [selectedContact, setSelectedContact] = useState<ContactSimple | null>(null)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [analytics, setAnalytics] = useState<ContactAnalytics | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)

  // Загрузка списка контактов и даты регистрации
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get<{ success: boolean; data: { created_at: string } }>('/api/users/me')
        if (userRes.success) setUserCreatedAt(new Date(userRes.data.created_at))

        const contactsRes = await api.get<{ success: boolean; data: { contacts: ContactSimple[] } }>('/api/contacts?limit=500')
        if (contactsRes.success && contactsRes.data.contacts) {
          setContacts(contactsRes.data.contacts)
        }
      } catch (err) {
        console.error('Failed to load contacts or user info', err)
      } finally {
        setLoadingContacts(false)
      }
    }
    fetchData()
  }, [])

  // Загрузка аналитики при выборе контакта
  useEffect(() => {
    if (!selectedContact) {
      setAnalytics(null)
      return
    }
    setLoadingAnalytics(true)
    api.get<{ success: boolean; data: ContactAnalytics }>(`/api/contacts/${selectedContact.id}/analytics`)
      .then(res => {
        if (res.success) setAnalytics(res.data)
        else setAnalytics(null)
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingAnalytics(false))
  }, [selectedContact])

  // Подготовка данных для графика (заполнение пропусков)
  const fullInteractionsData = analytics && userCreatedAt
    ? fillMissingMonths(analytics.interactionsByMonth, userCreatedAt)
    : analytics?.interactionsByMonth || []

  const fullName = selectedContact
    ? `${selectedContact.first_name} ${selectedContact.last_name}`
    : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCombobox}
              className="w-[300px] justify-between"
              disabled={loadingContacts}
            >
              {selectedContact ? fullName : 'Выберите контакт'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Поиск контакта..." />
              <CommandList>
                <CommandEmpty>Контакты не найдены</CommandEmpty>
                <CommandGroup>
                  {contacts.map(contact => (
                    <CommandItem
                      key={contact.id}
                      value={`${contact.first_name} ${contact.last_name}`}
                      onSelect={() => {
                        setSelectedContact(contact)
                        setOpenCombobox(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedContact?.id === contact.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {contact.first_name} {contact.last_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedContact && loadingAnalytics && <Loader2 className="h-5 w-5 animate-spin text-gray-500" />}
      </div>

      {selectedContact && analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Всего взаимодействий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalInteractions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Последнее взаимодействие</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-md">
                  {analytics.lastInteraction ? new Date(analytics.lastInteraction).toLocaleDateString('ru-RU') : 'Нет'}
                </div>
              </CardContent>
            </Card>
          </div>

          <DynamicChart data={fullInteractionsData} title={`Динамика взаимодействий с ${fullName}`} />

          {analytics.interactionsByType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Типы взаимодействий</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.interactionsByType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ payload }: any) => `${payload.type}: ${payload.count}`}
                    >
                      {analytics.interactionsByType.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedContact && !loadingAnalytics && !analytics && (
        <div className="text-center py-12 text-gray-500">
          У этого контакта пока нет взаимодействий.
        </div>
      )}
      {!selectedContact && !loadingContacts && (
        <div className="text-center py-12 text-gray-500">
          Выберите контакт из списка, чтобы увидеть персональную статистику.
        </div>
      )}
    </div>
  )
}

// ---------- ОСНОВНАЯ СТРАНИЦА ----------
export default function AnalyticsPage() {
  const [overallData, setOverallData] = useState<AnalyticsData | null>(null)
  const [loadingOverall, setLoadingOverall] = useState(true)
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'overall' | 'contact'>('overall')

  useEffect(() => {
    const fetchOverall = async () => {
      try {
        const userRes = await api.get<{ success: boolean; data: { created_at: string } }>('/api/users/me')
        if (userRes.success) setUserCreatedAt(new Date(userRes.data.created_at))

        const result = await api.get<{ success: boolean; data: AnalyticsData }>('/api/analytics/overview')
        if (result.success) setOverallData(result.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingOverall(false)
      }
    }
    fetchOverall()
  }, [])

  if (loadingOverall) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!overallData) {
    return <div className="p-6 text-center text-red-500">Не удалось загрузить общую аналитику</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
        <p className="text-gray-600 mt-1">Статистика и тренды ваших контактов и событий</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overall')}
            className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'overall'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" /> Общая статистика
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'contact'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="h-4 w-4" /> По контакту
          </button>
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'overall' && (
          <OverallAnalytics data={overallData} userCreatedAt={userCreatedAt} />
        )}
        {activeTab === 'contact' && <ContactAnalyticsView />}
      </div>
    </div>
  )
}