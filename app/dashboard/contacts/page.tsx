'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Home, XCircle, Filter, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  company: string;
  avatar_url?: string;
  tags?: { id: string; name: string; color: string }[];
}

interface TagsResponse {
  success: boolean;
  data?: { tags: { id: string; name: string; color: string }[] };
  error?: string;
}

interface ContactsResponse {
  success: boolean;
  data?: { 
    contacts: Contact[]; 
    pagination: { total: number } 
  };
  error?: string;
}

export default function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = use(searchParams);
  const router = useRouter();

  const [filters, setFilters] = useState({
    search: (params.search as string) || '',
    city: (params.city as string) || '',
    relationshipType: (params.relationship_type as string) || '',
    tagIds: (params.tagIds as string) ? (params.tagIds as string).split(',') : [],
    lastInteractionDays: (params.last_interaction_days as string) || '',
  });

  // ---------- debounce для поля "Поиск" ----------
  const [searchInput, setSearchInput] = useState(filters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      handleFilterChange('search', debouncedSearch);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search);
      setDebouncedSearch(filters.search);
    }
  }, [filters.search]);

  // ---------- debounce для поля "Город" ----------
  const [cityInput, setCityInput] = useState(filters.city);
  const [debouncedCity, setDebouncedCity] = useState(filters.city);
  const cityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    cityTimerRef.current = setTimeout(() => {
      setDebouncedCity(cityInput);
    }, 400);
    return () => {
      if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    };
  }, [cityInput]);

  useEffect(() => {
    if (debouncedCity !== filters.city) {
      handleFilterChange('city', debouncedCity);
    }
  }, [debouncedCity]);

  useEffect(() => {
    if (filters.city !== cityInput) {
      setCityInput(filters.city);
      setDebouncedCity(filters.city);
    }
  }, [filters.city]);
  // ---------------------------------------------

  const [availableTags, setAvailableTags] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [relTypeOpen, setRelTypeOpen] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const result = await api.get<TagsResponse>('/api/tags?entity=contacts');
        if (result.success) {
          setAvailableTags(result.data?.tags || []);
        }
      } catch (error) {
        console.error('Failed to load tags:', error);
      } finally {
        setLoadingTags(false);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await api.get<{ success: boolean; data: string[] }>('/api/contacts/relationship-types');
        if (res.success) setRelationshipTypes(res.data);
      } catch (e) {
        console.error('Failed to load relationship types', e);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  const updateUrl = (newFilters: typeof filters) => {
    const query = new URLSearchParams();
    if (newFilters.search) query.set('search', newFilters.search);
    if (newFilters.city) query.set('city', newFilters.city);
    if (newFilters.relationshipType) query.set('relationship_type', newFilters.relationshipType);
    if (newFilters.tagIds.length > 0) query.set('tagIds', newFilters.tagIds.join(','));
    if (newFilters.lastInteractionDays) query.set('last_interaction_days', newFilters.lastInteractionDays);
    router.push(`/dashboard/contacts?${query.toString()}`);
  };

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      city: '',
      relationshipType: '',
      tagIds: [],
      lastInteractionDays: '',
    });
    // Сброс debounce-полей
    setSearchInput('');
    setDebouncedSearch('');
    setCityInput('');
    setDebouncedCity('');
    router.push('/dashboard/contacts');
  };

  const clearFilter = (key: keyof typeof filters) => {
    const newValue = key === 'tagIds' ? [] : '';
    if (key === 'search') {
      setSearchInput('');
      setDebouncedSearch('');
    }
    if (key === 'city') {
      setCityInput('');
      setDebouncedCity('');
    }
    handleFilterChange(key, newValue);
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.set('search', filters.search);
      if (filters.city) query.set('city', filters.city);
      if (filters.relationshipType) query.set('relationship_type', filters.relationshipType);
      if (filters.tagIds.length > 0) query.set('tagIds', filters.tagIds.join(','));
      if (filters.lastInteractionDays) query.set('last_interaction_days', filters.lastInteractionDays);
      query.set('sort', 'created_at_desc');
      query.set('limit', '50');

      const result = await api.get<ContactsResponse>(`/api/contacts?${query}`);
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

  useEffect(() => {
    fetchContacts();
  }, [filters]);

  const getLastInteractionLabel = (days: string) => {
    if (days === '30') return 'Более 30 дней';
    if (days === '90') return 'Более 3 месяцев';
    if (days === '180') return 'Более 6 месяцев';
    return `Более ${days} дней`;
  };

  const hasActiveFilters = filters.search || filters.city || filters.relationshipType || filters.tagIds.length > 0 || filters.lastInteractionDays;

  const selectedRelationshipLabel = filters.relationshipType || "Любой тип";

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

      {/* Панель фильтров */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Filter size={20} /> Фильтры
          </h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-red-600">
              <XCircle size={16} className="mr-1" /> Сбросить все
            </Button>
          )}
        </div>

        {/* Поиск с debounce */}
        <div className="w-full">
          <label className="text-sm font-medium mb-1 block">Поиск</label>
          <Input
            placeholder="Имя, email, компания, псевдоним..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Город с debounce */}
        <div className="w-full md:w-auto">
          <label className="text-sm font-medium mb-1 block">Город</label>
          <Input
            placeholder="Город"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
          />
        </div>

        {/* Остальные фильтры (без debounce) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Тип отношений</label>
            <Popover open={relTypeOpen} onOpenChange={setRelTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={relTypeOpen}
                  className="w-full justify-between"
                  disabled={loadingTypes}
                >
                  {selectedRelationshipLabel}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Поиск типа..." />
                  <CommandList>
                    <CommandEmpty>Ничего не найдено</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          handleFilterChange('relationshipType', '');
                          setRelTypeOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !filters.relationshipType ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Все типы
                      </CommandItem>
                      {relationshipTypes.map((type) => (
                        <CommandItem
                          key={type}
                          value={type}
                          onSelect={() => {
                            handleFilterChange('relationshipType', type);
                            setRelTypeOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.relationshipType === type ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {type}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Теги</label>
            <MultiSelect
              options={availableTags.map((tag) => ({
                value: tag.id,
                label: tag.name,
                color: tag.color,
              }))}
              selected={filters.tagIds}
              onChange={(selected) => handleFilterChange('tagIds', selected)}
              placeholder="Выберите теги"
              disabled={loadingTags}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Последний контакт</label>
            <Select
              value={filters.lastInteractionDays || "any"}
              onValueChange={(value) => handleFilterChange('lastInteractionDays', value === "any" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Любой" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Любой</SelectItem>
                <SelectItem value="30">Более 30 дней</SelectItem>
                <SelectItem value="90">Более 3 месяцев</SelectItem>
                <SelectItem value="180">Более 6 месяцев</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Активные фильтры в виде чипсов */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              Поиск: {filters.search}
              <button onClick={() => clearFilter('search')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                <XCircle size={14} />
              </button>
            </Badge>
          )}
          {filters.city && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              Город: {filters.city}
              <button onClick={() => clearFilter('city')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                <XCircle size={14} />
              </button>
            </Badge>
          )}
          {filters.relationshipType && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              Отношения: {filters.relationshipType}
              <button onClick={() => clearFilter('relationshipType')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                <XCircle size={14} />
              </button>
            </Badge>
          )}
          {filters.tagIds.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              Теги: {filters.tagIds.length}
              <button onClick={() => clearFilter('tagIds')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                <XCircle size={14} />
              </button>
            </Badge>
          )}
          {filters.lastInteractionDays && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              {getLastInteractionLabel(filters.lastInteractionDays)}
              <button onClick={() => clearFilter('lastInteractionDays')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                <XCircle size={14} />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Статистика */}
      {!loading && !hasActiveFilters && (
        <p className="text-gray-600 mb-4">
          Всего контактов: <span className="font-semibold">{total}</span>
        </p>
      )}

      {/* Загрузка и список контактов */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600">Загрузка контактов...</p>
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {hasActiveFilters ? 'Контакты не найдены' : 'У вас пока нет контактов'}
          </h3>
          <p className="text-gray-600 mb-6">
            {hasActiveFilters
              ? 'Попробуйте изменить параметры фильтра'
              : 'Начните добавлять людей в свою базу'}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearAllFilters} className="bg-blue-600 hover:bg-blue-700">
              Показать все контакты
            </Button>
          ) : (
            <Link
              href="/dashboard/contacts/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
            >
              <Plus size={20} />
              Добавить первый контакт
            </Link>
          )}
        </div>
      )}

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
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{ backgroundColor: tag.color || '#e2e8f0', color: '#1e293b' }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}