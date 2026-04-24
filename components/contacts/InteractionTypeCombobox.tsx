'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { api } from '@/lib/api-client';

interface InteractionType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_system: boolean;
}

interface InteractionTypeComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function InteractionTypeCombobox({ value, onChange, placeholder = "Выберите тип..." }: InteractionTypeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [types, setTypes] = React.useState<InteractionType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const result = await api.get<{ success: boolean; data: InteractionType[] }>('/api/interaction-types');
      if (result.success) {
        setTypes(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch interaction types:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = types.find(t => t.id === value);
  const selectedLabel = selectedType?.name || placeholder;

  const handleSelect = (typeId: string) => {
    onChange(typeId);
    setOpen(false);
  };

  const handleCreateNew = async () => {
    if (!inputValue.trim()) return;
    try {
      const result = await api.post<{ success: boolean; data: InteractionType }>('/api/interaction-types', {
        name: inputValue.trim(),
      });
      if (result.success) {
        setTypes(prev => [...prev, result.data]);
        onChange(result.data.id);
        setOpen(false);
      }
    } catch (error) {
      alert('Ошибка при создании типа');
    }
  };

  const exactMatch = types.some(t => t.name.toLowerCase() === inputValue.trim().toLowerCase());

  if (loading) return <div className="h-10 w-full bg-gray-100 animate-pulse rounded-md" />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" sideOffset={5}>
        <Command>
          <CommandInput placeholder="Поиск или ввод..." value={inputValue} onValueChange={setInputValue} />
          <CommandList>
            <CommandEmpty>
              {inputValue && !exactMatch ? (
                <Button variant="ghost" className="w-full justify-start text-blue-600" onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать "{inputValue}"
                </Button>
              ) : (
                "Ничего не найдено"
              )}
            </CommandEmpty>
            <CommandGroup>
              {types.map(type => (
                <CommandItem key={type.id} value={type.id} onSelect={() => handleSelect(type.id)}>
                <Check className={cn("mr-2 h-4 w-4", value === type.id ? "opacity-100" : "opacity-0")} />
                <span style={{ color: type.color || undefined }}>{type.name}</span>
                {type.is_system && <span className="ml-2 text-xs text-muted-foreground">(системный)</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}