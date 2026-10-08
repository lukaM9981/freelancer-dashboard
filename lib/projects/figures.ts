import type { TaskStatus } from "@/components/status-badge";
import { type Currency, type Money, toCents } from "@/lib/money";

const STATUS_ORDER: readonly TaskStatus[] = [
  "draft",
  "pending_approval",
  "changes_requested",
  "approved",
  "in_progress",
  "on_hold",
  "done",
  "accepted",
  "rejected",
  "cancelled",
];

const CURRENCY_ORDER: readonly Currency[] = ["EUR", "USD"];

/** Statuses whose remaining time is still planned work (PRD §5.2: planning uses the maximum). */
const PLANNED_STATUSES: ReadonlySet<string> = new Set(["approved", "in_progress", "on_hold"]);

/** Statuses whose approved limit no longer stands. */
const WITHDRAWN_STATUSES: ReadonlySet<string> = new Set(["rejected", "cancelled"]);

export type StatusCount = { status: TaskStatus; count: number };

export function isTaskStatus(value: string): value is TaskStatus {
  return (STATUS_ORDER as readonly string[]).includes(value);
}

/** Non-zero counts, in lifecycle order. */
export function countByStatus(tasks: readonly { status: string }[]): StatusCount[] {
  const counts = new Map<TaskStatus, number>();
  for (const task of tasks) {
    if (!isTaskStatus(task.status)) continue;
    counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
  }
  return STATUS_ORDER.filter((status) => counts.has(status)).map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

export type MonthLine = {
  counted_minutes: number | null;
  over_limit_minutes: number | null;
  amount: number | string | null;
  currency: string | null;
};

export type MonthFigures = {
  /** Counted plus over-limit minutes: everything tracked this month. */
  trackedMinutes: number;
  /** One amount per currency, never added across currencies (PRD §8 rule 14). */
  amounts: Money[];
  /** Some counted time has no rate covering its work date. */
  missingRate: boolean;
};

export function monthFigures(lines: readonly MonthLine[]): MonthFigures {
  let trackedMinutes = 0;
  let missingRate = false;
  const cents = new Map<Currency, number>();

  for (const line of lines) {
    const counted = line.counted_minutes ?? 0;
    trackedMinutes += counted + (line.over_limit_minutes ?? 0);
    if (line.currency !== "EUR" && line.currency !== "USD") {
      if (counted > 0) missingRate = true;
      continue;
    }
    cents.set(line.currency, (cents.get(line.currency) ?? 0) + toCents(line.amount ?? 0));
  }

  return {
    trackedMinutes,
    amounts: CURRENCY_ORDER.filter((currency) => cents.has(currency)).map((currency) => ({
      currency,
      cents: cents.get(currency) ?? 0,
    })),
    missingRate,
  };
}

export type ProgressRow = {
  status: string | null;
  limit_minutes: number | null;
  counted_minutes: number | null;
  over_limit_minutes: number | null;
  remaining_minutes: number | null;
};

export type ProjectSummary = {
  approvedMinutes: number;
  countedMinutes: number;
  remainingMinutes: number;
  overLimitMinutes: number;
};

/**
 * Project totals from `task_progress` (DB.md §8). Approved time leaves out rejected and
 * cancelled tasks; remaining time covers only tasks that can still be worked on. Counted
 * and over-limit time include every task, because cancelled work stays payable.
 */
export function projectSummary(rows: readonly ProgressRow[]): ProjectSummary {
  const summary: ProjectSummary = {
    approvedMinutes: 0,
    countedMinutes: 0,
    remainingMinutes: 0,
    overLimitMinutes: 0,
  };
  for (const row of rows) {
    const status = row.status ?? "";
    summary.countedMinutes += row.counted_minutes ?? 0;
    summary.overLimitMinutes += row.over_limit_minutes ?? 0;
    if (row.limit_minutes != null && !WITHDRAWN_STATUSES.has(status)) {
      summary.approvedMinutes += row.limit_minutes;
    }
    if (PLANNED_STATUSES.has(status)) {
      summary.remainingMinutes += row.remaining_minutes ?? 0;
    }
  }
  return summary;
}
