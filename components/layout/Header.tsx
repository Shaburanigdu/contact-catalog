// components/layout/Header.tsx
'use client';
import dynamic from 'next/dynamic';
import { Calendar, Archive } from 'lucide-react';
import Link from 'next/link';
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