import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { RevisionDecision, TaskStatus } from "@/components/status-badge";
import type { Viewer } from "@/lib/auth/queries";
import { isoDateInZone } from "@/lib/dates";
import { currentRate, type DisplayRate, toDisplayRate } from "@/lib/people/rates";
import { isTaskStatus } from "@/lib/projects/figures";
import { type CostRange, costRange, type EstimateRange, sumEstimates } from "@/lib/proposals/figures";
import { getOrganizationSettings } from "@/lib/settings/queries";

type Supabase = ReturnType<typeof createClient>;

function embedded<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}

function asDecision(value: string): RevisionDecision {
  return value === "approved" || value === "rejected" || value === "changes_requested" || value === "withdrawn"
    ? value
    : "pending";
}

/** Each person's rate in effect today, in the organization's time zone. */
async function currentRates(supabase: Supabase, userIds: string[], timeZone: string) {
  const rates = new Map<string, DisplayRate>();
  if (userIds.length === 0) return rates;
  const { data, error } = await supabase
    .from("rates")
    .select("id, user_id, hourly_rate, currency, effective_from")
    .in("user_id", userIds);
  if (error) throw new Error(`Rate lookup failed: ${error.message}`);

  const today = isoDateInZone(timeZone);
  const byUser = new Map<string, DisplayRate[]>();
  for (const row of data ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(
      toDisplayRate({ id: row.id, hourlyRate: row.hourly_rate, currency: row.currency, effectiveFrom: row.effective_from }),
    );
    byUser.set(row.user_id, list);
  }
  for (const [userId, list] of byUser) {
    const rate = currentRate(list, today);
    if (rate) rates.set(userId, rate);
  }
  return rates;
}

// ---------------------------------------------------------------------------
// Approvals inbox (PRD §6.5)
// ---------------------------------------------------------------------------

type QueueBase = {
  id: string;
  projectName: string;
  personName: string;
  waitingSince: string;
};

export type QueueItem =
  | (QueueBase & { kind: "proposal"; itemCount: number; range: EstimateRange; cost: CostRange | null })
  | (QueueBase & { kind: "extra_hours"; taskId: string; taskTitle: string; minutes: number })
  | (QueueBase & { kind: "done_task"; taskId: string; taskTitle: string });

/** Everything waiting for an Admin, oldest first. RLS returns nothing to freelancers. */
export async function listApprovalQueue(): Promise<{ items: QueueItem[]; timeZone: string }> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const queue = await supabase
    .from("approval_queue")
    .select("kind, item_id, project_id, task_id, requested_by, waiting_since, item_count, min_minutes, max_minutes")
    .order("waiting_since", { ascending: true });
  if (queue.error) throw new Error(`Approvals lookup failed: ${queue.error.message}`);
  const rows = queue.data ?? [];

  const ids = (pick: (row: (typeof rows)[number]) => string | null) => [
    ...new Set(rows.flatMap((row) => (pick(row) ? [pick(row) as string] : []))),
  ];
  const personIds = ids((row) => row.requested_by);
  const projectIds = ids((row) => row.project_id);
  const taskIds = ids((row) => row.task_id);
  const proposerIds = ids((row) => (row.kind === "proposal" ? row.requested_by : null));

  const [people, projects, tasks, rates] = await Promise.all([
    personIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", personIds) : null,
    projectIds.length > 0 ? supabase.from("projects").select("id, name").in("id", projectIds) : null,
    taskIds.length > 0 ? supabase.from("tasks").select("id, title").in("id", taskIds) : null,
    currentRates(supabase, proposerIds, settings.timeZone),
  ]);
  for (const result of [people, projects, tasks]) {
    if (result?.error) throw new Error(`Approvals lookup failed: ${result.error.message}`);
  }
  const personNames = new Map((people?.data ?? []).map((row) => [row.id, row.full_name]));
  const projectNames = new Map((projects?.data ?? []).map((row) => [row.id, row.name]));
  const taskTitles = new Map((tasks?.data ?? []).map((row) => [row.id, row.title]));

  const items = rows.flatMap((row): QueueItem[] => {
    if (!row.item_id || !row.waiting_since) return [];
    const base: QueueBase = {
      id: row.item_id,
      projectName: (row.project_id && projectNames.get(row.project_id)) || "Project",
      personName: (row.requested_by && personNames.get(row.requested_by)) || "Unknown person",
      waitingSince: row.waiting_since,
    };
    const taskId = row.task_id ?? "";
    const taskTitle = taskTitles.get(taskId) ?? "Task";
    if (row.kind === "proposal") {
      const range = { minMinutes: row.min_minutes ?? 0, maxMinutes: row.max_minutes ?? 0 };
      const rate = row.requested_by ? (rates.get(row.requested_by) ?? null) : null;
      return [{ ...base, kind: "proposal", itemCount: row.item_count ?? 0, range, cost: costRange(range, rate) }];
    }
    if (row.kind === "extra_hours") {
      return [{ ...base, kind: "extra_hours", taskId, taskTitle, minutes: row.max_minutes ?? 0 }];
    }
    if (row.kind === "done_task") return [{ ...base, kind: "done_task", taskId, taskTitle }];
    return [];
  });

  return { items, timeZone: settings.timeZone };
}

/** The sidebar badge: one per inbox entry. */
export async function countApprovalQueue(): Promise<number> {
  const supabase = createClient(await cookies());
  const { count, error } = await supabase.from("approval_queue").select("item_id", { count: "exact", head: true });
  if (error) {
    console.error("Approvals count failed", error);
    return 0;
  }
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Proposal detail (PRD §5.3, §6.5)
// ---------------------------------------------------------------------------

export type ProposalItem = {
  revisionId: string;
  revisionNumber: number;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  minMinutes: number;
  maxMinutes: number;
  note: string | null;
  decision: RevisionDecision;
  decidedAt: string | null;
  deciderName: string | null;
  comment: string | null;
  canDecide: boolean;
  canWithdraw: boolean;
};

export type ProposalDetail = {
  id: string;
  project: { id: string; name: string };
  submittedBy: string;
  /** Admins only; a freelancer only ever sees their own proposals. */
  submitterName: string | null;
  submittedAt: string;
  completedAt: string | null;
  items: ProposalItem[];
  /** Every item except withdrawn ones. */
  totals: EstimateRange;
  cost: CostRange | null;
  rate: DisplayRate | null;
  pendingCount: number;
  canApproveAll: boolean;
  timeZone: string;
};

export const getProposal = cache(async (proposalId: string, viewer: Viewer): Promise<ProposalDetail | null> => {
  const supabase = createClient(await cookies());
  const isAdmin = viewer.role === "admin";

  const proposal = await supabase
    .from("proposals")
    .select(
      "id, project_id, submitted_by, submitted_at, completed_at, project:projects!proposals_project_id_fkey(id, name), submitter:profiles!proposals_submitted_by_fkey(full_name)",
    )
    .eq("id", proposalId)
    .maybeSingle();
  if (proposal.error) {
    // An id that isn't a uuid can't name a proposal.
    if (proposal.error.code === "22P02") return null;
    throw new Error(`Proposal lookup failed: ${proposal.error.message}`);
  }
  if (!proposal.data) return null;

  const settings = await getOrganizationSettings();
  const [revisions, rates] = await Promise.all([
    supabase
      .from("estimate_revisions")
      .select(
        "id, revision_number, task_id, min_minutes, max_minutes, note, decision, decided_at, decision_comment, task:tasks!estimate_revisions_task_id_fkey(title, description), decider:profiles!estimate_revisions_decided_by_fkey(full_name)",
      )
      .eq("proposal_id", proposalId),
    currentRates(supabase, [proposal.data.submitted_by], settings.timeZone),
  ]);
  if (revisions.error) throw new Error(`Proposal lookup failed: ${revisions.error.message}`);

  const submittedBy = proposal.data.submitted_by;
  const isSubmitter = submittedBy === viewer.id;
  const canDecide = isAdmin && !isSubmitter;

  const items: ProposalItem[] = (revisions.data ?? [])
    .map((row) => {
      const task = embedded<{ title: string; description: string }>(row.task);
      const decision = asDecision(row.decision);
      return {
        revisionId: row.id,
        revisionNumber: row.revision_number,
        taskId: row.task_id,
        taskTitle: task?.title ?? "Task",
        taskDescription: task?.description ?? "",
        minMinutes: row.min_minutes,
        maxMinutes: row.max_minutes,
        note: row.note,
        decision,
        decidedAt: row.decided_at,
        deciderName: isAdmin ? (embedded<{ full_name: string }>(row.decider)?.full_name ?? null) : null,
        comment: row.decision_comment,
        canDecide: canDecide && decision === "pending",
        canWithdraw: isSubmitter && decision === "pending",
      };
    })
    .sort((a, b) => a.taskTitle.localeCompare(b.taskTitle, "en"));

  const totals = sumEstimates(items.filter((item) => item.decision !== "withdrawn"));
  const rate = rates.get(submittedBy) ?? null;
  const pendingCount = items.filter((item) => item.decision === "pending").length;
  const project = embedded<{ id: string; name: string }>(proposal.data.project);

  return {
    id: proposal.data.id,
    project: { id: proposal.data.project_id, name: project?.name ?? "Project" },
    submittedBy,
    submitterName: isAdmin ? (embedded<{ full_name: string }>(proposal.data.submitter)?.full_name ?? null) : null,
    submittedAt: proposal.data.submitted_at,
    completedAt: proposal.data.completed_at,
    items,
    totals,
    cost: costRange(totals, rate),
    rate,
    pendingCount,
    canApproveAll: canDecide && pendingCount > 0,
    timeZone: settings.timeZone,
  };
});

// ---------------------------------------------------------------------------
// New proposal (Tech.md §7.2)
// ---------------------------------------------------------------------------

export type ProposableTask = {
  id: string;
  title: string;
  status: Extract<TaskStatus, "draft" | "changes_requested">;
  estimate: (EstimateRange & { note: string | null }) | null;
};

export type NewProposalContext = {
  project: { id: string; name: string };
  tasks: ProposableTask[];
  rate: DisplayRate | null;
};

/**
 * The viewer's own Draft and Changes requested tasks in a project they are a member of.
 * Null when the project can't take a proposal from them.
 */
export async function getNewProposalContext(projectId: string, viewer: Viewer): Promise<NewProposalContext | null> {
  if (viewer.role !== "freelancer") return null;
  const supabase = createClient(await cookies());

  const project = await supabase.from("projects").select("id, name, status").eq("id", projectId).maybeSingle();
  if (project.error) {
    if (project.error.code === "22P02") return null;
    throw new Error(`Project lookup failed: ${project.error.message}`);
  }
  if (!project.data || project.data.status === "archived") return null;

  const settings = await getOrganizationSettings();
  const [membership, tasks, rates] = await Promise.all([
    supabase
      .from("project_members")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("user_id", viewer.id)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id, title, status, estimate_min_minutes, estimate_max_minutes, estimate_note")
      .eq("project_id", projectId)
      .eq("assignee_id", viewer.id)
      .in("status", ["draft", "changes_requested"])
      .order("created_at", { ascending: true }),
    currentRates(supabase, [viewer.id], settings.timeZone),
  ]);
  for (const result of [membership, tasks]) {
    if (result.error) throw new Error(`Proposal lookup failed: ${result.error.message}`);
  }
  if (!membership.data) return null;

  return {
    project: { id: project.data.id, name: project.data.name },
    rate: rates.get(viewer.id) ?? null,
    tasks: (tasks.data ?? []).flatMap((task): ProposableTask[] => {
      if (!isTaskStatus(task.status) || (task.status !== "draft" && task.status !== "changes_requested")) return [];
      const { estimate_min_minutes: min, estimate_max_minutes: max } = task;
      return [
        {
          id: task.id,
          title: task.title,
          status: task.status,
          estimate: min == null || max == null ? null : { minMinutes: min, maxMinutes: max, note: task.estimate_note },
        },
      ];
    }),
  };
}
