import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { ExtraHoursStatus, RevisionDecision, TaskStatus } from "@/components/status-badge";
import type { Viewer } from "@/lib/auth/queries";
import { isTaskStatus } from "@/lib/projects/figures";
import type { ProjectStatus } from "@/lib/projects/schemas";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { describeEvent, type HistoryLine } from "@/lib/tasks/history";
import { availableActions, type PermissionTask, type TaskActions } from "@/lib/tasks/permissions";

export type Estimate = { minMinutes: number; maxMinutes: number; note: string | null };

export type EstimateRevision = {
  id: string;
  number: number;
  minMinutes: number;
  maxMinutes: number;
  note: string | null;
  submittedAt: string;
  decision: RevisionDecision;
  decidedAt: string | null;
  deciderName: string | null;
  comment: string | null;
};

export type ExtraHoursRequest = {
  id: string;
  minutes: number;
  reason: string;
  status: ExtraHoursStatus;
  createdAt: string;
  decidedAt: string | null;
  deciderName: string | null;
  decisionReason: string | null;
};

export type TaskTimeEntry = {
  id: string;
  workDate: string;
  durationMinutes: number;
  countedMinutes: number;
  overLimitMinutes: number;
  description: string;
  source: "timer" | "manual";
  autoStoppedReason: string | null;
};

export type TaskComment = {
  id: string;
  authorId: string;
  authorName: string;
  kind: "comment" | "decision";
  body: string;
  createdAt: string;
  editedAt: string | null;
};

export type TaskLink = { id: string; url: string; label: string | null };

export type TaskHistoryEntry = { id: number; occurredAt: string } & HistoryLine;

export type TaskDetail = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  project: { id: string; name: string; status: ProjectStatus };
  assigneeId: string | null;
  /** Admins only; a freelancer only ever sees their own tasks. */
  assigneeName: string | null;
  createdBy: string;
  everSubmitted: boolean;
  /** The working estimate, edited while Draft or Changes requested. */
  estimate: Estimate | null;
  approvedEstimate: Estimate | null;
  limitMinutes: number | null;
  ceilingMinutes: number | null;
  countedMinutes: number;
  overLimitMinutes: number;
  timerRunning: boolean;
  extraHoursPending: boolean;
  revisions: EstimateRevision[];
  extraHours: ExtraHoursRequest[];
  entries: TaskTimeEntry[];
  comments: TaskComment[];
  links: TaskLink[];
  history: TaskHistoryEntry[];
  actions: TaskActions;
  timeZone: string;
};

export type AssigneeOption = { userId: string; fullName: string };

type ProfileEmbed = { full_name: string; status?: string } | null;

function embedded<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}

function asProjectStatus(value: string | null | undefined): ProjectStatus {
  return value === "on_hold" || value === "archived" ? value : "active";
}

function asDecision(value: string): RevisionDecision {
  return value === "approved" || value === "rejected" || value === "changes_requested" || value === "withdrawn"
    ? value
    : "pending";
}

function asExtraHoursStatus(value: string): ExtraHoursStatus {
  return value === "approved" || value === "rejected" || value === "cancelled" ? value : "pending";
}

function estimateOf(min: number | null, max: number | null, note: string | null): Estimate | null {
  return min == null || max == null ? null : { minMinutes: min, maxMinutes: max, note };
}

export const getTask = cache(async (taskId: string, viewer: Viewer): Promise<TaskDetail | null> => {
  const supabase = createClient(await cookies());
  const isAdmin = viewer.role === "admin";

  const task = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, project_id, assignee_id, created_by, ever_submitted, estimate_min_minutes, estimate_max_minutes, estimate_note, approved_revision_id, limit_minutes, counted_minutes, over_limit_minutes, project:projects!tasks_project_id_fkey(id, name, status), assignee:profiles!tasks_assignee_id_fkey(full_name)",
    )
    .eq("id", taskId)
    .maybeSingle();
  if (task.error) {
    // An id that isn't a uuid can't name a task.
    if (task.error.code === "22P02") return null;
    throw new Error(`Task lookup failed: ${task.error.message}`);
  }
  if (!task.data || !isTaskStatus(task.data.status)) return null;

  const [settings, progress, revisions, extraHours, entries, timers, comments, links, events] = await Promise.all([
    getOrganizationSettings(),
    supabase.from("task_progress").select("ceiling_minutes").eq("task_id", taskId).maybeSingle(),
    supabase
      .from("estimate_revisions")
      .select(
        "id, revision_number, min_minutes, max_minutes, note, submitted_at, decision, decided_at, decision_comment, decider:profiles!estimate_revisions_decided_by_fkey(full_name)",
      )
      .eq("task_id", taskId)
      .order("revision_number", { ascending: false }),
    supabase
      .from("extra_hours_requests")
      .select(
        "id, minutes, reason, status, created_at, decided_at, decision_reason, decider:profiles!extra_hours_requests_decided_by_fkey(full_name)",
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase
      .from("time_entries")
      .select(
        "id, work_date, duration_minutes, counted_minutes, over_limit_minutes, description, source, auto_stopped_reason",
      )
      .eq("task_id", taskId)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("timers").select("id").eq("task_id", taskId).is("stopped_at", null),
    supabase
      .from("task_comments")
      .select("id, author_id, kind, body, created_at, edited_at, author:profiles!task_comments_author_id_fkey(full_name)")
      .eq("task_id", taskId)
      .order("created_at"),
    supabase.from("task_links").select("id, url, label").eq("task_id", taskId).order("created_at"),
    supabase
      .from("audit_events")
      .select("id, occurred_at, event_type, actor_id, subject_user_id, data, actor:profiles!audit_events_actor_id_fkey(full_name)")
      .eq("task_id", taskId)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);
  for (const result of [progress, revisions, extraHours, entries, timers, comments, links, events]) {
    if (result.error) throw new Error(`Task lookup failed: ${result.error.message}`);
  }

  const subjectIds = [
    ...new Set((events.data ?? []).flatMap((event) => (event.subject_user_id ? [event.subject_user_id] : []))),
  ];
  const subjects =
    subjectIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", subjectIds) : null;
  if (subjects?.error) throw new Error(`Task lookup failed: ${subjects.error.message}`);
  const subjectNames = new Map((subjects?.data ?? []).map((person) => [person.id, person.full_name]));

  const project = embedded<{ id: string; name: string; status: string }>(task.data.project);
  const revisionRows: EstimateRevision[] = (revisions.data ?? []).map((row) => ({
    id: row.id,
    number: row.revision_number,
    minMinutes: row.min_minutes,
    maxMinutes: row.max_minutes,
    note: row.note,
    submittedAt: row.submitted_at,
    decision: asDecision(row.decision),
    decidedAt: row.decided_at,
    deciderName: embedded<ProfileEmbed>(row.decider)?.full_name ?? null,
    comment: row.decision_comment,
  }));
  const approvedRevisionId = task.data.approved_revision_id;
  const approved = revisionRows.find((revision) => revision.id === approvedRevisionId);
  const extraHourRows: ExtraHoursRequest[] = (extraHours.data ?? []).map((row) => ({
    id: row.id,
    minutes: row.minutes,
    reason: row.reason,
    status: asExtraHoursStatus(row.status),
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    deciderName: embedded<ProfileEmbed>(row.decider)?.full_name ?? null,
    decisionReason: row.decision_reason,
  }));

  const estimate = estimateOf(task.data.estimate_min_minutes, task.data.estimate_max_minutes, task.data.estimate_note);
  const permissionTask: PermissionTask = {
    status: task.data.status,
    assigneeId: task.data.assignee_id,
    createdBy: task.data.created_by,
    everSubmitted: task.data.ever_submitted,
    projectStatus: asProjectStatus(project?.status),
    hasEstimate: estimate != null,
    hasTime: (entries.data ?? []).length > 0,
    timerRunning: (timers.data ?? []).length > 0,
    extraHoursPending: extraHourRows.some((request) => request.status === "pending"),
  };

  return {
    id: task.data.id,
    title: task.data.title,
    description: task.data.description,
    status: task.data.status,
    project: {
      id: task.data.project_id,
      name: project?.name ?? "Project",
      status: permissionTask.projectStatus,
    },
    assigneeId: task.data.assignee_id,
    assigneeName: isAdmin ? (embedded<ProfileEmbed>(task.data.assignee)?.full_name ?? null) : null,
    createdBy: task.data.created_by,
    everSubmitted: task.data.ever_submitted,
    estimate,
    approvedEstimate: approved
      ? { minMinutes: approved.minMinutes, maxMinutes: approved.maxMinutes, note: approved.note }
      : null,
    limitMinutes: task.data.limit_minutes,
    ceilingMinutes: progress.data?.ceiling_minutes ?? null,
    countedMinutes: task.data.counted_minutes,
    overLimitMinutes: task.data.over_limit_minutes,
    timerRunning: permissionTask.timerRunning,
    extraHoursPending: permissionTask.extraHoursPending,
    revisions: revisionRows,
    extraHours: extraHourRows,
    entries: (entries.data ?? []).map((row) => ({
      id: row.id,
      workDate: row.work_date,
      durationMinutes: row.duration_minutes,
      countedMinutes: row.counted_minutes,
      overLimitMinutes: row.over_limit_minutes,
      description: row.description,
      source: row.source === "timer" ? "timer" : "manual",
      autoStoppedReason: row.auto_stopped_reason,
    })),
    comments: (comments.data ?? []).map((row) => ({
      id: row.id,
      authorId: row.author_id,
      authorName: embedded<ProfileEmbed>(row.author)?.full_name ?? "Unknown person",
      kind: row.kind === "decision" ? "decision" : "comment",
      body: row.body,
      createdAt: row.created_at,
      editedAt: row.edited_at,
    })),
    links: (links.data ?? []).map((row) => ({ id: row.id, url: row.url, label: row.label })),
    history: (events.data ?? []).map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      ...describeEvent(
        {
          type: row.event_type,
          actorId: row.actor_id,
          actorName: embedded<ProfileEmbed>(row.actor)?.full_name ?? null,
          subjectId: row.subject_user_id,
          subjectName: row.subject_user_id ? (subjectNames.get(row.subject_user_id) ?? null) : null,
          data: row.data,
        },
        viewer.id,
      ),
    })),
    actions: availableActions(permissionTask, viewer),
    timeZone: settings.timeZone,
  };
});

/** Active members of a project, the people a task can be assigned to (PRD §6.4). */
export async function listAssigneeOptions(projectId: string): Promise<AssigneeOption[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("project_members")
    .select("user_id, member:profiles!project_members_user_id_fkey(full_name, status)")
    .eq("project_id", projectId);
  if (error) throw new Error(`Member lookup failed: ${error.message}`);

  return (data ?? [])
    .flatMap((row) => {
      const profile = embedded<ProfileEmbed>(row.member);
      if (!profile || profile.status !== "active") return [];
      return [{ userId: row.user_id, fullName: profile.full_name }];
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "en"));
}

export type NewTaskContext = {
  project: { id: string; name: string };
  /** Admins only: who the task can be assigned to. */
  assignees: AssigneeOption[] | null;
};

/**
 * Where a task can be created: Admins in any project that isn't archived, freelancers in
 * the projects they are a member of (PRD §6.4). Null when the viewer can't create one here.
 */
export async function getNewTaskContext(projectId: string, viewer: Viewer): Promise<NewTaskContext | null> {
  const supabase = createClient(await cookies());
  const isAdmin = viewer.role === "admin";

  const project = await supabase.from("projects").select("id, name, status").eq("id", projectId).maybeSingle();
  if (project.error) {
    if (project.error.code === "22P02") return null;
    throw new Error(`Project lookup failed: ${project.error.message}`);
  }
  if (!project.data || project.data.status === "archived") return null;

  const [allowed, assignees] = await Promise.all([
    canCreateTaskIn(projectId, viewer),
    isAdmin ? listAssigneeOptions(projectId) : null,
  ]);
  if (!allowed) return null;

  return { project: { id: project.data.id, name: project.data.name }, assignees };
}

/** Whether the viewer can create tasks in a project, for the project page's button. */
export async function canCreateTaskIn(projectId: string, viewer: Viewer): Promise<boolean> {
  if (viewer.role === "admin") return true;
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (error) throw new Error(`Membership lookup failed: ${error.message}`);
  return data != null;
}
