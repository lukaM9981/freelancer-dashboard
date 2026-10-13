import { formatCalendarDate, formatDateTime, formatDuration, formatEstimateRange, formatMoney, formatMonth, toCents } from "@/lib/format";
import { describeEvent } from "@/lib/tasks/history";

/** One `audit_log` row, with names already resolved. */
export type AuditRow = {
  id: number;
  occurredAt: string;
  type: string;
  actorId: string | null;
  actorName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  /** The task the event is about; null once a draft is deleted. */
  task: { id: string; title: string } | null;
  project: { id: string; name: string } | null;
  entityId: string | null;
  /** Name (or email) on the invitation, for invitation events. */
  inviteeName: string | null;
  data: unknown;
};

export type AuditChange = { label: string; from: string; to: string };
export type AuditLink = { label: string; href: string };

export type AuditEntry = {
  id: number;
  occurredAt: string;
  text: string;
  detail?: string;
  changes: AuditChange[];
  links: AuditLink[];
};

type Data = Record<string, unknown>;

const EMPTY = "Empty";

/** A line of the Admin audit log (PRD §6.13): what happened, what changed, and where. */
export function describeAuditEvent(row: AuditRow, viewerId: string, timeZone: string): AuditEntry {
  const line = sentence(row, viewerId);
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    ...line,
    changes: changesOf(row.type, asData(row.data), timeZone),
    links: linksOf(row),
  };
}

function sentence(row: AuditRow, viewerId: string): { text: string; detail?: string } {
  const data = asData(row.data);
  const actor = row.actorId == null ? "Olifant Workboard" : row.actorId === viewerId ? "You" : (row.actorName ?? "Someone");
  const subject = row.subjectId === viewerId ? "you" : (row.subjectName ?? "someone");
  const invitee = row.inviteeName ?? text(data.email) ?? "someone";

  switch (row.type) {
    case "task.unassigned":
      return { text: `${actor} reassigned the task, taking it from ${subject}.` };
    case "task.deleted":
      return { text: `${actor} deleted the draft task \u201c${text(data.title) ?? "Untitled"}\u201d.` };
    case "proposal.submitted": {
      const count = wholeNumber(data.item_count);
      const tasks = count === 1 ? "1 task" : count == null ? "tasks" : `${count} tasks`;
      const estimate = range(data);
      return { text: `${actor} submitted ${tasks} for approval${estimate ? ` (${estimate})` : ""}.` };
    }
    case "comment.updated":
      return { text: `${actor} edited a comment.` };
    case "comment.deleted":
      return withDetail(`${actor} deleted a comment.`, text(data.body));
    case "project.created":
      return { text: `${actor} created the project \u201c${text(data.name) ?? row.project?.name ?? "Untitled"}\u201d.` };
    case "project.updated":
      return { text: `${actor} edited the project.` };
    case "project.status_changed":
      return { text: `${actor} ${statusVerb(data.from, data.to)}.` };
    case "member.added":
      return { text: `${actor} added ${subject} to the project.` };
    case "member.removed":
      return { text: `${actor} removed ${subject} from the project.` };
    case "person.invited":
      return { text: `${actor} invited ${invitee} as ${withArticle(roleLabel(data.role))}.` };
    case "invitation.resent":
      return { text: `${actor} resent the invitation to ${invitee}.` };
    case "invitation.revoked":
      return { text: `${actor} revoked the invitation to ${invitee}.` };
    case "person.activated":
      return { text: `${capitalize(subject)} accepted the invitation and joined as ${withArticle(roleLabel(data.role))}.` };
    case "person.updated": {
      const name = text(data.full_name);
      const who = row.actorId != null && row.actorId === row.subjectId ? null : subject;
      if (!name) return { text: who ? `${actor} changed the name of ${who}.` : `${actor} changed their name.` };
      return { text: who ? `${actor} renamed ${who} to \u201c${name}\u201d.` : `${actor} changed their name to \u201c${name}\u201d.` };
    }
    case "person.role_changed":
      return { text: `${actor} changed the role of ${subject} to ${roleLabel(data.to)}.` };
    case "person.deactivated":
      return { text: `${actor} deactivated ${subject}.` };
    case "person.reactivated":
      return { text: `${actor} reactivated ${subject}.` };
    case "rate.added":
      return { text: `${actor} added a rate of ${rate(data)} for ${subject}, from ${day(data.effective_from)}.` };
    case "rate.deleted":
      return { text: `${actor} deleted the rate of ${rate(data)} for ${subject} that started ${day(data.effective_from)}.` };
    case "month.closed":
      return { text: `${actor} closed ${month(data.month)}.` };
    case "month.reopened":
      return withDetail(`${actor} reopened ${month(data.month)}.`, text(data.reason));
    case "settings.changed":
      return { text: `${actor} changed the settings.` };
    default:
      return describeEvent(
        {
          type: row.type,
          actorId: row.actorId,
          actorName: row.actorName,
          subjectId: row.subjectId,
          subjectName: row.subjectName,
          data: row.data,
        },
        viewerId,
      );
  }
}

/** Before and after values of the fields an edit changed. */
export function changesOf(type: string, data: Data, timeZone: string): AuditChange[] {
  const from = asData(data.from);
  const to = asData(data.to);
  switch (type) {
    case "task.updated":
      return compare([
        ["Title", plain(from.title), plain(to.title)],
        ["Description", plain(from.description), plain(to.description)],
      ]);
    case "task.estimate_changed":
      return compare([["Estimate", range(from) ?? EMPTY, range(to) ?? EMPTY]]);
    case "time_entry.updated":
      return compare([
        ["Date", day(from.work_date), day(to.work_date)],
        ["Duration", duration(from.minutes), duration(to.minutes)],
        ["Start", moment(from.started_at, timeZone), moment(to.started_at, timeZone)],
        ["End", moment(from.ended_at, timeZone), moment(to.ended_at, timeZone)],
        ["Description", plain(from.description), plain(to.description)],
      ]);
    case "comment.updated":
      return compare([["Comment", plain(data.from), plain(data.to)]]);
    case "project.updated":
      return compare([
        ["Name", plain(from.name), plain(to.name)],
        ["Description", plain(from.description), plain(to.description)],
      ]);
    case "project.status_changed":
      return compare([["Status", projectStatusLabel(data.from), projectStatusLabel(data.to)]]);
    case "person.role_changed":
      return compare([["Role", roleLabel(data.from), roleLabel(data.to)]]);
    case "settings.changed":
      return compare([
        ["Organization name", plain(from.name), plain(to.name)],
        ["Time zone", plain(from.time_zone), plain(to.time_zone)],
        ["Tolerance", percent(from.tolerance_percent), percent(to.tolerance_percent)],
        ["Default currency", plain(from.default_currency), plain(to.default_currency)],
      ]);
    default:
      return [];
  }
}

function linksOf(row: AuditRow): AuditLink[] {
  const links: AuditLink[] = [];
  if (row.project) links.push({ label: row.project.name, href: `/projects/${row.project.id}` });
  if (row.task) links.push({ label: row.task.title, href: `/tasks/${row.task.id}` });
  if (row.type === "proposal.submitted" && row.entityId) {
    links.push({ label: "Proposal", href: `/approvals/${row.entityId}` });
  }
  if (row.subjectId && row.subjectName && !row.task) {
    links.push({ label: row.subjectName, href: `/people/${row.subjectId}` });
  }
  if (row.type === "month.closed" || row.type === "month.reopened") {
    const value = text(asData(row.data).month);
    if (value && /^\d{4}-\d{2}-01$/.test(value)) links.push({ label: "Report", href: `/reports/${value.slice(0, 7)}` });
  }
  return links;
}

function compare(fields: readonly [string, string, string][]): AuditChange[] {
  return fields.filter(([, from, to]) => from !== to).map(([label, from, to]) => ({ label, from, to }));
}

function statusVerb(from: unknown, to: unknown): string {
  if (to === "on_hold") return "put the project on hold";
  if (to === "archived") return "archived the project";
  if (to === "active" && from === "archived") return "restored the project";
  if (to === "active") return "resumed the project";
  return "changed the project status";
}

function projectStatusLabel(value: unknown): string {
  if (value === "active") return "Active";
  if (value === "on_hold") return "On hold";
  if (value === "archived") return "Archived";
  return text(value) ?? EMPTY;
}

function roleLabel(value: unknown): string {
  if (value === "admin") return "Admin";
  if (value === "freelancer") return "Freelancer";
  return text(value) ?? "an unknown role";
}

function withArticle(role: string): string {
  return /^[AEIOU]/.test(role) ? `an ${role}` : `a ${role}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function rate(data: Data): string {
  const currency = data.currency === "EUR" || data.currency === "USD" ? data.currency : null;
  const amount = typeof data.hourly_rate === "number" || typeof data.hourly_rate === "string" ? data.hourly_rate : null;
  if (!currency || amount == null) return "an unknown amount";
  try {
    return `${formatMoney(toCents(amount), currency)}/h`;
  } catch {
    return `${amount} ${currency}/h`;
  }
}

function month(value: unknown): string {
  const parsed = text(value);
  if (!parsed) return "a month";
  try {
    return formatMonth(parsed);
  } catch {
    return parsed;
  }
}

function day(value: unknown): string {
  if (typeof value !== "string") return EMPTY;
  try {
    return formatCalendarDate(value);
  } catch {
    return value;
  }
}

function moment(value: unknown, timeZone: string): string {
  if (typeof value !== "string" || value === "") return EMPTY;
  try {
    return formatDateTime(value, timeZone);
  } catch {
    return value;
  }
}

function duration(value: unknown): string {
  const parsed = wholeNumber(value);
  return parsed == null ? EMPTY : formatDuration(parsed);
}

function percent(value: unknown): string {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? `${parsed}%` : EMPTY;
}

function range(data: Data): string | null {
  const min = wholeNumber(data.min_minutes);
  const max = wholeNumber(data.max_minutes);
  return min == null || max == null ? null : formatEstimateRange(min, max);
}

function withDetail(line: string, detail: string | null): { text: string; detail?: string } {
  return detail ? { text: line, detail } : { text: line };
}

function asData(value: unknown): Data {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {};
}

function plain(value: unknown): string {
  return text(value) ?? EMPTY;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function wholeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}
