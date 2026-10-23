import { CalendarEntry } from "./models";

export const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function parseLocalDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Invalid calendar date: ${key}`);
  const date = new Date(year, month - 1, day, 12);
  if (localDateKey(date) !== key) throw new Error(`Invalid calendar date: ${key}`);
  return date;
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  result.setDate(result.getDate() + amount);
  return result;
}

export function monthDates(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function entryOccursOnDate(entry: CalendarEntry, date: Date) {
  const selected = localDateKey(date);
  if (!entry.yearly) return entry.date === selected;
  const [year, month, day] = selected.split("-").map(Number);
  const [, originalMonth, originalDay] = entry.date.split("-").map(Number);
  if (month !== originalMonth) return false;
  const occurrenceDay = originalMonth === 2 && originalDay === 29 && !isLeapYear(year) ? 28 : originalDay;
  return day === occurrenceDay;
}

export function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function dateLabel(date: Date, options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
