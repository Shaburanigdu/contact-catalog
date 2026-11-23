import { describe, expect, it } from 'vitest';
import { birthdaysInRange } from '@/lib/birthdays';

// Dates of birth come from a DATE column, i.e. midnight UTC.
const dob = (s: string) => new Date(`${s}T00:00:00Z`);
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('birthdaysInRange', () => {
  it('finds a birthday inside the range', () => {
    const result = birthdaysInRange(dob('1990-03-15'), local(2026, 3, 1), local(2026, 3, 31));
    expect(result).toEqual([local(2026, 3, 15)]);
  });

  it('ignores birthdays outside the range', () => {
    expect(birthdaysInRange(dob('1990-05-15'), local(2026, 3, 1), local(2026, 3, 31))).toEqual([]);
  });

  it('handles ranges spanning the new year', () => {
    const result = birthdaysInRange(dob('1985-01-02'), local(2026, 12, 28), local(2027, 1, 10));
    expect(result).toEqual([local(2027, 1, 2)]);
  });

  it('includes a birthday on the first day of the range', () => {
    const result = birthdaysInRange(dob('2000-06-01'), local(2026, 6, 1), local(2026, 6, 30));
    expect(result).toEqual([local(2026, 6, 1)]);
  });

  it('moves Feb 29 to Feb 28 in non-leap years', () => {
    expect(birthdaysInRange(dob('2000-02-29'), local(2027, 2, 1), local(2027, 3, 31))).toEqual([
      local(2027, 2, 28),
    ]);
    expect(birthdaysInRange(dob('2000-02-29'), local(2028, 2, 1), local(2028, 3, 31))).toEqual([
      local(2028, 2, 29),
    ]);
  });
});
