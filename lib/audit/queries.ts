import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Viewer } from "@/lib/auth/queries";
import { describeAuditEvent, type AuditEntry } from "@/lib/audit/describe";
import { eventTypesFor } from "@/lib/audit/events";
import { type AuditFilters, rangeIsInverted } from "@/lib/audit/filters";
import { addCalendarDays, dayStartInZone } from "@/lib/dates";

export type FilterOption = { id: string; name: string };

export type AuditPage = {
  entries: AuditEntry[];
  hasMore: boolean;
  people: FilterOption[];
  projects: FilterOption[];
};

const INVITATION_EVENTS = new Set(["person.invited", "invitation.resent", "invitation.revoked"]);

/**
 * The Admin audit log, newest first (PRD §6.13). Reads `audit_log`, whose RLS is that of
 * `audit_events`; callers must have checked `requireAdmin()`.
 */
export async function listAuditEntries(
  viewer: Viewer,
  filters: AuditFilters,
  options: { limit: number; timeZone: string },
): Promise<AuditPage> {
  const supabase = createClient(await cookies());
  const [people, projects] = await Promise.all([
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("projects").select("id, name").order("name"),
  ]);
  if (people.error) throw new Error(`Audit log failed: ${people.error.message}`);
  if (projects.error) throw new Error(`Audit log failed: ${projects.error.message}`);
  const peopleOptions = (people.data ?? []).map((person) => ({ id: person.id, name: person.full_name }));
  const projectOptions = (projects.data ?? []).map((project) => ({ id: project.id, name: project.name }));

  if (rangeIsInverted(filters)) {
    return { entries: [], hasMore: false, people: peopleOptions, projects: projectOptions };
  }

  let query = supabase
    .from("audit_log")
    .select("id, occurred_at, event_type, actor_id, subject_user_id, project_id, task_id, entity_id, data")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit + 1);
  if (filters.person) query = query.or(`actor_id.eq.${filters.person},subject_user_id.eq.${filters.person}`);
  if (filters.project) query = query.eq("project_id", filters.project);
  const types = filters.type ? eventTypesFor(filters.type) : null;
  if (types) query = types.length === 1 ? query.eq("event_type", types[0]) : query.in("event_type", types);
  if (filters.from) query = query.gte("occurred_at", dayStartInZone(filters.from, options.timeZone));
  if (filters.to) query = query.lt("occurred_at", dayStartInZone(addCalendarDays(filters.to, 1), options.timeZone));

  const { data, error } = await query;
  if (error) throw new Error(`Audit log failed: ${error.message}`);
  const fetched = data ?? [];
  const page = fetched.slice(0, options.limit);

  const taskIdOf = (row: (typeof page)[number]) =>
    row.task_id ?? (row.event_type === "task.unassigned" ? row.entity_id : null);
  const taskIds = unique(page.map(taskIdOf));
  const invitationIds = unique(
    page.map((row) => (row.event_type && INVITATION_EVENTS.has(row.event_type) ? row.entity_id : null)),
  );
  const [tasks, invitations] = await Promise.all([
    taskIds.length > 0
      ? supabase.from("tasks").select("id, title").in("id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    invitationIds.length > 0
      ? supabase.from("invitations").select("id, full_name, email").in("id", invitationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (tasks.error) throw new Error(`Audit log failed: ${tasks.error.message}`);
  if (invitations.error) throw new Error(`Audit log failed: ${invitations.error.message}`);

  const names = new Map(peopleOptions.map((person) => [person.id, person.name]));
  const projectNames = new Map(projectOptions.map((project) => [project.id, project.name]));
  const taskTitles = new Map((tasks.data ?? []).map((task) => [task.id, task.title]));
  const invitees = new Map(
    (invitations.data ?? []).map((invitation) => [invitation.id, invitation.full_name || invitation.email]),
  );

  const entries = page.map((row) => {
    const taskId = taskIdOf(row);
    const taskTitle = taskId ? taskTitles.get(taskId) : undefined;
    const projectName = row.project_id ? projectNames.get(row.project_id) : undefined;
    return describeAuditEvent(
      {
        id: row.id ?? 0,
        occurredAt: row.occurred_at ?? "",
        type: row.event_type ?? "",
        actorId: row.actor_id,
        actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
        subjectId: row.subject_user_id,
        subjectName: row.subject_user_id ? (names.get(row.subject_user_id) ?? null) : null,
        task: taskId && taskTitle != null ? { id: taskId, title: taskTitle } : null,
        project: row.project_id && projectName != null ? { id: row.project_id, name: projectName } : null,
        entityId: row.entity_id,
        inviteeName: row.entity_id ? (invitees.get(row.entity_id) ?? null) : null,
        data: row.data,
      },
      viewer.id,
      options.timeZone,
    );
  });

  return { entries, hasMore: fetched.length > options.limit, people: peopleOptions, projects: projectOptions };
}

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value != null))];
}
