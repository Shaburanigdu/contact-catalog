'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  description?: string | null;
  dueAt: string;
  contact?: string | null;
  eventTitle?: string | null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get<{ notifications: Notification[] }>('/api/notifications');
      if (res && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Обновляем каждые 60 секунд
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismissNotification = async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/dismiss`, {});
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Уведомления</h4>
        </div>
        {loading ? (
          <div className="p-4 text-center text-gray-500">Загрузка...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Новых уведомлений нет</div>
        ) : (
          <ScrollArea className="max-h-96">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-3 border-b last:border-0 hover:bg-gray-50">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notif.title}</p>
                    {notif.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{notif.description}</p>
                    )}
                    {notif.contact && (
                      <p className="text-xs text-gray-500 mt-1">Контакт: {notif.contact}</p>
                    )}
                    {notif.eventTitle && (
                      <p className="text-xs text-gray-500">Событие: {notif.eventTitle}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notif.dueAt), { addSuffix: true, locale: ru })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => dismissNotification(notif.id)}
                  >
                    Ок
                  </Button>
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}