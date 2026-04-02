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

export interface Option {
  value: string;
  label: string;
}

const defaultOptions: Option[] = [
  { value: 'friend', label: 'Друг' },
  { value: 'family', label: 'Семья' },
  { value: 'colleague', label: 'Коллега' },
  { value: 'acquaintance', label: 'Знакомый' },
  { value: 'business', label: 'Деловой партнер' },
  { value: 'mentor', label: 'Наставник' },
  { value: 'client', label: 'Клиент' },
];

interface RelationshipTypeComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options?: Option[];
  dynamicOptions?: Option[]; // типы, загруженные из БД
}

export function RelationshipTypeCombobox({
  value,
  onChange,
  placeholder = "Выберите или введите тип отношений...",
  options = defaultOptions,
  dynamicOptions = [],
}: RelationshipTypeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const allOptions = React.useMemo(() => {
    const combined = [...options, ...dynamicOptions];
    const seen = new Set();
    return combined.filter(opt => {
      const key = opt.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options, dynamicOptions]);

  const selectedLabel = React.useMemo(() => {
    if (!value) return placeholder;
    const option = allOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  }, [value, allOptions, placeholder]);

  React.useEffect(() => {
    if (open) {
      setInputValue(value || '');
    }
  }, [open, value]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim());
      setOpen(false);
    }
  };

  const exactMatch = React.useMemo(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return false;
    return allOptions.some(
      opt => opt.value.toLowerCase() === trimmed || opt.label.toLowerCase() === trimmed
    );
  }, [allOptions, inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        sideOffset={5}
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Поиск или ввод..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>
              {inputValue && !exactMatch ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-600"
                  onClick={handleCreateNew}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Создать: "{inputValue}"
                </Button>
              ) : (
                "Ничего не найдено"
              )}
            </CommandEmpty>
            <CommandGroup>
              {allOptions.map(opt => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  keywords={[opt.label]}
                  onSelect={() => handleSelect(opt.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}