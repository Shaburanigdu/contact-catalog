// lib/birthdays.ts

/**
 * Birthday occurrences of a person within [from, to] (inclusive), in local time.
 * Feb 29 birthdays are shown on Feb 28 in non-leap years.
 */
export function birthdaysInRange(dateOfBirth: Date, from: Date, to: Date): Date[] {
  const month = dateOfBirth.getUTCMonth();
  const day = dateOfBirth.getUTCDate();
  const result: Date[] = [];

  for (let year = from.getFullYear(); year <= to.getFullYear(); year++) {
    let d = new Date(year, month, day);
    if (d.getMonth() !== month) d = new Date(year, month + 1, 0); // Feb 29 -> Feb 28
    if (d >= startOfDayLocal(from) && d <= to) result.push(d);
  }
  return result;
}

function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
