'use client';

import { TimelineItem } from '@/types/timeline';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FileIcon, ImageIcon, VideoIcon, AudioLinesIcon, BellIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineMessageProps {
  item: TimelineItem;
  contactName: string;
  contactAvatar?: string;
}

export function TimelineMessage({ item, contactName, contactAvatar }: TimelineMessageProps) {
  const isOutgoing = true; // все сообщения от текущего пользователя

  const getIcon = () => {
    if (item.type === 'media') {
      switch (item.mediaType) {
        case 'image': return <ImageIcon className="h-4 w-4" />;
        case 'video': return <VideoIcon className="h-4 w-4" />;
        case 'audio': return <AudioLinesIcon className="h-4 w-4" />;
        default: return <FileIcon className="h-4 w-4" />;
      }
    }
    if (item.type === 'reminder') return <BellIcon className="h-4 w-4" />;
    return null;
  };

  const renderContent = () => {
    switch (item.type) {
      case 'media':
        return (
          <div className="space-y-2">
            {item.mediaType === 'image' ? (
              <img src={item.url} alt={item.caption || ''} className="max-w-full rounded-lg max-h-60 object-cover" />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                {getIcon()}
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                  {item.fileName}
                </a>
              </div>
            )}
            {item.caption && <p className="text-sm text-gray-700">{item.caption}</p>}
          </div>
        );
      case 'note':
        return <p className="text-sm whitespace-pre-wrap text-gray-700">{item.content}</p>;
      case 'reminder': {
        const dueDate = item.dueAt ? new Date(item.dueAt) : null;
        const isValidDate = dueDate && !isNaN(dueDate.getTime());
        return (
          <div className="space-y-1">
            <p className="font-medium text-sm">{item.title}</p>
            {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
            <p className="text-xs text-gray-500">
              Напоминание: {isValidDate
                ? format(dueDate, 'd MMMM yyyy, HH:mm', { locale: ru })
                : 'Дата не указана'
              }
            </p>
          </div>
        );
      }
    }
  };

  return (
    <div className={cn("flex gap-3", isOutgoing ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8 ring-2 ring-background">
        <AvatarImage src={contactAvatar} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {contactName[0]}
        </AvatarFallback>
      </Avatar>
      <Card className={cn(
        "max-w-[80%] p-3 shadow-sm",
        isOutgoing ? "bg-primary/5 border-primary/10" : "bg-white"
      )}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {getIcon()}
          <span>{format(new Date(item.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}</span>
        </div>
        {renderContent()}
      </Card>
    </div>
  );
}