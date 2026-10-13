import { TZDate, tz } from "@date-fns/tz";
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

/** First day of the current month in a named zone, `yyyy-MM-01`. */
export function monthStartInZone(timeZone: string, now: Date = new Date()): string {
  return format(now, "yyyy-MM-01", { in: tz(timeZone) });
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

/** First day of the month before a `yyyy-MM-01` month start. */
export function previousMonthStart(monthStart: string): string {
  const match = /^(\d{4})-(\d{2})-01$/.exec(monthStart);
  if (!match) throw new Error("A month starts on the first.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error("A month starts on the first.");
  if (month === 1) return `${year - 1}-12-01`;
  return `${year}-${String(month - 1).padStart(2, "0")}-01`;
}

/** `yyyy-MM-01` for a calendar date. */
export function monthStartOf(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate);
  if (!match) throw new Error("That isn't a valid date.");
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error("That isn't a valid date.");
  return `${match[1]}-${match[2]}-01`;
}

/** Inclusive month starts from `from` through `through`, oldest first. */
export function monthStartsBetween(from: string, through: string): string[] {
  if (from > through) return [];
  const months: string[] = [];
  let cursor = from;
  while (cursor <= through) {
    months.push(cursor);
    const next = nextMonthStart(cursor);
    if (next <= cursor || months.length > 240) throw new Error("A month starts on the first.");
    cursor = next;
  }
  return months;
}

/** "October 2026" for a `yyyy-MM-01` month start. */
export function formatMonth(monthStart: string): string {
  const match = /^(\d{4})-(\d{2})-01$/.exec(monthStart);
  if (!match) throw new Error("A month starts on the first.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1, 12));
  return format(date, "MMMM yyyy", { in: tz("UTC") });
}

/** Adds calendar days to a `yyyy-MM-dd` date, with no time zone shift. */
export function addCalendarDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match || !Number.isInteger(days)) throw new Error("That isn't a valid date.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12));
  return format(date, "yyyy-MM-dd", { in: tz("UTC") });
}

/** The moment a `yyyy-MM-dd` day starts in a named zone, as an ISO timestamp. */
export function dayStartInZone(isoDate: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error("That isn't a valid date.");
  const start = new TZDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]), timeZone);
  if (!isValid(start) || format(start, "yyyy-MM-dd", { in: tz(timeZone) }) !== isoDate) {
    throw new Error("That isn't a valid date.");
  }
  return new Date(start.getTime()).toISOString();
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

/** How long something has been waiting: "under 1h", "5h", "1 day", "3 days". */
export function formatAge(since: DateInput, now: Date = new Date()): string {
  const hours = differenceInHours(now, asDate(since));
  if (hours < 1) return "under 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
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
