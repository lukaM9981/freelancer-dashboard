import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/queries";
import { fetchAllRows } from "@/lib/db/all-rows";
import { formatMonth, monthStartInZone, monthStartsBetween } from "@/lib/dates";
import { monthFigures } from "@/lib/projects/figures";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { localParts } from "@/lib/time/run";
import { monthBlockers, monthWarnings, type MonthBlocker } from "@/lib/months/checks";
import type { Money } from "@/lib/money";

export type MonthListRow = {
  month: string;
  label: string;
  status: "open" | "closed";
  hasTime: boolean;
  countedMinutes: number;
  overLimitMinutes: number;
  amounts: Money[];
  missingRate: boolean;
  blockers: MonthBlocker[];
  warnings: string[];
  canClose: boolean;
  canReopen: boolean;
};

type LineRow = {
  month: string | null;
  task_id: string | null;
  counted_minutes: number | null;
  over_limit_minutes: number | null;
  amount: number | null;
  currency: string | null;
};

/** Every month from the first one with time through the current month (PRD §6.10). */
export async function listMonths(): Promise<{ rows: MonthListRow[]; currentMonth: string }> {
  await requireAdmin();
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const currentMonth = monthStartInZone(settings.timeZone);

  const [oldest, closures, timers, requests, doneTasks] = await Promise.all([
    supabase.from("report_lines").select("month").order("month", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("month_closures").select("month"),
    supabase.from("timers").select("started_at").is("stopped_at", null),
    fetchAllRows(
      (from, to) =>
        supabase
          .from("extra_hours_requests")
          .select("task_id")
          .eq("status", "pending")
          .order("id")
          .range(from, to),
      "Months failed",
    ),
    fetchAllRows(
      (from, to) => supabase.from("tasks").select("id").eq("status", "done").order("id").range(from, to),
      "Months failed",
    ),
  ]);
  for (const result of [oldest, closures, timers]) {
    if (result.error) throw new Error(`Months failed: ${result.error.message}`);
  }

  const firstMonth = oldest.data?.month;
  if (!firstMonth) return { rows: [], currentMonth };

  const lines = await fetchAllRows(
    (from, to) =>
      supabase
        .from("report_lines")
        .select("month, user_id, task_id, rate_id, counted_minutes, over_limit_minutes, amount, currency")
        .order("month")
        .order("user_id")
        .order("task_id")
        .order("rate_id", { nullsFirst: true })
        .range(from, to),
    "Months failed",
  );

  const lastMonth = firstMonth > currentMonth ? firstMonth : currentMonth;
  const closedMonths = (closures.data ?? []).map((row) => row.month);
  const closed = new Set(closedMonths);
  const latestClosed = closedMonths.reduce<string | null>(
    (latest, month) => (latest == null || month > latest ? month : latest),
    null,
  );
  const pendingTasks = new Set(requests.map((row) => row.task_id));
  const doneTaskIds = new Set(doneTasks.map((row) => row.id));
  const runningTimerStarts = (timers.data ?? []).map(
    (timer) => localParts(new Date(timer.started_at), settings.timeZone).date,
  );

  const byMonth = new Map<string, LineRow[]>();
  for (const line of lines) {
    if (!line.month) continue;
    const group = byMonth.get(line.month);
    if (group) group.push(line);
    else byMonth.set(line.month, [line]);
  }
  const monthsWithTime = [...byMonth.keys()];

  const rows = monthStartsBetween(firstMonth, lastMonth)
    .reverse()
    .map((month): MonthListRow => {
      const monthLines = byMonth.get(month) ?? [];
      const figures = monthFigures(monthLines);
      const countedMinutes = monthLines.reduce((sum, line) => sum + (line.counted_minutes ?? 0), 0);
      const overLimitMinutes = monthLines.reduce((sum, line) => sum + (line.over_limit_minutes ?? 0), 0);
      const hasTime = monthLines.length > 0;
      const status = closed.has(month) ? "closed" : "open";
      const doneTasksInMonth = new Set(
        monthLines.flatMap((line) => (line.task_id && doneTaskIds.has(line.task_id) ? [line.task_id] : [])),
      );
      const blockers =
        status === "open" && hasTime
          ? monthBlockers({
              month,
              currentMonth,
              monthsWithTime,
              closedMonths,
              runningTimerStarts,
              openExtraHours: monthLines.some(
                (line) => (line.over_limit_minutes ?? 0) > 0 && line.task_id != null && pendingTasks.has(line.task_id),
              ),
              missingRate: figures.missingRate,
            })
          : [];
      const canClose = status === "open" && hasTime && blockers.length === 0;
      return {
        month,
        label: formatMonth(month),
        status,
        hasTime,
        countedMinutes,
        overLimitMinutes,
        amounts: figures.amounts,
        missingRate: figures.missingRate,
        blockers,
        warnings: canClose ? monthWarnings(doneTasksInMonth.size, overLimitMinutes) : [],
        canClose,
        canReopen: status === "closed" && month === latestClosed,
      };
    });

  return { rows, currentMonth };
}
