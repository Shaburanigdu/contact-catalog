import { describe, expect, it } from 'vitest';
import { nextOccurrence, parseRule, ruleForRepeat } from '@/lib/recurrence';

const d = (s: string) => new Date(s);

describe('ruleForRepeat', () => {
  it('maps UI options to rules', () => {
    expect(ruleForRepeat('quarterly')).toBe('FREQ=MONTHLY;INTERVAL=3');
    expect(ruleForRepeat('yearly')).toBe('FREQ=YEARLY');
  });

  it('returns null for "none" and unknown values', () => {
    expect(ruleForRepeat('none')).toBeNull();
    expect(ruleForRepeat('every-tuesday')).toBeNull();
    expect(ruleForRepeat(undefined)).toBeNull();
  });
});

describe('parseRule', () => {
  it('parses frequency and interval', () => {
    expect(parseRule('FREQ=MONTHLY;INTERVAL=3')).toEqual({ freq: 'MONTHLY', interval: 3 });
    expect(parseRule('FREQ=WEEKLY')).toEqual({ freq: 'WEEKLY', interval: 1 });
  });

  it('rejects invalid rules', () => {
    expect(parseRule('FREQ=HOURLY')).toBeNull();
    expect(parseRule('FREQ=MONTHLY;INTERVAL=0')).toBeNull();
    expect(parseRule('garbage')).toBeNull();
  });
});

describe('nextOccurrence', () => {
  it('returns the next step after the reference date', () => {
    const next = nextOccurrence(d('2026-01-10T10:00:00Z'), 'FREQ=MONTHLY', d('2026-01-10T10:00:01Z'));
    expect(next).toEqual(d('2026-02-10T10:00:00Z'));
  });

  it('skips occurrences missed while the reminder was overdue', () => {
    const next = nextOccurrence(d('2026-01-01T09:00:00Z'), 'FREQ=WEEKLY', d('2026-01-20T00:00:00Z'));
    expect(next).toEqual(d('2026-01-22T09:00:00Z'));
  });

  it('keeps the original day of month instead of drifting after short months', () => {
    const due = d('2026-01-31T12:00:00Z');
    const feb = nextOccurrence(due, 'FREQ=MONTHLY', d('2026-02-01T00:00:00Z'));
    expect(feb?.getUTCDate()).toBe(28);
    const mar = nextOccurrence(due, 'FREQ=MONTHLY', d('2026-03-01T00:00:00Z'));
    expect(mar?.getUTCDate()).toBe(31);
  });

  it('honours the interval', () => {
    const next = nextOccurrence(d('2026-01-15T00:00:00Z'), 'FREQ=MONTHLY;INTERVAL=3', d('2026-01-16T00:00:00Z'));
    expect(next).toEqual(d('2026-04-15T00:00:00Z'));
  });

  it('stops after the end date', () => {
    const next = nextOccurrence(
      d('2026-01-15T00:00:00Z'),
      'FREQ=MONTHLY',
      d('2026-03-16T00:00:00Z'),
      d('2026-03-31T00:00:00Z')
    );
    expect(next).toBeNull();
  });

  it('returns null for an invalid rule', () => {
    expect(nextOccurrence(d('2026-01-15T00:00:00Z'), 'nope')).toBeNull();
  });
});
