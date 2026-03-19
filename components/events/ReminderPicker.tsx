'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReminderPickerProps {
  startDate?: Date;
  onChange: (reminder: { due_at: Date; title?: string } | null) => void;
  initialReminder?: { due_at: string; title?: string } | null;
}

const REMINDER_OPTIONS = [
  { value: 5, label: 'За 5 минут' },
  { value: 15, label: 'За 15 минут' },
  { value: 30, label: 'За 30 минут' },
  { value: 60, label: 'За 1 час' },
  { value: 120, label: 'За 2 часа' },
  { value: 1440, label: 'За 1 день' },
  { value: 10080, label: 'За 7 дней' },
];

export default function ReminderPicker({ startDate, onChange, initialReminder }: ReminderPickerProps) {
  const [enabled, setEnabled] = useState(!!initialReminder);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    if (initialReminder && startDate) {
      // Попытка восстановить минуты из due_at (если возможно)
      const due = new Date(initialReminder.due_at);
      const diff = Math.round((due.getTime() - startDate.getTime()) / 60000);
      if (diff <= 0 && REMINDER_OPTIONS.some(opt => opt.value === -diff)) {
        setMinutes(-diff);
      }
    }
  }, [initialReminder, startDate]);

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    if (checked && startDate) {
      const due_at = new Date(startDate.getTime() - minutes * 60000);
      onChange({ due_at, title: `Напоминание` });
    } else {
      onChange(null);
    }
  };

  const handleMinutesChange = (value: string) => {
    const mins = parseInt(value, 10);
    setMinutes(mins);
    if (enabled && startDate) {
      const due_at = new Date(startDate.getTime() - mins * 60000);
      onChange({ due_at, title: `Напоминание` });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="reminder"
          checked={enabled}
          disabled={!startDate}
          onCheckedChange={(checked) => handleEnabledChange(checked as boolean)}
        />
        <Label htmlFor="reminder" className={!startDate ? 'text-gray-400' : ''}>
          Напомнить
        </Label>
      </div>
      {enabled && startDate && (
        <Select value={minutes.toString()} onValueChange={handleMinutesChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите время" />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {!startDate && enabled && (
        <p className="text-sm text-amber-600">Сначала выберите дату начала</p>
      )}
    </div>
  );
}