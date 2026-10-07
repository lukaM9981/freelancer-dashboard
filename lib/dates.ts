import { tz } from "@date-fns/tz";
import {
  addDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isValid,
} from "date-fns";

type DateInput = Date | string | number;

/**
 * Display formatting in a named time zone. The database decides what "today"
 * is; these functions only render a moment the server already resolved
 * (Tech.md §7.7).
 */
export function formatDate(value: DateInput, timeZone: string): string {
  return formatInZone(value, timeZone, "d MMM yyyy");
}

/** A `yyyy-MM-dd` calendar date, with no time zone shift. "2026-10-06" → "6 Oct 2026". */
export function formatCalendarDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error("That isn't a valid date.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return format(date, "d MMM yyyy", { in: tz("UTC") });
}

/** Calendar date in a named zone, `yyyy-MM-dd`. */
export function isoDateInZone(timeZone: string, now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd", { in: tz(timeZone) });
}

/** First day of the month after a `yyyy-MM-01` month start. */
export function nextMonthStart(monthStart: string): string {
  const match = /^(\d{4})-(\d{2})-01$/.exec(monthStart);
  if (!match) throw new Error("A month starts on the first.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error("A month starts on the first.");
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

/** "6 Oct 2026, 14:05" */
export function formatDateTime(value: DateInput, timeZone: string): string {
  return formatInZone(value, timeZone, "d MMM yyyy, HH:mm");
}

/**
 * Short feed labels: "3h ago", "12m ago", "yesterday". Anything older is the date.
 * `now` is injectable so tests don't depend on the clock.
 */
export function formatRelative(value: DateInput, timeZone: string, now: Date = new Date()): string {
  const moment = asDate(value);
  const zone = tz(timeZone);
  const day = format(moment, "yyyy-MM-dd", { in: zone });
  const today = format(now, "yyyy-MM-dd", { in: zone });
  if (day === today) {
    const minutes = differenceInMinutes(now, moment);
    if (minutes < 0) return formatDate(moment, timeZone);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    return `${differenceInHours(now, moment)}h ago`;
  }
  const yesterday = format(addDays(now, -1, { in: zone }), "yyyy-MM-dd", { in: zone });
  if (day === yesterday) return "yesterday";
  return formatDate(moment, timeZone);
}

function formatInZone(value: DateInput, timeZone: string, pattern: string): string {
  return format(asDate(value), pattern, { in: tz(timeZone) });
}

function asDate(value: DateInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) {
    throw new Error("That isn't a valid date.");
  }
  return date;
}
