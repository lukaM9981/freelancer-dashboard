import type { TaskStatus } from "@/components/status-badge";
import type { ProjectStatus } from "@/lib/projects/schemas";

/**
 * What the UI offers on a task. The database decides what is allowed (DB.md §6.3); these
 * functions mirror its rules (PRD §5.1, §7) so buttons that would fail stay hidden. Update
 * them together with the command functions.
 */

export type PermissionViewer = { id: string; role: "admin" | "freelancer" };

export type PermissionTask = {
  status: TaskStatus;
  assigneeId: string | null;
  createdBy: string;
  everSubmitted: boolean;
  projectStatus: ProjectStatus;
  hasEstimate: boolean;
  hasTime: boolean;
  timerRunning: boolean;
  extraHoursPending: boolean;
};

export type TaskActions = {
  editDetails: boolean;
  estimate: boolean;
  /** First assignment of a never-submitted draft (phase 7). */
  assign: boolean;
  /** Reassigning once a task has moved on (phase 11). */
  reassign: boolean;
  delete: boolean;
  submit: boolean;
  withdraw: boolean;
  decideEstimate: boolean;
  requestExtraHours: boolean;
  decideExtraHours: boolean;
  hold: boolean;
  resume: boolean;
  cancel: boolean;
  markDone: boolean;
  accept: boolean;
  return: boolean;
  trackTime: boolean;
  comment: boolean;
  manageLinks: boolean;
};

const FINAL: ReadonlySet<TaskStatus> = new Set(["accepted", "rejected", "cancelled"]);
const ESTIMATING: ReadonlySet<TaskStatus> = new Set(["draft", "changes_requested"]);
const REASSIGNABLE: ReadonlySet<TaskStatus> = new Set([
  "draft",
  "pending_approval",
  "changes_requested",
  "approved",
  "in_progress",
  "on_hold",
]);
const WORKING: ReadonlySet<TaskStatus> = new Set(["approved", "in_progress", "on_hold"]);
const EXTRA_HOURS_DECIDABLE: ReadonlySet<TaskStatus> = new Set(["approved", "in_progress", "on_hold", "done"]);
const TRACKABLE: ReadonlySet<TaskStatus> = new Set(["approved", "in_progress"]);

export function isFinalStatus(status: TaskStatus): boolean {
  return FINAL.has(status);
}

export function availableActions(task: PermissionTask, viewer: PermissionViewer): TaskActions {
  const isAdmin = viewer.role === "admin";
  const isAssignee = task.assigneeId != null && task.assigneeId === viewer.id;
  // Everything in an archived project is read-only, and only Admins and the assignee
  // can see a task at all.
  const open = task.projectStatus !== "archived" && (isAdmin || isAssignee);
  // Admins never decide on, hold, or accept a task assigned to themselves (PRD §4).
  const deciding = open && isAdmin && !isAssignee;
  const estimating = open && isAssignee && ESTIMATING.has(task.status);

  return {
    editDetails: deciding ? !FINAL.has(task.status) : estimating,
    estimate: estimating,
    assign: open && isAdmin && task.status === "draft" && !task.everSubmitted,
    reassign: open && isAdmin && REASSIGNABLE.has(task.status) && !task.hasTime && !task.timerRunning,
    delete: open && !task.everSubmitted && (isAdmin || task.createdBy === viewer.id),
    submit: estimating && task.hasEstimate,
    withdraw: open && isAssignee && task.status === "pending_approval",
    decideEstimate: deciding && task.status === "pending_approval",
    requestExtraHours: open && isAssignee && WORKING.has(task.status) && !task.extraHoursPending,
    decideExtraHours: deciding && task.extraHoursPending && EXTRA_HOURS_DECIDABLE.has(task.status),
    hold: deciding && TRACKABLE.has(task.status),
    resume: deciding && task.status === "on_hold",
    cancel: deciding && !FINAL.has(task.status),
    markDone: open && isAssignee && task.status === "in_progress",
    accept: deciding && task.status === "done" && !task.extraHoursPending,
    return: deciding && task.status === "done",
    trackTime: open && isAssignee && TRACKABLE.has(task.status) && task.projectStatus === "active",
    comment: open,
    manageLinks: open,
  };
}

export type PermissionComment = { authorId: string; kind: "comment" | "decision" };

/** Authors edit or delete their own ordinary comments; decision comments are permanent. */
export function canChangeComment(
  comment: PermissionComment,
  task: Pick<PermissionTask, "projectStatus">,
  viewer: PermissionViewer,
): boolean {
  return task.projectStatus !== "archived" && comment.kind === "comment" && comment.authorId === viewer.id;
}
