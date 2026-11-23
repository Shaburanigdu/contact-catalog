// components/layout/Header.tsx
'use client';
import dynamic from 'next/dynamic';
import { Calendar, CalendarDays, Archive, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, HeartHandshake, Tag } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Динамический импорт NotificationBell без SSR
const NotificationBell = dynamic(
  () => import('@/components/notifications/NotificationBell').then(mod => mod.NotificationBell),
  { ssr: false }
);

export function Header() {
  const { logout } = useAuth();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Закрывать поиск при клике вне области
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Обработка Escape для закрытия
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSearchOpen]);

  // Фокус на поле ввода при открытии
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // AI-поиск с debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery.trim() }),
        })
          .then((res) => res.json())
          .then((data) => {
            setSearchResults(data.results || []);
          })
          .catch(console.error);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (result: any) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    if (result.type === 'contact') {
      router.push(`/dashboard/contacts/${result.id}`);
    } else if (result.type === 'event') {
      router.push(`/dashboard/events/${result.id}`);
    } else if (result.type === 'interaction' || result.type === 'note') {
      // Переход на страницу контакта, к которому относится взаимодействие или заметка
      if (result.contact_id) {
        router.push(`/dashboard/contacts/${result.contact_id}`);
      }
    }
  };

  const handleClose = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2 group">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors">
                <HeartHandshake className="h-6 w-6 text-indigo-600" />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Kindred
              </span>
            </Link>
          </div>

          {/* Кнопка поиска (лупа) + выезжающая панель */}
          <div className="relative" ref={searchContainerRef}>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Поиск"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>

            {/* Выезжающая панель поиска — центрируется относительно кнопки, на мобильных занимает всю ширину с отступами */}
            <div
              className={`
                absolute top-full mt-2
                left-1/2 -translate-x-1/2
                w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[320px] sm:max-w-md
                bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden
                transition-all duration-300 ease-in-out origin-top
                ${isSearchOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}
              `}
            >
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Поиск по смыслу..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-300 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Результаты поиска */}
                {searchResults.length > 0 && (
                  <div className="mt-3 max-h-80 overflow-auto border-t border-gray-100 pt-2">
                    {searchResults.map((result: any) => (
                      <div
                        key={`${result.type}_${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="font-medium">
                          {result.type === 'contact'
                            ? `${result.first_name} ${result.last_name || ''}`
                            : result.type === 'event'
                            ? result.title
                            : result.type === 'note'
                            ? result.title || (result.content?.length > 60 ? result.content.slice(0, 60) + '…' : result.content)
                            : result.title || 'Взаимодействие'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.type === 'contact' 
                            ? 'Контакт' 
                            : result.type === 'event'
                            ? 'Событие'
                            : result.type === 'note'
                            ? 'Заметка'
                            : 'Взаимодействие'}
                          {(result.type === 'interaction' || result.type === 'note') && result.contact_name && (
                            <span className="ml-1 text-gray-400">
                              — {result.contact_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Кнопка отмены */}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleClose}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Правая панель (уведомления, настройки, выход) */}
          <div className="flex items-center space-x-1">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/tags" className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Управление тегами
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/trash" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Корзина
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/events" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    События
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/calendar" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Календарь
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/events/archive" className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Архив событий
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}