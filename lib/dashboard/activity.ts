import { formatCalendarDate, formatDuration, formatEstimateRange } from "@/lib/format";

/** Time entries and decisions on estimates and extra hours (PRD §6.11, Team activity). */
export const ACTIVITY_EVENT_TYPES = [
  "timer.stopped",
  "timer.auto_stopped",
  "time_entry.created",
  "estimate.decided",
  "extra_hours.decided",
] as const;

export type ActivityEvent = {
  id: number;
  occurredAt: string;
  txid: number;
  type: string;
  actorId: string | null;
  actorName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string | null;
  data: unknown;
};

export type ActivityItem = {
  key: string;
  occurredAt: string;
  text: string;
  detail?: string;
  projectName: string | null;
  href: string | null;
};

type Data = Record<string, unknown>;

/**
 * Feed lines, newest first. Estimate decisions made in one action ("Approve All
 * Remaining", or several items decided together) become one line. `events` must be
 * newest first.
 */
export function activityFeed(events: readonly ActivityEvent[], viewerId: string, limit: number): ActivityItem[] {
  const decisionsByTx = new Map<number, ActivityEvent[]>();
  for (const event of events) {
    if (event.type !== "estimate.decided") continue;
    const group = decisionsByTx.get(event.txid);
    if (group) group.push(event);
    else decisionsByTx.set(event.txid, [event]);
  }

  const items: ActivityItem[] = [];
  for (const event of events) {
    if (items.length >= limit) break;
    if (event.type === "estimate.decided") {
      const group = decisionsByTx.get(event.txid) ?? [event];
      if (group[0] !== event) continue;
      items.push(group.length > 1 ? groupedDecision(group, viewerId) : describe(event, viewerId));
      continue;
    }
    if ((ACTIVITY_EVENT_TYPES as readonly string[]).includes(event.type)) items.push(describe(event, viewerId));
  }
  return items;
}

function describe(event: ActivityEvent, viewerId: string): ActivityItem {
  const data = asData(event.data);
  const actor = actorLabel(event, viewerId);
  const subject = person(event.subjectId, event.subjectName, viewerId);
  const task = event.taskTitle ?? "a task";
  const base = {
    key: String(event.id),
    occurredAt: event.occurredAt,
    projectName: event.projectName,
    href: event.taskId ? `/tasks/${event.taskId}` : null,
  };

  switch (event.type) {
    case "timer.stopped":
      return { ...base, text: `${subject} tracked ${minutes(data.minutes)} on ${task}.` };
    case "time_entry.created":
      return { ...base, text: `${subject} added ${minutes(data.minutes)} for ${day(data.work_date)} on ${task}.` };
    case "timer.auto_stopped":
      return withDetail(
        { ...base, text: `${possessive(subject)} timer stopped automatically on ${task} and saved ${minutes(data.minutes)}.` },
        reason(data.reason),
      );
    case "estimate.decided": {
      const estimate = `${possessive(subject)} estimate of ${range(data) ?? "an unknown range"} on ${task}`;
      const proposalId = text(data.proposal_id);
      const item = { ...base, href: proposalId ? `/approvals/${proposalId}` : base.href };
      const comment = text(data.comment);
      if (data.decision === "approved") return withDetail({ ...item, text: `${actor} approved ${estimate}.` }, comment);
      if (data.decision === "rejected") return withDetail({ ...item, text: `${actor} rejected ${estimate}.` }, comment);
      return withDetail({ ...item, text: `${actor} requested changes to ${estimate}.` }, comment);
    }
    case "extra_hours.decided": {
      const request = `${possessive(subject)} request for ${extraHours(data.minutes)} on ${task}`;
      return withDetail(
        { ...base, text: data.approved === true ? `${actor} approved ${request}.` : `${actor} rejected ${request}.` },
        text(data.reason),
      );
    }
    default:
      return { ...base, text: `${actor}: ${event.type.replace(/[._]/g, " ")}.` };
  }
}

function groupedDecision(group: readonly ActivityEvent[], viewerId: string): ActivityItem {
  const first = group[0];
  const actor = actorLabel(first, viewerId);
  const subject = person(first.subjectId, first.subjectName, viewerId);
  const decisions = new Set(group.map((event) => asData(event.data).decision));
  const verb =
    decisions.size > 1
      ? "decided"
      : decisions.has("approved")
        ? "approved"
        : decisions.has("rejected")
          ? "rejected"
          : "requested changes to";
  const proposalId = text(asData(first.data).proposal_id);
  return {
    key: String(first.id),
    occurredAt: first.occurredAt,
    projectName: first.projectName,
    href: proposalId ? `/approvals/${proposalId}` : null,
    text: `${actor} ${verb} ${group.length} estimates from ${subject}.`,
  };
}

function actorLabel(event: ActivityEvent, viewerId: string): string {
  if (event.actorId == null) return "Olifant Workboard";
  return person(event.actorId, event.actorName, viewerId);
}

function person(id: string | null, name: string | null, viewerId: string): string {
  if (id != null && id === viewerId) return "You";
  return name ?? "Someone";
}

function possessive(name: string): string {
  if (name === "You") return "Your";
  return name.endsWith("s") ? `${name}\u2019` : `${name}\u2019s`;
}

function withDetail(item: ActivityItem, detail: string | null): ActivityItem {
  return detail ? { ...item, detail } : item;
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

function day(value: unknown): string {
  if (typeof value !== "string") return "an unknown date";
  try {
    return formatCalendarDate(value);
  } catch {
    return value;
  }
}

function reason(value: unknown): string | null {
  const parsed = text(value);
  return parsed ? `Reason: ${parsed}.` : null;
}
