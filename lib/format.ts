/**
 * The one import for display formatting (Design.md §5.3).
 * Parsing lives beside each formatter; screens should not format inline.
 */
export { formatCalendarDate, formatDate, formatDateTime, formatRelative } from "@/lib/dates";
export { formatDuration, parseDuration, snapMinutes } from "@/lib/duration";
export { formatAmounts, formatMoney, toCents, type Currency, type Money } from "@/lib/money";

/** "4–8 h", "2.5–3.75 h". Decimal hours, en dash. */
export function formatEstimateRange(minMinutes: number, maxMinutes: number): string {
  return `${decimalHours(minMinutes)}\u2013${decimalHours(maxMinutes)} h`;
}

/** "01:23:45" */
export function formatTimer(totalSeconds: number): string {
  if (!Number.isInteger(totalSeconds) || totalSeconds < 0) {
    throw new Error("A timer is a whole number of seconds.");
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

/** Whole percent, already on a 0–100 scale: 80 → "80%". */
export function formatPercent(percent: number): string {
  if (!Number.isFinite(percent)) {
    throw new Error("A percent must be a finite number.");
  }
  return `${Math.round(percent)}%`;
}

function decimalHours(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("A duration must be a whole number of minutes.");
  }
  const hundredths = Math.round((minutes * 100) / 60);
  const whole = Math.trunc(hundredths / 100);
  const fraction = hundredths % 100;
  if (fraction === 0) return String(whole);
  if (fraction % 10 === 0) return `${whole}.${fraction / 10}`;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}
