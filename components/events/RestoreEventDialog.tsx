'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';

interface RestoreEventDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RestoreEventDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  onSuccess,
}: RestoreEventDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    if (!startDate) return;
    setLoading(true);
    try {
      const res = await api.put<{ success: boolean }>(`/api/events/${eventId}`, {
        status: 'scheduled',
        deleted_at: null,
        start_at: startDate.toISOString(),
        end_at: endDate?.toISOString(),
      });
      if (res.success) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to restore event', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Восстановление события</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Событие <span className="font-semibold">{eventTitle}</span> уже прошло. Укажите новую дату и время.
          </p>
          <div>
            <label className="block text-sm font-medium mb-2">
              Новая дата и время начала <span className="text-red-500">*</span>
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP HH:mm', { locale: ru }) : <span>Выберите дату</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Input
                    type="time"
                    onChange={(e) => {
                      if (startDate) {
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(startDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setStartDate(newDate);
                      }
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Новая дата и время окончания (необязательно)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP HH:mm', { locale: ru }) : <span>Выберите дату</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Input
                    type="time"
                    onChange={(e) => {
                      if (endDate) {
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(endDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setEndDate(newDate);
                      }
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleRestore} disabled={!startDate || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Восстановить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}