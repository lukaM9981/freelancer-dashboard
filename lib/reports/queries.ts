import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import type { Viewer } from "@/lib/auth/queries";
import { fetchAllRows } from "@/lib/db/all-rows";
import { clampMonth } from "@/lib/time/bounds";
import { formatMonth, monthStartInZone, monthStartsBetween } from "@/lib/dates";
import { toCents, type Currency, type Money } from "@/lib/money";
import { monthFigures } from "@/lib/projects/figures";
import { csvFilename, reportPath } from "@/lib/reports/paths";
import {
  buildReportCsv,
  rateCovering,
  type CsvEntry,
  type CsvLine,
  type RateSpan,
} from "@/lib/reports/csv";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { localParts } from "@/lib/time/run";

export type ReportPerson = { id: string; fullName: string };

export type ReportRow = {
  taskId: string;
  rateId: string | null;
  projectName: string;
  taskTitle: string;
  countedMinutes: number;
  overLimitMinutes: number;
  hourlyRateCents: number | null;
  currency: Currency | null;
  amountCents: number;
};

export type ReportSection = {
  userId: string;
  fullName: string;
  rows: ReportRow[];
  countedMinutes: number;
  overLimitMinutes: number;
  amounts: Money[];
  missingRate: boolean;
};

export type MonthlyReport = {
  month: string;
  currentMonth: string;
  months: { value: string; label: string }[];
  closed: boolean;
  people: ReportPerson[];
  selectedUserId: string | null;
  sections: ReportSection[];
  countedMinutes: number;
  overLimitMinutes: number;
  amounts: Money[];
};

type LineRow = {
  user_id: string | null;
  project_name: string | null;
  task_id: string | null;
  task_title: string | null;
  rate_id: string | null;
  hourly_rate: number | null;
  currency: string | null;
  counted_minutes: number | null;
  over_limit_minutes: number | null;
  amount: number | null;
};

const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthParam(value: string): boolean {
  return MONTH_PARAM.test(value);
}

/**
 * One month of `report_lines`. A path month outside the viewer's range redirects
 * to the current month. Admins may pass a freelancer id; anyone else sees only
 * their own lines, which RLS already enforces.
 */
export async function getMonthlyReport(
  viewer: Viewer,
  monthParam: string | undefined,
  userParam: string | undefined,
): Promise<MonthlyReport | { redirectTo: string }> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const currentMonth = monthStartInZone(settings.timeZone);
  const requestedUser = viewer.role === "admin" && userParam && z.uuid().safeParse(userParam).success ? userParam : null;

  const oldest = await supabase.from("report_lines").select("month").order("month", { ascending: true }).limit(1).maybeSingle();
  if (oldest.error) throw new Error(`Report failed: ${oldest.error.message}`);
  const firstMonth = oldest.data?.month && oldest.data.month <= currentMonth ? oldest.data.month : currentMonth;
  const month = clampMonth(monthParam, firstMonth, currentMonth);
  if (monthParam && month.slice(0, 7) !== monthParam) {
    return { redirectTo: reportPath(month, currentMonth, requestedUser) };
  }

  const [lines, closure] = await Promise.all([
    fetchAllRows(
      (from, to) =>
        supabase
          .from("report_lines")
          .select(
            "user_id, project_name, task_id, task_title, rate_id, hourly_rate, currency, counted_minutes, over_limit_minutes, amount",
          )
          .eq("month", month)
          .order("user_id")
          .order("task_id")
          .order("rate_id", { nullsFirst: true })
          .range(from, to),
      "Report failed",
    ),
    supabase.from("month_closures").select("month").eq("month", month).maybeSingle(),
  ]);
  if (closure.error) throw new Error(`Report failed: ${closure.error.message}`);

  const userIds = [...new Set(lines.flatMap((line) => (line.user_id ? [line.user_id] : [])))];
  const profiles =
    userIds.length === 0
      ? { data: [], error: null }
      : await supabase.from("profiles").select("id, full_name").in("id", userIds);
  if (profiles.error) throw new Error(`Report failed: ${profiles.error.message}`);

  const names = new Map((profiles.data ?? []).map((person) => [person.id, person.full_name]));
  let people = peopleIn(lines, names);
  if (requestedUser && !people.some((person) => person.id === requestedUser)) {
    const profile = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", requestedUser)
      .maybeSingle();
    if (profile.error) throw new Error(`Report failed: ${profile.error.message}`);
    if (profile.data?.role === "freelancer") {
      people = [...people, { id: profile.data.id, fullName: profile.data.full_name }].sort(
        (a, b) => a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id),
      );
    }
  }
  const selectedUserId = requestedUser && people.some((person) => person.id === requestedUser) ? requestedUser : null;
  const visible = selectedUserId ? lines.filter((line) => line.user_id === selectedUserId) : lines;
  const figures = monthFigures(visible);

  return {
    month,
    currentMonth,
    months: monthStartsBetween(firstMonth, currentMonth)
      .reverse()
      .map((value) => ({ value, label: formatMonth(value) })),
    closed: closure.data != null,
    people,
    selectedUserId,
    sections: sectionsFor(visible, names),
    countedMinutes: visible.reduce((sum, line) => sum + (line.counted_minutes ?? 0), 0),
    overLimitMinutes: visible.reduce((sum, line) => sum + (line.over_limit_minutes ?? 0), 0),
    amounts: figures.amounts,
  };
}

export async function loadReportCsv(
  viewer: Viewer,
  monthParam: string,
  userId: string | null,
): Promise<{ body: string; filename: string } | { error: "not-found" }> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const currentMonth = monthStartInZone(settings.timeZone);
  const oldest = await supabase.from("report_lines").select("month").order("month", { ascending: true }).limit(1).maybeSingle();
  if (oldest.error) throw new Error(`Report export failed: ${oldest.error.message}`);
  const firstMonth = oldest.data?.month && oldest.data.month <= currentMonth ? oldest.data.month : currentMonth;
  const month = clampMonth(monthParam, firstMonth, currentMonth);
  if (month.slice(0, 7) !== monthParam) return { error: "not-found" };

  const [entries, lines] = await Promise.all([
    fetchAllRows((from, to) => {
      let query = supabase
        .from("time_entries")
        .select(
          "id, user_id, task_id, work_date, duration_minutes, counted_minutes, over_limit_minutes, description, source, started_at, ended_at, task:tasks!time_entries_task_id_fkey(title, project:projects!tasks_project_id_fkey(name))",
        )
        .eq("month", month)
        .order("id");
      if (userId) query = query.eq("user_id", userId);
      return query.range(from, to);
    }, "Report export failed"),
    fetchAllRows((from, to) => {
      let query = supabase
        .from("report_lines")
        .select("user_id, task_id, rate_id, hourly_rate, currency, amount")
        .eq("month", month)
        .order("user_id")
        .order("task_id")
        .order("rate_id", { nullsFirst: true });
      if (userId) query = query.eq("user_id", userId);
      return query.range(from, to);
    }, "Report export failed"),
  ]);

  const userIds = [...new Set(entries.map((entry) => entry.user_id))];
  const [profiles, rates] = await Promise.all([
    userIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("profiles").select("id, full_name").in("id", userIds),
    userIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("rates").select("id, user_id, effective_from").in("user_id", userIds),
  ]);
  if (profiles.error) throw new Error(`Report export failed: ${profiles.error.message}`);
  if (rates.error) throw new Error(`Report export failed: ${rates.error.message}`);

  const names = new Map((profiles.data ?? []).map((person) => [person.id, person.full_name]));
  const spans: RateSpan[] = (rates.data ?? []).map((rate) => ({
    id: rate.id,
    userId: rate.user_id,
    effectiveFrom: rate.effective_from,
  }));
  const csvEntries: CsvEntry[] = entries.map((entry) => {
    const task = embedded(entry.task);
    const project = task ? embedded(task.project) : null;
    const timed = entry.source === "timer" && entry.started_at && entry.ended_at;
    return {
      id: entry.id,
      userId: entry.user_id,
      freelancer: names.get(entry.user_id) ?? "Unknown",
      project: project?.name ?? "",
      task: task?.title ?? "",
      taskId: entry.task_id,
      workDate: entry.work_date,
      startTime: timed ? localParts(new Date(entry.started_at!), settings.timeZone).time : "",
      endTime: timed ? localParts(new Date(entry.ended_at!), settings.timeZone).time : "",
      source: entry.source === "timer" ? "timer" : "manual",
      description: entry.description,
      durationMinutes: entry.duration_minutes,
      countedMinutes: entry.counted_minutes,
      overLimitMinutes: entry.over_limit_minutes,
      rateId: rateCovering(spans, entry.user_id, entry.work_date),
    };
  });

  return {
    filename: csvFilename(month),
    body: buildReportCsv(month.slice(0, 7), csvEntries, lines.map(toCsvLine)),
  };
}

function toCsvLine(line: {
  user_id: string | null;
  task_id: string | null;
  rate_id: string | null;
  hourly_rate: number | null;
  currency: string | null;
  amount: number | null;
}): CsvLine {
  const currency = asCurrency(line.currency);
  return {
    userId: line.user_id ?? "",
    taskId: line.task_id ?? "",
    rateId: line.rate_id,
    amountCents: toCents(line.amount ?? 0),
    hourlyRateCents: currency && line.hourly_rate != null ? toCents(line.hourly_rate) : null,
    currency,
  };
}

function asCurrency(value: string | null): Currency | null {
  if (value === "EUR" || value === "USD") return value;
  return null;
}

function peopleIn(lines: readonly LineRow[], names: Map<string, string>): ReportPerson[] {
  const ids = [...new Set(lines.flatMap((line) => (line.user_id ? [line.user_id] : [])))];
  return ids
    .map((id) => ({ id, fullName: names.get(id) ?? "Unknown" }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id));
}

function sectionsFor(lines: readonly LineRow[], names: Map<string, string>): ReportSection[] {
  const byUser = new Map<string, LineRow[]>();
  for (const line of lines) {
    if (!line.user_id) continue;
    const group = byUser.get(line.user_id);
    if (group) group.push(line);
    else byUser.set(line.user_id, [line]);
  }

  return [...byUser.entries()]
    .map(([userId, userLines]) => {
      const figures = monthFigures(userLines);
      const rows = userLines
        .filter((line) => line.task_id && line.task_title)
        .map((line) => {
          const currency = asCurrency(line.currency);
          return {
            taskId: line.task_id ?? "",
            rateId: line.rate_id,
            projectName: line.project_name ?? "",
            taskTitle: line.task_title ?? "",
            countedMinutes: line.counted_minutes ?? 0,
            overLimitMinutes: line.over_limit_minutes ?? 0,
            hourlyRateCents: currency && line.hourly_rate != null ? toCents(line.hourly_rate) : null,
            currency,
            amountCents: currency ? toCents(line.amount ?? 0) : 0,
          };
        })
        .sort(
          (a, b) =>
            a.projectName.localeCompare(b.projectName) ||
            a.taskTitle.localeCompare(b.taskTitle) ||
            (a.currency ?? "").localeCompare(b.currency ?? "") ||
            (a.hourlyRateCents ?? 0) - (b.hourlyRateCents ?? 0),
        );
      return {
        userId,
        fullName: names.get(userId) ?? "Unknown",
        rows,
        countedMinutes: userLines.reduce((sum, line) => sum + (line.counted_minutes ?? 0), 0),
        overLimitMinutes: userLines.reduce((sum, line) => sum + (line.over_limit_minutes ?? 0), 0),
        amounts: figures.amounts,
        missingRate: figures.missingRate,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName) || a.userId.localeCompare(b.userId));
}

function embedded<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
