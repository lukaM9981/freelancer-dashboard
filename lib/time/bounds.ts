import { nextMonthStart } from "@/lib/dates";

/**
 * The first work date an entry may use: not before the task was approved, and not in
 * or before the most recently closed month (PRD §6.8).
 */
export function earliestWorkDate(firstApprovedOn: string, latestClosedMonth: string | null): string {
  const afterClosed = latestClosedMonth ? nextMonthStart(latestClosedMonth) : firstApprovedOn;
  return firstApprovedOn > afterClosed ? firstApprovedOn : afterClosed;
}

/** A work date can still change when no closed month covers it or anything after it. */
export function monthIsOpen(workDate: string, latestClosedMonth: string | null): boolean {
  return latestClosedMonth == null || workDate >= nextMonthStart(latestClosedMonth);
}

const MONTH = /^(\d{4})-(\d{2})$/;

/**
 * The month My time shows. `requested` is `yyyy-MM`; anything missing or outside
 * the viewer's range falls back to the organization's current month.
 */
export function clampMonth(requested: string | undefined, earliest: string, current: string): string {
  const match = requested ? MONTH.exec(requested) : null;
  if (!match) return current;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return current;
  const start = `${match[1]}-${match[2]}-01`;
  if (start < earliest || start > current) return current;
  return start;
}
