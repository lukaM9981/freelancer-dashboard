import {
  addCalendarDays,
  dayStartInZone,
  formatCalendarDate,
  formatMonth,
  isoDateInZone,
  monthStartOf,
  nextMonthStart,
  previousMonthStart,
} from "@/lib/dates";

export const SCREENSHOT_PAGE_SIZE = 12;

export type PeriodUnit = "day" | "week" | "month";

/** A calendar date inside the period, `yyyy-MM-dd`, in the organization time zone. */
export type ScreenshotPeriod = {
  unit: PeriodUnit;
  anchor: string;
};

/** The week of the newest screenshot. A week runs Monday through Sunday. */
export function initialScreenshotPeriod(capturedAt: string, timeZone: string): ScreenshotPeriod {
  return { unit: "week", anchor: isoDateInZone(timeZone, new Date(capturedAt)) };
}

export function withUnit(period: ScreenshotPeriod, unit: PeriodUnit): ScreenshotPeriod {
  return { unit, anchor: period.anchor };
}

/** Move to the previous or next day, week, or month. The anchor lands on the period start. */
export function shiftPeriod(period: ScreenshotPeriod, direction: -1 | 1): ScreenshotPeriod {
  if (period.unit === "day") {
    return { unit: "day", anchor: addCalendarDays(period.anchor, direction) };
  }
  if (period.unit === "week") {
    return { unit: "week", anchor: addCalendarDays(mondayOf(period.anchor), direction * 7) };
  }
  const start = monthStartOf(period.anchor);
  return {
    unit: "month",
    anchor: direction === 1 ? nextMonthStart(start) : previousMonthStart(start),
  };
}

/** Inclusive calendar start and exclusive calendar end, both `yyyy-MM-dd`. */
export function periodBounds(period: ScreenshotPeriod): { start: string; end: string } {
  if (period.unit === "day") {
    return { start: period.anchor, end: addCalendarDays(period.anchor, 1) };
  }
  if (period.unit === "week") {
    const start = mondayOf(period.anchor);
    return { start, end: addCalendarDays(start, 7) };
  }
  const start = monthStartOf(period.anchor);
  return { start, end: nextMonthStart(start) };
}

export function inPeriod(period: ScreenshotPeriod, capturedAt: string, timeZone: string): boolean {
  const instant = new Date(capturedAt).getTime();
  if (Number.isNaN(instant)) return false;
  const { start, end } = periodBounds(period);
  const from = new Date(dayStartInZone(start, timeZone)).getTime();
  const to = new Date(dayStartInZone(end, timeZone)).getTime();
  return instant >= from && instant < to;
}

/** "Today, 26 Oct 2026", "This week, 26 Oct – 1 Nov 2026", "This month, October 2026". */
export function periodLabel(period: ScreenshotPeriod, today: string): string {
  const { start, end } = periodBounds(period);
  const last = addCalendarDays(end, -1);
  if (period.unit === "day") {
    const date = formatCalendarDate(start);
    return start === today ? `Today, ${date}` : date;
  }
  if (period.unit === "week") {
    const range = calendarRange(start, last);
    return today >= start && today <= last ? `This week, ${range}` : range;
  }
  const month = formatMonth(start);
  return monthStartOf(today) === start ? `This month, ${month}` : month;
}

export function periodStepLabel(unit: PeriodUnit, direction: "previous" | "next"): string {
  const name = unit === "day" ? "day" : unit === "week" ? "week" : "month";
  return direction === "previous" ? `Previous ${name}` : `Next ${name}`;
}

export function pageSlice<T>(
  items: readonly T[],
  page: number,
  size = SCREENSHOT_PAGE_SIZE,
): { items: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Number.isInteger(page) ? Math.min(Math.max(page, 1), pageCount) : 1;
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, pageCount };
}

/** Monday of the calendar week that contains `isoDate`. */
function mondayOf(isoDate: string): string {
  const valid = addCalendarDays(isoDate, 0);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valid);
  if (!match) throw new Error("That isn't a valid date.");
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  const sinceMonday = utc.getUTCDay() === 0 ? 6 : utc.getUTCDay() - 1;
  return addCalendarDays(valid, -sinceMonday);
}

function calendarRange(start: string, end: string): string {
  const endLabel = formatCalendarDate(end);
  if (start.slice(0, 4) === end.slice(0, 4)) {
    return `${formatCalendarDate(start).replace(/ \d{4}$/, "")} \u2013 ${endLabel}`;
  }
  return `${formatCalendarDate(start)} \u2013 ${endLabel}`;
}
