'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface RecurrencePickerProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  return (
    <div className="space-y-2">
      <Label>Повторение</Label>
      <Select 
        value={value || 'NONE'} 
        onValueChange={(v) => onChange(v === 'NONE' ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Не повторяется" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">Не повторяется</SelectItem>
          <SelectItem value="DAILY">Ежедневно</SelectItem>
          <SelectItem value="WEEKLY">Еженедельно</SelectItem>
          <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
          <SelectItem value="YEARLY">Ежегодно</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}