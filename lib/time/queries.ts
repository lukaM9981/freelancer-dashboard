import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Viewer } from "@/lib/auth/queries";
import { formatMonth, isoDateInZone, monthStartInZone, monthStartOf, monthStartsBetween, nextMonthStart } from "@/lib/dates";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { earliestWorkDate, clampMonth, monthIsOpen } from "@/lib/time/bounds";

export type RunningTimer = {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  startedAt: string;
  /** Set while the clock is stopped between screen shares. */
  pausedAt: string | null;
  /** Last time the sharing tab checked in. Null before the first heartbeat on an old row. */
  shareSeenAt: string | null;
  /** Closed segments only, in milliseconds. The open segment is added on the client. */
  accumulatedMs: number;
  /** Start of the open segment. Null while paused. */
  segmentStartedAt: string | null;
  segmentCount: number;
};

type TaskEmbed = { title: string; project_id: string; project: { name: string } | { name: string }[] | null } | null;

function embedded<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}

/** The viewer's own running timer, the source of truth for the timer bar (Tech.md §7.3). */
export const getRunningTimer = cache(async (viewer: Viewer): Promise<RunningTimer | null> => {
  // Only the assignee tracks time, and Admins are never assignees (PRD §4).
  if (viewer.role !== "freelancer") return null;

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("timers")
    .select(
      "id, task_id, started_at, paused_at, share_seen_at, task:tasks!timers_task_id_fkey(title, project_id, project:projects!tasks_project_id_fkey(name))",
    )
    .eq("user_id", viewer.id)
    .is("stopped_at", null)
    .maybeSingle();
  if (error) throw new Error(`Timer lookup failed: ${error.message}`);
  if (!data) return null;

  const { data: segments, error: segmentError } = await supabase
    .from("timer_segments")
    .select("started_at, ended_at")
    .eq("timer_id", data.id);
  if (segmentError) throw new Error(`Timer lookup failed: ${segmentError.message}`);

  const rows = segments ?? [];
  const open = rows.find((segment) => segment.ended_at == null);
  const accumulatedMs = rows.reduce((sum, segment) => {
    if (!segment.ended_at) return sum;
    return sum + Math.max(0, Date.parse(segment.ended_at) - Date.parse(segment.started_at));
  }, 0);

  const task = embedded<NonNullable<TaskEmbed>>(data.task);
  return {
    id: data.id,
    taskId: data.task_id,
    taskTitle: task?.title ?? "Task",
    projectId: task?.project_id ?? "",
    projectName: embedded<{ name: string }>(task?.project)?.name ?? "Project",
    startedAt: data.started_at,
    pausedAt: data.paused_at,
    shareSeenAt: data.share_seen_at,
    accumulatedMs,
    segmentStartedAt: open?.started_at ?? null,
    segmentCount: rows.length,
  };
});

export type TrackableTask = {
  id: string;
  title: string;
  projectName: string;
  /** First work date the date picker allows for this task. */
  dateMin: string;
};

export type MyTimeEntry = {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  workDate: string;
  durationMinutes: number;
  overLimitMinutes: number;
  description: string;
  source: "timer" | "manual";
  autoStoppedReason: string | null;
  startedAt: string | null;
  endedAt: string | null;
  canEdit: boolean;
  canCorrectDescription: boolean;
  /** First work date this entry may move to. */
  dateMin: string;
};

export type MyTimeDay = {
  date: string;
  totalMinutes: number;
  overLimitMinutes: number;
  entries: MyTimeEntry[];
};

export type MyTimeMonth = {
  /** `yyyy-MM-01` of the month on screen. */
  month: string;
  /** `yyyy-MM-01` of the organization's current month. */
  currentMonth: string;
  months: { value: string; label: string }[];
  closed: boolean;
  today: string;
  timeZone: string;
  totalMinutes: number;
  overLimitMinutes: number;
  days: MyTimeDay[];
  trackable: TrackableTask[];
};

type TaskJoin = {
  id: string;
  title: string;
  status: string;
  assignee_id: string | null;
  first_approved_on: string | null;
  project: { id: string; name: string; status: string } | { id: string; name: string; status: string }[] | null;
};

/** The freelancer's timesheet for one month, plus the tasks they can track right now (PRD §6.8). */
export async function getMyTime(viewer: Viewer, requestedMonth: string | undefined): Promise<MyTimeMonth> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const today = isoDateInZone(settings.timeZone);
  const currentMonth = monthStartInZone(settings.timeZone);

  const [closures, earliest, tasks] = await Promise.all([
    supabase.from("month_closures").select("month").order("month", { ascending: false }).limit(1),
    supabase.from("time_entries").select("work_date").eq("user_id", viewer.id).order("work_date").limit(1),
    supabase
      .from("tasks")
      .select(
        "id, title, status, first_approved_on, project:projects!tasks_project_id_fkey(id, name, status)",
      )
      .eq("assignee_id", viewer.id)
      .in("status", ["approved", "in_progress"]),
  ]);
  for (const result of [closures, earliest, tasks]) {
    if (result.error) throw new Error(`Time lookup failed: ${result.error.message}`);
  }

  const latestClosedMonth = closures.data?.[0]?.month ?? null;
  const firstWorkDate = earliest.data?.[0]?.work_date ?? null;
  const earliestMonth = firstWorkDate ? monthStartOf(firstWorkDate) : currentMonth;
  const rangeStart = earliestMonth < currentMonth ? earliestMonth : currentMonth;
  const month = clampMonth(requestedMonth, rangeStart, currentMonth);
  const closed = latestClosedMonth != null && month <= latestClosedMonth;

  const entries = await supabase
    .from("time_entries")
    .select(
      "id, task_id, work_date, duration_minutes, over_limit_minutes, description, source, auto_stopped_reason, started_at, ended_at, created_at, task:tasks!time_entries_task_id_fkey(id, title, status, assignee_id, first_approved_on, project:projects!tasks_project_id_fkey(id, name, status))",
    )
    .eq("user_id", viewer.id)
    .gte("work_date", month)
    .lt("work_date", nextMonthStart(month))
    .order("work_date", { ascending: false })
    .order("created_at");
  if (entries.error) throw new Error(`Time lookup failed: ${entries.error.message}`);

  const rows = (entries.data ?? []).map((row) => {
    const task = embedded<TaskJoin>(row.task);
    const project = embedded<{ name: string; status: string }>(task?.project);
    const acceptsTime =
      task?.assignee_id === viewer.id &&
      (task.status === "approved" || task.status === "in_progress") &&
      project?.status === "active";
    const open = monthIsOpen(row.work_date, latestClosedMonth) && project?.status !== "archived";
    return {
      createdAt: row.created_at,
      entry: {
        id: row.id,
        taskId: row.task_id,
        taskTitle: task?.title ?? "Task",
        projectName: project?.name ?? "Project",
        workDate: row.work_date,
        durationMinutes: row.duration_minutes,
        overLimitMinutes: row.over_limit_minutes,
        description: row.description,
        source: row.source === "timer" ? "timer" : "manual",
        autoStoppedReason: row.auto_stopped_reason,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        canEdit: open && acceptsTime,
        canCorrectDescription: open && !acceptsTime,
        dateMin: task?.first_approved_on
          ? earliestWorkDate(task.first_approved_on, latestClosedMonth)
          : row.work_date,
      } satisfies MyTimeEntry,
    };
  });

  const byDay = new Map<string, typeof rows>();
  for (const row of rows) {
    const day = byDay.get(row.entry.workDate) ?? [];
    day.push(row);
    byDay.set(row.entry.workDate, day);
  }
  const days: MyTimeDay[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, dayRows]) => {
      const ordered = [...dayRows].sort((a, b) => {
        if (a.entry.startedAt && b.entry.startedAt) return a.entry.startedAt < b.entry.startedAt ? -1 : 1;
        if (a.entry.startedAt) return -1;
        if (b.entry.startedAt) return 1;
        return a.createdAt < b.createdAt ? -1 : 1;
      });
      return {
        date,
        totalMinutes: ordered.reduce((sum, row) => sum + row.entry.durationMinutes, 0),
        overLimitMinutes: ordered.reduce((sum, row) => sum + row.entry.overLimitMinutes, 0),
        entries: ordered.map((row) => row.entry),
      };
    });

  const trackable = (tasks.data ?? [])
    .flatMap((row) => {
      const project = embedded<{ name: string; status: string }>(row.project);
      if (!row.first_approved_on || project?.status !== "active") return [];
      const dateMin = earliestWorkDate(row.first_approved_on, latestClosedMonth);
      if (dateMin > today) return [];
      return [{ id: row.id, title: row.title, projectName: project.name, dateMin }];
    })
    .sort((a, b) => a.projectName.localeCompare(b.projectName, "en") || a.title.localeCompare(b.title, "en"));

  return {
    month,
    currentMonth,
    months: monthStartsBetween(rangeStart, currentMonth)
      .map((value) => ({ value, label: formatMonth(value) }))
      .reverse(),
    closed,
    today,
    timeZone: settings.timeZone,
    totalMinutes: days.reduce((sum, day) => sum + day.totalMinutes, 0),
    overLimitMinutes: days.reduce((sum, day) => sum + day.overLimitMinutes, 0),
    days,
    trackable,
  };
}
