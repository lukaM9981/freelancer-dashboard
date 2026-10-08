import { formatCalendarDate, formatDuration, formatEstimateRange } from "@/lib/format";

/** One `audit_events` row on a task, with names already resolved. */
export type HistoryEvent = {
  type: string;
  actorId: string | null;
  actorName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  data: unknown;
};

export type HistoryLine = { text: string; detail?: string };

type Data = Record<string, unknown>;

/**
 * A readable sentence for a task event (PRD §6.13), with before and after values where
 * the event carries them. `viewerId` turns the viewer's own name into "You".
 */
export function describeEvent(event: HistoryEvent, viewerId: string): HistoryLine {
  const data = asData(event.data);
  const actor =
    event.actorId == null ? "Olifant Workboard" : event.actorId === viewerId ? "You" : (event.actorName ?? "Someone");
  const subject = event.subjectId === viewerId ? "you" : (event.subjectName ?? "someone");

  switch (event.type) {
    case "task.created":
      return { text: `${actor} created the task.` };
    case "task.assigned":
      return { text: `${actor} assigned the task to ${subject}.` };
    case "task.updated":
      return describeEdit(actor, data);
    case "task.estimate_changed": {
      const from = range(asData(data.from));
      const to = range(asData(data.to));
      if (!to) return { text: `${actor} cleared the estimate.` };
      return { text: from ? `${actor} changed the estimate from ${from} to ${to}.` : `${actor} set the estimate to ${to}.` };
    }
    case "estimate.submitted":
      return withDetail(`${actor} submitted an estimate of ${range(data) ?? "an unknown range"}.`, text(data.note));
    case "estimate.withdrawn":
      return { text: `${actor} withdrew the estimate.` };
    case "estimate.decided": {
      const estimate = range(data) ?? "an unknown range";
      const comment = text(data.comment);
      if (data.decision === "approved") return withDetail(`${actor} approved the estimate of ${estimate}.`, comment);
      if (data.decision === "rejected") return withDetail(`${actor} rejected the estimate of ${estimate}.`, comment);
      return withDetail(`${actor} requested changes to the estimate of ${estimate}.`, comment);
    }
    case "extra_hours.requested":
      return withDetail(`${actor} requested ${extraHours(data.minutes)}.`, text(data.reason));
    case "extra_hours.decided":
      return withDetail(
        data.approved === true
          ? `${actor} approved ${extraHours(data.minutes)}.`
          : `${actor} rejected the request for ${extraHours(data.minutes)}.`,
        text(data.reason),
      );
    case "task.held":
      return { text: `${actor} put the task on hold.` };
    case "task.resumed":
      return { text: `${actor} resumed the task.` };
    case "task.cancelled":
      return withDetail(`${actor} cancelled the task.`, text(data.comment));
    case "task.done":
      return withDetail(`${actor} marked the task as Done.`, text(data.comment));
    case "task.accepted":
      return { text: `${actor} accepted the task.` };
    case "task.returned":
      return withDetail(`${actor} returned the task to In progress.`, text(data.comment));
    case "task.limit_reached":
      return { text: `The task reached 100% of its limit of ${minutes(data.limit_minutes)}.` };
    case "task.over_limit":
      return { text: `Over-limit time was tracked: ${minutes(data.over_limit_minutes)}.` };
    case "comment.created":
      return { text: `${actor} commented.` };
    case "comment.updated":
      return { text: `${actor} edited a comment.` };
    case "comment.deleted":
      return { text: `${actor} deleted a comment.` };
    case "link.added":
      return withDetail(`${actor} added a link.`, text(data.label) ?? text(data.url));
    case "link.removed":
      return withDetail(`${actor} removed a link.`, text(data.url));
    case "timer.started":
      return { text: `${actor} started the timer.` };
    case "timer.stopped":
      return { text: `${actor} stopped the timer and saved ${minutes(data.minutes)}.` };
    case "timer.auto_stopped":
      return withDetail(`The timer stopped automatically and saved ${minutes(data.minutes)}.`, reason(data.reason));
    case "timer.discarded":
      return { text: `${actor} discarded the timer.` };
    case "time_entry.created":
      return { text: `${actor} added ${minutes(data.minutes)} for ${day(data.work_date)}.` };
    case "time_entry.updated":
      return describeEntryEdit(actor, data);
    case "time_entry.deleted":
      return withDetail(`${actor} deleted ${minutes(data.minutes)} from ${day(data.work_date)}.`, text(data.description));
    default:
      return { text: `${actor}: ${event.type.replace(/[._]/g, " ")}.` };
  }
}

function describeEdit(actor: string, data: Data): HistoryLine {
  const from = asData(data.from);
  const to = asData(data.to);
  const fromTitle = text(from.title);
  const toTitle = text(to.title);
  const renamed = fromTitle != null && toTitle != null && fromTitle !== toTitle;
  const described = (text(from.description) ?? "") !== (text(to.description) ?? "");

  if (renamed && described) {
    return { text: `${actor} renamed the task from \u201c${fromTitle}\u201d to \u201c${toTitle}\u201d and changed the description.` };
  }
  if (renamed) return { text: `${actor} renamed the task from \u201c${fromTitle}\u201d to \u201c${toTitle}\u201d.` };
  if (described) return { text: `${actor} changed the description.` };
  return { text: `${actor} saved the task without changes.` };
}

function describeEntryEdit(actor: string, data: Data): HistoryLine {
  const from = asData(data.from);
  const to = asData(data.to);
  const changes: string[] = [];
  if (from.minutes !== to.minutes) changes.push(`${minutes(from.minutes)} \u2192 ${minutes(to.minutes)}`);
  if (from.work_date !== to.work_date) changes.push(`${day(from.work_date)} \u2192 ${day(to.work_date)}`);
  if (from.description !== to.description) changes.push("new description");
  const summary = changes.length > 0 ? ` (${changes.join(", ")})` : "";
  return { text: `${actor} edited the time entry for ${day(to.work_date)}${summary}.` };
}

function withDetail(line: string, detail: string | null): HistoryLine {
  return detail ? { text: line, detail } : { text: line };
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
