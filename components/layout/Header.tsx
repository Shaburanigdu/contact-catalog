// components/layout/Header.tsx
'use client';
import dynamic from 'next/dynamic';
import { Calendar, Archive } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Закрывать результаты при клике вне области поиска
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce для поиска
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
            setOpen(true);
          })
          .catch(console.error);
      } else {
        setSearchResults([]);
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (result: any) => {
    setOpen(false);
    setSearchQuery('');
    if (result.type === 'contact') {
      router.push(`/dashboard/contacts/${result.id}`);
    } else if (result.type === 'event') {
      router.push(`/dashboard/events/${result.id}`);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
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

          {/* Поисковая строка */}
          <div className="relative w-96" ref={searchRef}>
            <input
              type="text"
              placeholder="Поиск по смыслу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setOpen(true);
              }}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {open && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-white shadow-lg">
                {searchResults.map((result: any) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="cursor-pointer px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                  >
                    <div className="font-medium">
                      {result.type === 'contact'
                        ? `${result.first_name} ${result.last_name || ''}`
                        : result.title}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {result.type === 'contact' ? 'Контакт' : 'Событие'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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