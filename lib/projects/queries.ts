import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { TaskStatus } from "@/components/status-badge";
import type { Viewer } from "@/lib/auth/queries";
import { monthStartInZone } from "@/lib/dates";
import {
  countByStatus,
  isTaskStatus,
  type MonthFigures,
  monthFigures,
  projectSummary,
  type ProjectSummary,
  type StatusCount,
} from "@/lib/projects/figures";
import type { ProjectStatus } from "@/lib/projects/schemas";
import { getOrganizationSettings } from "@/lib/settings/queries";

const FINAL_STATUSES: ReadonlySet<string> = new Set(["accepted", "rejected", "cancelled"]);

export type ProjectView = "current" | "archived";

export type ProjectListRow = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  taskCounts: StatusCount[];
  month: MonthFigures;
};

export type ProjectTask = {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  limitMinutes: number | null;
  countedMinutes: number;
  overLimitMinutes: number;
};

export type ProjectMember = {
  userId: string;
  fullName: string;
  email: string;
  status: "active" | "deactivated";
  openTaskCount: number;
};

export type MemberCandidate = { userId: string; fullName: string };

export type ProjectDetail = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  tasks: ProjectTask[];
  summary: ProjectSummary;
  /** Admins only; freelancers never see who else works on a project (PRD §6.3). */
  members: ProjectMember[] | null;
  candidates: MemberCandidate[] | null;
};

type ProfileEmbed = { full_name: string; email?: string; status?: string } | null;

function embeddedProfile(value: unknown): ProfileEmbed {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as ProfileEmbed;
}

function asProjectStatus(value: string): ProjectStatus {
  return value === "on_hold" || value === "archived" ? value : "active";
}

export async function listProjects(
  viewer: Viewer,
  view: ProjectView,
): Promise<{ rows: ProjectListRow[]; monthStart: string }> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const monthStart = monthStartInZone(settings.timeZone);
  const isAdmin = viewer.role === "admin";

  let projectQuery = supabase.from("projects").select("id, name, description, status").order("name");
  projectQuery = view === "archived" ? projectQuery.eq("status", "archived") : projectQuery.neq("status", "archived");
  const projects = await projectQuery;
  if (projects.error) throw new Error(`Project list failed: ${projects.error.message}`);

  const ids = (projects.data ?? []).map((project) => project.id);
  if (ids.length === 0) return { rows: [], monthStart };

  let taskQuery = supabase.from("tasks").select("project_id, status").in("project_id", ids);
  let lineQuery = supabase
    .from("report_lines")
    .select("project_id, counted_minutes, over_limit_minutes, amount, currency")
    .eq("month", monthStart)
    .in("project_id", ids);
  if (!isAdmin) {
    taskQuery = taskQuery.eq("assignee_id", viewer.id);
    lineQuery = lineQuery.eq("user_id", viewer.id);
  }

  const [tasks, lines] = await Promise.all([taskQuery, lineQuery]);
  for (const result of [tasks, lines]) {
    if (result.error) throw new Error(`Project list failed: ${result.error.message}`);
  }

  const tasksByProject = groupBy(tasks.data ?? [], (task) => task.project_id);
  const linesByProject = groupBy(lines.data ?? [], (line) => line.project_id ?? "");

  return {
    monthStart,
    rows: (projects.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: asProjectStatus(project.status),
      taskCounts: countByStatus(tasksByProject.get(project.id) ?? []),
      month: monthFigures(linesByProject.get(project.id) ?? []),
    })),
  };
}

export const getProject = cache(async (projectId: string, viewer: Viewer): Promise<ProjectDetail | null> => {
  const supabase = createClient(await cookies());
  const isAdmin = viewer.role === "admin";

  const project = await supabase
    .from("projects")
    .select("id, name, description, status")
    .eq("id", projectId)
    .maybeSingle();
  if (project.error) {
    // An id that isn't a uuid can't name a project.
    if (project.error.code === "22P02") return null;
    throw new Error(`Project lookup failed: ${project.error.message}`);
  }
  if (!project.data) return null;

  let taskQuery = supabase
    .from("tasks")
    .select(
      "id, title, status, assignee_id, limit_minutes, counted_minutes, over_limit_minutes, created_at, assignee:profiles!tasks_assignee_id_fkey(full_name)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  let progressQuery = supabase
    .from("task_progress")
    .select("status, limit_minutes, counted_minutes, over_limit_minutes, remaining_minutes")
    .eq("project_id", projectId);
  if (!isAdmin) {
    taskQuery = taskQuery.eq("assignee_id", viewer.id);
    progressQuery = progressQuery.eq("assignee_id", viewer.id);
  }

  const [tasks, progress, members, candidates] = await Promise.all([
    taskQuery,
    progressQuery,
    isAdmin
      ? supabase
          .from("project_members")
          .select("user_id, member:profiles!project_members_user_id_fkey(full_name, email, status)")
          .eq("project_id", projectId)
      : null,
    isAdmin
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "freelancer")
          .eq("status", "active")
          .order("full_name")
      : null,
  ]);
  for (const result of [tasks, progress, members, candidates]) {
    if (result?.error) throw new Error(`Project lookup failed: ${result.error.message}`);
  }

  const projectTasks: ProjectTask[] = (tasks.data ?? []).flatMap((task) => {
    if (!isTaskStatus(task.status)) return [];
    return [
      {
        id: task.id,
        title: task.title,
        status: task.status,
        assigneeId: task.assignee_id,
        assigneeName: isAdmin ? (embeddedProfile(task.assignee)?.full_name ?? null) : null,
        limitMinutes: task.limit_minutes,
        countedMinutes: task.counted_minutes,
        overLimitMinutes: task.over_limit_minutes,
      },
    ];
  });

  let projectMembers: ProjectMember[] | null = null;
  let memberCandidates: MemberCandidate[] | null = null;
  if (isAdmin) {
    const openTasks = new Map<string, number>();
    for (const task of projectTasks) {
      if (!task.assigneeId || FINAL_STATUSES.has(task.status)) continue;
      openTasks.set(task.assigneeId, (openTasks.get(task.assigneeId) ?? 0) + 1);
    }

    projectMembers = (members?.data ?? [])
      .map((member) => {
        const profile = embeddedProfile(member.member);
        return {
          userId: member.user_id,
          fullName: profile?.full_name ?? "Unknown person",
          email: profile?.email ?? "",
          status: profile?.status === "deactivated" ? ("deactivated" as const) : ("active" as const),
          openTaskCount: openTasks.get(member.user_id) ?? 0,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "en"));

    const memberIds = new Set(projectMembers.map((member) => member.userId));
    memberCandidates = (candidates?.data ?? [])
      .filter((person) => !memberIds.has(person.id))
      .map((person) => ({ userId: person.id, fullName: person.full_name }));
  }

  return {
    id: project.data.id,
    name: project.data.name,
    description: project.data.description,
    status: asProjectStatus(project.data.status),
    tasks: projectTasks,
    summary: projectSummary(progress.data ?? []),
    members: projectMembers,
    candidates: memberCandidates,
  };
});

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(key(item)) ?? [];
    list.push(item);
    groups.set(key(item), list);
  }
  return groups;
}
