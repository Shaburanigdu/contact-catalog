'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { RELATIONSHIP_LABELS } from '@/lib/constants'
import { useContacts } from '@/hooks/useContacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  UserPlus,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ContactListProps {
  limit?: number
  showFilters?: boolean
  onContactDeleted?: () => void
}

export function ContactList({ limit = 20, showFilters = true, onContactDeleted }: ContactListProps) {
  const { fetchContacts, loading, error, deleteContact } = useContacts()
  const searchParams = useSearchParams()
  const [contacts, setContacts] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    relationship_type: '',
  })
  const [contactToDelete, setContactToDelete] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Синхронизация с параметром city в URL
  useEffect(() => {
    const cityFromUrl = searchParams.get('city')
    if (cityFromUrl) {
      setFilters({
        search: '',
        city: cityFromUrl,
        relationship_type: '',
      })
    } else {
      setFilters(prev => ({ ...prev, city: '' }))
    }
  }, [searchParams])

  // Загрузка контактов при изменении фильтра города
  useEffect(() => {
    loadContacts(1)
  }, [filters.city])

  const loadContacts = async (page = 1) => {
    const result = await fetchContacts({
      page,
      limit,
      ...filters,
    })

    if (result) {
      setContacts(result.contacts)
      setPagination(result.pagination)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    loadContacts(1)
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      loadContacts(page)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    const success = await deleteContact(contactId)
    if (success) {
      loadContacts(pagination.page)
      if (onContactDeleted) {
        onContactDeleted()
      }
    } else {
      alert('Не удалось удалить контакт')
    }
    setDeleteDialogOpen(false)
    setContactToDelete(null)
  }

  if (loading && contacts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">{error}</div>
        <Button onClick={() => loadContacts()}>Попробовать снова</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопки */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Контакты</h2>
          <p className="text-gray-600">Всего контактов: {pagination.total}</p>
        </div>
        <div className="flex space-x-2">
          <Link href="/dashboard/contacts">
            <Button variant="outline">Все контакты</Button>
          </Link>
          <Link href="/dashboard/contacts/new">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить контакт
            </Button>
          </Link>
        </div>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Поиск
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Имя, email, компания..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Город
              </label>
              <Input
                placeholder="Любой город"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип отношений
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.relationship_type}
                onChange={(e) => handleFilterChange('relationship_type', e.target.value)}
              >
                <option value="">Все типы</option>
                <option value="friend">Друг</option>
                <option value="family">Семья</option>
                <option value="colleague">Коллега</option>
                <option value="business">Бизнес</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Применить фильтры
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Список контактов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Заголовок карточки с меню */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {contact.avatar_url ? (
                    <img
                      src={contact.avatar_url}
                      alt={`${contact.first_name} ${contact.last_name}`}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <UserPlus className="h-6 w-6 text-indigo-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {RELATIONSHIP_LABELS[contact.relationship_type || ''] || contact.relationship_type}
                    </p>
                  </div>
                </div>

                {/* Выпадающее меню действий */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/contacts/${contact.id}/edit`}>Редактировать</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => {
                        setContactToDelete(contact.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Информация о контакте */}
              <div className="space-y-3">
                {contact.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600 truncate">{contact.email}</span>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{contact.phone}</span>
                  </div>
                )}

                {contact.city && (
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{contact.city}</span>
                  </div>
                )}

                {contact.company && (
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{contact.company}</span>
                  </div>
                )}

                {contact.date_of_birth && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">
                      {new Date(contact.date_of_birth).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>

              {/* Теги */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {contact.tags.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Статистика */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Взаимодействий:</span>
                  <span className="font-medium">{contact.total_interactions}</span>
                </div>
                {contact.last_interaction_date && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Последнее общение:</span>
                    <span className="font-medium">
                      {new Date(contact.last_interaction_date).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>

              {/* Кнопки действий (быстрый просмотр и редактирование) */}
              <div className="mt-6 flex space-x-2">
                <Link href={`/dashboard/contacts/${contact.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Просмотр
                  </Button>
                </Link>
                <Link href={`/dashboard/contacts/${contact.id}/edit`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Редактировать
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Пустой список */}
      {contacts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-400 mb-4">
            <UserPlus className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Контакты не найдены</h3>
          <p className="text-gray-600 mb-4">
            {filters.search || filters.city || filters.relationship_type
              ? 'Попробуйте изменить параметры поиска'
              : 'Начните добавлять контакты в вашу базу'}
          </p>
          <Link href="/dashboard/contacts/new">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить первый контакт
            </Button>
          </Link>
        </div>
      )}

      {/* Пагинация */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Назад
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              let pageNum
              if (pagination.pages <= 5) {
                pageNum = i + 1
              } else if (pagination.page <= 3) {
                pageNum = i + 1
              } else if (pagination.page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i
              } else {
                pageNum = pagination.page - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? 'default' : 'outline'}
                  onClick={() => handlePageChange(pageNum)}
                  className="min-w-[40px]"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Вперед
          </Button>
        </div>
      )}

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Контакт будет перемещён в корзину (мягкое удаление).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contactToDelete && handleDeleteContact(contactToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}