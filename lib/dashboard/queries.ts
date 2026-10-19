import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { RevisionDecision, TaskStatus } from "@/components/status-badge";
import type { Viewer } from "@/lib/auth/queries";
import { signAvatarPaths } from "@/lib/avatars";
import { ACTIVITY_EVENT_TYPES, activityFeed, type ActivityItem } from "@/lib/dashboard/activity";
import { timeByFreelancer, timeByProject, type DashboardLine, type TimeBreakdown } from "@/lib/dashboard/figures";
import { fetchAllRows } from "@/lib/db/all-rows";
import { formatMonth, isoDateInZone, monthStartInZone } from "@/lib/dates";
import type { Currency, Money } from "@/lib/money";
import { monthFigures } from "@/lib/projects/figures";
import { listApprovalQueue } from "@/lib/proposals/queries";
import { reportPath } from "@/lib/reports/paths";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { earliestWorkDate } from "@/lib/time/bounds";

type Supabase = ReturnType<typeof createClient>;

const ACTIVITY_SHOWN = 25;
/** Enough rows to fill the feed after decisions from one action are joined. */
const ACTIVITY_FETCHED = 200;
const ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PROPOSALS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function embedded<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}

function failed(label: string, result: { error: { message: string } | null } | null | undefined) {
  if (result?.error) throw new Error(`${label}: ${result.error.message}`);
}

type MonthTotals = {
  countedMinutes: number;
  overLimitMinutes: number;
  amounts: Money[];
  missingRate: boolean;
};

function monthTotals(lines: readonly DashboardLine[]): MonthTotals {
  const figures = monthFigures(lines);
  return {
    countedMinutes: lines.reduce((sum, line) => sum + (line.counted_minutes ?? 0), 0),
    overLimitMinutes: lines.reduce((sum, line) => sum + (line.over_limit_minutes ?? 0), 0),
    amounts: figures.amounts,
    missingRate: figures.missingRate,
  };
}

function monthLines(supabase: Supabase, month: string, userId: string | null) {
  return fetchAllRows<DashboardLine>((from, to) => {
    let query = supabase
      .from("report_lines")
      .select("user_id, project_id, project_name, counted_minutes, over_limit_minutes, amount, currency")
      .eq("month", month)
      .order("user_id")
      .order("task_id")
      .order("rate_id", { nullsFirst: true });
    if (userId) query = query.eq("user_id", userId);
    return query.range(from, to);
  }, "Dashboard failed");
}

// ---------------------------------------------------------------------------
// Admin (PRD §6.11)
// ---------------------------------------------------------------------------

export type AdminDashboard = {
  timeZone: string;
  monthLabel: string;
  defaultCurrency: Currency;
  /** Proposal items, extra-hours requests, and Done tasks (PRD §6.11). The list is Approvals. */
  waitingTotal: number;
  /** Running timers, counted when the page loads (PRD §6.11). */
  trackingNow: number;
  month: MonthTotals & { freelancers: TimeBreakdown[]; projects: TimeBreakdown[] };
  activity: ActivityItem[];
};

export async function getAdminDashboard(viewer: Viewer): Promise<AdminDashboard> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const month = monthStartInZone(settings.timeZone);
  const now = new Date();
  const activitySince = new Date(now.getTime() - ACTIVITY_WINDOW_MS).toISOString();

  const [queue, timers, lines, events] = await Promise.all([
    listApprovalQueue(),
    supabase.from("timers").select("id", { count: "exact", head: true }).is("stopped_at", null),
    monthLines(supabase, month, null),
    supabase
      .from("audit_events")
      .select("id, occurred_at, txid, event_type, actor_id, subject_user_id, task_id, project_id, data, actor:profiles!audit_events_actor_id_fkey(full_name)")
      .in("event_type", [...ACTIVITY_EVENT_TYPES])
      .gte("occurred_at", activitySince)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(ACTIVITY_FETCHED),
  ]);
  failed("Dashboard failed", timers);
  failed("Dashboard failed", events);

  const eventRows = events.data ?? [];
  const personIds = [
    ...new Set([
      ...lines.flatMap((line) => (line.user_id ? [line.user_id] : [])),
      ...eventRows.flatMap((row) => (row.subject_user_id ? [row.subject_user_id] : [])),
    ]),
  ];
  const eventTaskIds = [...new Set(eventRows.flatMap((row) => (row.task_id ? [row.task_id] : [])))];
  const eventProjectIds = [...new Set(eventRows.flatMap((row) => (row.project_id ? [row.project_id] : [])))];
  const [people, eventTasks, eventProjects] = await Promise.all([
    personIds.length > 0 ? supabase.from("profiles").select("id, full_name, avatar_path").in("id", personIds) : null,
    eventTaskIds.length > 0 ? supabase.from("tasks").select("id, title").in("id", eventTaskIds) : null,
    eventProjectIds.length > 0 ? supabase.from("projects").select("id, name").in("id", eventProjectIds) : null,
  ]);
  for (const result of [people, eventTasks, eventProjects]) failed("Dashboard failed", result);

  const peopleRows = people?.data ?? [];
  const names = new Map(peopleRows.map((row) => [row.id, row.full_name]));
  const avatarPaths = new Map(peopleRows.map((row) => [row.id, row.avatar_path]));
  const avatarUrls = await signAvatarPaths(
    supabase,
    peopleRows.map((row) => row.avatar_path),
  );
  const taskTitles = new Map((eventTasks?.data ?? []).map((row) => [row.id, row.title]));
  const projectNames = new Map((eventProjects?.data ?? []).map((row) => [row.id, row.name]));

  return {
    timeZone: settings.timeZone,
    monthLabel: formatMonth(month),
    defaultCurrency: settings.defaultCurrency,
    waitingTotal: queue.items.length,
    trackingNow: timers.count ?? 0,
    month: {
      ...monthTotals(lines),
      freelancers: timeByFreelancer(lines, names).map((row) => ({
        ...row,
        avatarUrl: avatarUrls.get(avatarPaths.get(row.id) ?? "") ?? null,
      })),
      projects: timeByProject(lines),
    },
    activity: activityFeed(
      eventRows.map((row) => ({
        id: row.id,
        occurredAt: row.occurred_at,
        txid: row.txid,
        type: row.event_type,
        actorId: row.actor_id,
        actorName: embedded<{ full_name: string }>(row.actor)?.full_name ?? null,
        subjectId: row.subject_user_id,
        subjectName: row.subject_user_id ? (names.get(row.subject_user_id) ?? null) : null,
        taskId: row.task_id,
        taskTitle: row.task_id ? (taskTitles.get(row.task_id) ?? null) : null,
        projectName: row.project_id ? (projectNames.get(row.project_id) ?? null) : null,
        data: row.data,
      })),
      viewer.id,
      ACTIVITY_SHOWN,
    ),
  };
}

// ---------------------------------------------------------------------------
// Freelancer (PRD §6.11). RLS limits every read to the viewer's own rows.
// ---------------------------------------------------------------------------

export type EstimateTask = {
  id: string;
  title: string;
  projectName: string;
  status: Extract<TaskStatus, "draft" | "changes_requested">;
  estimate: { minMinutes: number; maxMinutes: number } | null;
};

export type ActiveTask = {
  id: string;
  title: string;
  projectName: string;
  status: Extract<TaskStatus, "approved" | "in_progress">;
  limitMinutes: number;
  ceilingMinutes: number;
  countedMinutes: number;
  remainingMinutes: number;
  extraHoursPending: boolean;
  /** The timer can start on it today (PRD §6.8). */
  trackable: boolean;
};

export type MyProposalItem = {
  revisionId: string;
  proposalId: string;
  taskTitle: string;
  projectName: string;
  minMinutes: number;
  maxMinutes: number;
  decision: Exclude<RevisionDecision, "withdrawn">;
  /** When it was submitted, or decided once it has been. */
  at: string;
};

export type FreelancerDashboard = {
  timeZone: string;
  monthLabel: string;
  reportHref: string;
  defaultCurrency: Currency;
  month: MonthTotals;
  waitingForEstimate: EstimateTask[];
  activeTasks: ActiveTask[];
  proposals: MyProposalItem[];
};

export async function getFreelancerDashboard(viewer: Viewer): Promise<FreelancerDashboard> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const month = monthStartInZone(settings.timeZone);
  const today = isoDateInZone(settings.timeZone);
  const decidedSince = new Date(Date.now() - PROPOSALS_WINDOW_MS).toISOString();

  const [lines, drafts, progress, closures, revisions] = await Promise.all([
    monthLines(supabase, month, viewer.id),
    supabase
      .from("tasks")
      .select("id, title, status, estimate_min_minutes, estimate_max_minutes, project:projects!tasks_project_id_fkey(name)")
      .eq("assignee_id", viewer.id)
      .in("status", ["draft", "changes_requested"])
      .order("status_changed_at"),
    supabase
      .from("task_progress")
      .select("task_id, status, limit_minutes, ceiling_minutes, counted_minutes, remaining_minutes")
      .eq("assignee_id", viewer.id)
      .in("status", ["approved", "in_progress"]),
    supabase.from("month_closures").select("month").order("month", { ascending: false }).limit(1),
    supabase
      .from("estimate_revisions")
      .select(
        "id, proposal_id, min_minutes, max_minutes, decision, submitted_at, decided_at, task:tasks!estimate_revisions_task_id_fkey(title, project:projects!tasks_project_id_fkey(name))",
      )
      .eq("submitted_by", viewer.id)
      .or(`decision.eq.pending,decided_at.gte."${decidedSince}"`)
      .neq("decision", "withdrawn"),
  ]);
  for (const result of [drafts, progress, closures, revisions]) failed("Dashboard failed", result);

  const progressRows = progress.data ?? [];
  const activeIds = progressRows.flatMap((row) => (row.task_id ? [row.task_id] : []));
  const [activeTasks, openRequests] = await Promise.all([
    activeIds.length > 0
      ? supabase
          .from("tasks")
          .select("id, title, first_approved_on, project:projects!tasks_project_id_fkey(name, status)")
          .in("id", activeIds)
      : null,
    activeIds.length > 0
      ? supabase.from("extra_hours_requests").select("task_id").in("task_id", activeIds).eq("status", "pending")
      : null,
  ]);
  failed("Dashboard failed", activeTasks);
  failed("Dashboard failed", openRequests);

  const latestClosedMonth = closures.data?.[0]?.month ?? null;
  const taskInfo = new Map((activeTasks?.data ?? []).map((row) => [row.id, row]));
  const pendingRequests = new Set((openRequests?.data ?? []).map((row) => row.task_id));

  return {
    timeZone: settings.timeZone,
    monthLabel: formatMonth(month),
    reportHref: reportPath(month, month, null),
    defaultCurrency: settings.defaultCurrency,
    month: monthTotals(lines),
    waitingForEstimate: (drafts.data ?? []).flatMap((row): EstimateTask[] => {
      if (row.status !== "draft" && row.status !== "changes_requested") return [];
      const { estimate_min_minutes: min, estimate_max_minutes: max } = row;
      return [
        {
          id: row.id,
          title: row.title,
          projectName: embedded<{ name: string }>(row.project)?.name ?? "Project",
          status: row.status,
          estimate: min == null || max == null ? null : { minMinutes: min, maxMinutes: max },
        },
      ];
    }),
    activeTasks: progressRows
      .flatMap((row): ActiveTask[] => {
        const info = row.task_id ? taskInfo.get(row.task_id) : undefined;
        if (!info || (row.status !== "approved" && row.status !== "in_progress")) return [];
        const project = embedded<{ name: string; status: string }>(info.project);
        const trackable =
          project?.status === "active" &&
          info.first_approved_on != null &&
          earliestWorkDate(info.first_approved_on, latestClosedMonth) <= today;
        const limitMinutes = row.limit_minutes ?? 0;
        return [
          {
            id: info.id,
            title: info.title,
            projectName: project?.name ?? "Project",
            status: row.status,
            limitMinutes,
            ceilingMinutes: row.ceiling_minutes ?? limitMinutes,
            countedMinutes: row.counted_minutes ?? 0,
            remainingMinutes: row.remaining_minutes ?? 0,
            extraHoursPending: pendingRequests.has(info.id),
            trackable,
          },
        ];
      })
      .sort(
        (a, b) =>
          compareUsedShare(b, a) ||
          a.projectName.localeCompare(b.projectName, "en") ||
          a.title.localeCompare(b.title, "en"),
      ),
    proposals: (revisions.data ?? [])
      .flatMap((row): MyProposalItem[] => {
        const decision = row.decision;
        if (decision !== "pending" && decision !== "approved" && decision !== "rejected" && decision !== "changes_requested") {
          return [];
        }
        const task = embedded<{ title: string; project: unknown }>(row.task);
        return [
          {
            revisionId: row.id,
            proposalId: row.proposal_id,
            taskTitle: task?.title ?? "Task",
            projectName: embedded<{ name: string }>(task?.project)?.name ?? "Project",
            minMinutes: row.min_minutes,
            maxMinutes: row.max_minutes,
            decision,
            at: decision === "pending" ? row.submitted_at : (row.decided_at ?? row.submitted_at),
          },
        ];
      })
      .sort((a, b) => {
        const pendingFirst = Number(b.decision === "pending") - Number(a.decision === "pending");
        return pendingFirst || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
      }),
  };
}

/** Compares counted time as a share of the limit, in whole minutes. */
function compareUsedShare(a: ActiveTask, b: ActiveTask): number {
  return a.countedMinutes * Math.max(b.limitMinutes, 1) - b.countedMinutes * Math.max(a.limitMinutes, 1);
}
