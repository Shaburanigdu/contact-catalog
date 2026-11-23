// lib/recurrence.ts
// Repeat rules for reminders, stored as a minimal RRULE subset (FREQ + INTERVAL).
import { addDays, addMonths, addWeeks, addYears } from 'date-fns';

export const REPEAT_OPTIONS = [
  { value: 'none', label: 'Не повторять', rule: null },
  { value: 'weekly', label: 'Каждую неделю', rule: 'FREQ=WEEKLY' },
  { value: 'monthly', label: 'Каждый месяц', rule: 'FREQ=MONTHLY' },
  { value: 'quarterly', label: 'Раз в 3 месяца', rule: 'FREQ=MONTHLY;INTERVAL=3' },
  { value: 'halfyear', label: 'Раз в полгода', rule: 'FREQ=MONTHLY;INTERVAL=6' },
  { value: 'yearly', label: 'Каждый год', rule: 'FREQ=YEARLY' },
] as const;

export type RepeatValue = (typeof REPEAT_OPTIONS)[number]['value'];

export function ruleForRepeat(value: string | undefined | null): string | null {
  return REPEAT_OPTIONS.find((o) => o.value === value)?.rule ?? null;
}

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export function parseRule(rule: string): { freq: Freq; interval: number } | null {
  const parts = Object.fromEntries(
    rule.split(';').map((p) => p.split('=') as [string, string])
  );
  const freq = parts.FREQ as Freq;
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null;
  const interval = parts.INTERVAL ? Number(parts.INTERVAL) : 1;
  if (!Number.isInteger(interval) || interval < 1) return null;
  return { freq, interval };
}

function step(date: Date, freq: Freq, n: number): Date {
  switch (freq) {
    case 'DAILY':
      return addDays(date, n);
    case 'WEEKLY':
      return addWeeks(date, n);
    case 'MONTHLY':
      return addMonths(date, n);
    case 'YEARLY':
      return addYears(date, n);
  }
}

/**
 * Next due date of a repeating reminder strictly after `after`.
 * Occurrences are counted from the original due date, so a monthly reminder on the
 * 31st falls back to the last day of shorter months without drifting.
 * Returns null for an invalid rule or when the series has ended.
 */
export function nextOccurrence(
  dueAt: Date,
  rule: string,
  after: Date = new Date(),
  until?: Date | null
): Date | null {
  const parsed = parseRule(rule);
  if (!parsed) return null;

  let k = 1;
  let next = step(dueAt, parsed.freq, parsed.interval);
  while (next <= after) {
    k += 1;
    next = step(dueAt, parsed.freq, parsed.interval * k);
    if (k > 10_000) return null; // safety net
  }
  if (until && next > until) return null;
  return next;
}
