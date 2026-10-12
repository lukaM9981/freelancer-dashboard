import { nextMonthStart } from "@/lib/dates";
import { formatDuration } from "@/lib/duration";

/** The same refusals `close_month` raises, in the same order (DB.md §5.5, PRD §6.10). */
export const MONTH_BLOCKERS = [
  "month_not_ended",
  "earlier_month_open",
  "timer_running_in_month",
  "open_extra_hours_request",
  "missing_rate",
] as const;

export type MonthBlocker = (typeof MONTH_BLOCKERS)[number];

export type MonthCheckInput = {
  /** `yyyy-MM-01` */
  month: string;
  /** The organization's current month, `yyyy-MM-01`. */
  currentMonth: string;
  /** Months that contain time, `yyyy-MM-01`. */
  monthsWithTime: readonly string[];
  /** Months with a row in `month_closures`. */
  closedMonths: readonly string[];
  /** Organization-local start dates (`yyyy-MM-dd`) of timers that are still running. */
  runningTimerStarts: readonly string[];
  /** A pending extra-hours request sits on a task with over-limit time in this month. */
  openExtraHours: boolean;
  /** Counted time in this month has no rate. */
  missingRate: boolean;
};

export function monthBlockers(input: MonthCheckInput): MonthBlocker[] {
  const closed = new Set(input.closedMonths);
  const blockers: MonthBlocker[] = [];
  if (input.month >= input.currentMonth) blockers.push("month_not_ended");
  if (input.monthsWithTime.some((start) => start < input.month && !closed.has(start))) {
    blockers.push("earlier_month_open");
  }
  const monthEnds = nextMonthStart(input.month);
  if (input.runningTimerStarts.some((date) => date < monthEnds)) blockers.push("timer_running_in_month");
  if (input.openExtraHours) blockers.push("open_extra_hours_request");
  if (input.missingRate) blockers.push("missing_rate");
  return blockers;
}

/** Shown before close, and they do not block it (PRD §6.10). */
export function monthWarnings(doneTaskCount: number, overLimitMinutes: number): string[] {
  const warnings: string[] = [];
  if (doneTaskCount > 0) {
    warnings.push(
      doneTaskCount === 1
        ? "1 task is Done and still waiting for acceptance. Closing includes its time."
        : `${doneTaskCount} tasks are Done and still waiting for acceptance. Closing includes their time.`,
    );
  }
  if (overLimitMinutes > 0) {
    warnings.push(`${formatDuration(overLimitMinutes)} is over limit and will stay unpaid.`);
  }
  return warnings;
}
