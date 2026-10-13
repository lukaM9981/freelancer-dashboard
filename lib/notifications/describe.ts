import { formatDuration, formatEstimateRange, formatMonth } from "@/lib/format";

/** One `notifications` row for its recipient, with names already resolved. */
export type NotificationRow = {
  id: string;
  type: string;
  createdAt: string;
  readAt: string | null;
  txid: number;
  taskId: string | null;
  projectId: string | null;
  data: unknown;
  /** Null for system events and for events the recipient may not read. */
  actorName: string | null;
  /** The proposal, request, or task the event is about, when the recipient may read the event. */
  entityId: string | null;
  taskTitle: string | null;
  projectName: string | null;
};

export type NotificationItem = {
  key: string;
  /** Every row the item stands for; opening it marks them all read. */
  ids: string[];
  createdAt: string;
  read: boolean;
  text: string;
  detail?: string;
  href: string;
  projectName: string | null;
};

type Line = { text: string; detail?: string; href: string };

type Data = Record<string, unknown>;

const FALLBACK_HREF = "/dashboard";

/**
 * Items for the bell and the Notifications page, newest first. The estimate decisions of
 * one action ("Approve All Remaining") become one item, as they become one email.
 * `rows` must be newest first.
 */
export function notificationItems(rows: readonly NotificationRow[]): NotificationItem[] {
  const decisionsByTx = new Map<number, NotificationRow[]>();
  for (const row of rows) {
    if (row.type !== "estimate.decided") continue;
    const group = decisionsByTx.get(row.txid);
    if (group) group.push(row);
    else decisionsByTx.set(row.txid, [row]);
  }

  const items: NotificationItem[] = [];
  for (const row of rows) {
    const group = row.type === "estimate.decided" ? (decisionsByTx.get(row.txid) ?? [row]) : [row];
    if (group[0] !== row) continue;
    const line = group.length > 1 ? groupedDecisions(group) : describeNotification(row);
    items.push({
      key: row.id,
      ids: group.map((member) => member.id),
      createdAt: row.createdAt,
      read: group.every((member) => member.readAt != null),
      projectName: row.projectName,
      ...line,
    });
  }
  return items;
}

/** The sentence a recipient reads (PRD §6.12). The author is never the recipient. */
export function describeNotification(row: NotificationRow): Line {
  const data = asData(row.data);
  const actor = row.actorName ?? "Someone";
  const task = row.taskTitle ?? text(data.title) ?? "a task";
  const project = row.projectName ?? "a project";
  const taskHref = row.taskId ? `/tasks/${row.taskId}` : FALLBACK_HREF;

  switch (row.type) {
    case "proposal.submitted": {
      const count = wholeMinutes(data.item_count);
      const tasks = count === 1 ? "1 task" : count == null ? "tasks" : `${count} tasks`;
      const estimate = range(data);
      return {
        text: `${actor} submitted ${tasks} on ${project} for approval${estimate ? ` (${estimate})` : ""}.`,
        href: row.entityId ? `/approvals/${row.entityId}` : "/approvals",
      };
    }
    case "estimate.decided": {
      const estimate = range(data);
      const subject = `Your estimate${estimate ? ` of ${estimate}` : ""} for ${task}`;
      const sentence =
        data.decision === "approved"
          ? `${subject} was approved.`
          : data.decision === "rejected"
            ? `${subject} was rejected.`
            : `Changes were requested to your estimate${estimate ? ` of ${estimate}` : ""} for ${task}.`;
      return withDetail({ text: sentence, href: taskHref }, text(data.comment));
    }
    case "extra_hours.requested":
      return withDetail({ text: `${actor} requested ${extraHours(data.minutes)} on ${task}.`, href: taskHref }, text(data.reason));
    case "extra_hours.decided":
      return withDetail(
        {
          text: `Your request for ${extraHours(data.minutes)} on ${task} was ${data.approved === true ? "approved" : "rejected"}.`,
          href: taskHref,
        },
        text(data.reason),
      );
    case "task.done":
      return withDetail({ text: `${actor} marked ${task} as Done.`, href: taskHref }, text(data.comment));
    case "task.accepted":
      return { text: `${task} was accepted.`, href: taskHref };
    case "task.returned":
      return withDetail({ text: `${task} was returned to In progress.`, href: taskHref }, text(data.comment));
    case "task.held":
      return { text: `${task} was put on hold.`, href: taskHref };
    case "task.resumed":
      return { text: `${task} was resumed.`, href: taskHref };
    case "task.cancelled":
      return withDetail({ text: `${task} was cancelled.`, href: taskHref }, text(data.comment));
    case "task.assigned":
      return { text: `You were assigned ${task}. Add your estimate so it can be approved.`, href: taskHref };
    case "task.unassigned":
      return { text: `${task} was reassigned and is no longer yours.`, href: FALLBACK_HREF };
    case "project.status_changed": {
      const href = row.projectId ? `/projects/${row.projectId}` : "/projects";
      if (data.to === "on_hold") return { text: `${project} was put on hold.`, href };
      if (data.to === "active") return { text: `${project} was resumed.`, href };
      if (data.to === "archived") return { text: `${project} was archived.`, href };
      return { text: `${project} changed status.`, href };
    }
    case "timer.auto_stopped":
      return withDetail(
        { text: `Your timer on ${task} stopped automatically and saved ${minutes(data.minutes)}.`, href: taskHref },
        reason(data.reason),
      );
    case "task.limit_reached":
      return { text: `${task} reached 100% of its limit of ${minutes(data.limit_minutes)}.`, href: taskHref };
    case "task.over_limit":
      return { text: `Over-limit time was tracked on ${task}: ${minutes(data.over_limit_minutes)}.`, href: taskHref };
    case "comment.created":
      return withDetail({ text: `${actor} commented on ${task}.`, href: taskHref }, text(data.excerpt));
    case "month.closed": {
      const month = monthLabel(data.month);
      return { text: `${month.label} was closed. Your report for it is final.`, href: month.href };
    }
    case "month.reopened": {
      const month = monthLabel(data.month);
      return withDetail({ text: `${month.label} was reopened.`, href: month.href }, text(data.reason));
    }
    default:
      return { text: `${row.type.replace(/[._]/g, " ")}.`, href: row.taskId ? taskHref : FALLBACK_HREF };
  }
}

function groupedDecisions(group: readonly NotificationRow[]): Line {
  const decisions = new Set(group.map((row) => asData(row.data).decision));
  const verb =
    decisions.size > 1
      ? "were decided"
      : decisions.has("approved")
        ? "were approved"
        : decisions.has("rejected")
          ? "were rejected"
          : "need changes";
  const proposalId = text(asData(group[0].data).proposal_id);
  return {
    text: `${group.length} of your estimates ${verb}.`,
    href: proposalId ? `/approvals/${proposalId}` : FALLBACK_HREF,
  };
}

function monthLabel(value: unknown): { label: string; href: string } {
  const month = text(value);
  if (!month) return { label: "A month", href: "/reports" };
  try {
    return { label: formatMonth(month), href: `/reports/${month.slice(0, 7)}` };
  } catch {
    return { label: "A month", href: "/reports" };
  }
}

function withDetail(line: Line, detail: string | null): Line {
  return detail ? { ...line, detail } : line;
}

function asData(value: unknown): Data {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {};
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function wholeMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function minutes(value: unknown): string {
  const parsed = wholeMinutes(value);
  return parsed == null ? "some time" : formatDuration(parsed);
}

function extraHours(value: unknown): string {
  const parsed = wholeMinutes(value);
  return parsed == null ? "extra hours" : `${formatDuration(parsed)} of extra hours`;
}

function range(data: Data): string | null {
  const min = wholeMinutes(data.min_minutes);
  const max = wholeMinutes(data.max_minutes);
  return min == null || max == null ? null : formatEstimateRange(min, max);
}

function reason(value: unknown): string | null {
  const parsed = text(value);
  return parsed ? `Reason: ${parsed}.` : null;
}
