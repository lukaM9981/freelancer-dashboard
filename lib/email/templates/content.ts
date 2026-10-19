import type { EmailContent, EmailItem } from "@/lib/email/templates/notification-email";
import { formatAmounts, formatDuration, formatEstimateRange, formatMonth, type Money } from "@/lib/format";

/** One notification in an email group (one action for one person). */
export type EmailEvent = {
  type: string;
  data: unknown;
  taskId: string | null;
  projectId: string | null;
  /** From the audit event: the proposal, request, or task the event is about. */
  entityId: string | null;
};

export type EmailContext = {
  /** Null for system events. */
  actorName: string | null;
  taskTitles: ReadonlyMap<string, string>;
  projectNames: ReadonlyMap<string, string>;
  /** Month closed only: the recipient's frozen totals, one amount per currency. */
  monthTotals: { countedMinutes: number; amounts: Money[] } | null;
  /** Absolute URL for an app path. */
  url: (path: string) => string;
};

type Data = Record<string, unknown>;

/**
 * The email for one group of notifications (Tech.md §9). A group normally holds one event
 * type; several estimate decisions from one action become one ProposalDecided email.
 */
export function composeEmail(events: readonly EmailEvent[], context: EmailContext): EmailContent {
  if (events.length === 0) throw new Error("An email needs at least one notification.");
  const types = new Set(events.map((event) => event.type));
  if (types.size === 1 && types.has("estimate.decided")) return proposalDecided(events, context);
  if (types.size === 1 || events.length === 1) return single(events[0], context);

  const items: EmailItem[] = events.map((event) => ({ title: single(event, context).subject }));
  return {
    subject: "Updates in Olifant Workboard",
    heading: "Updates for you",
    summary: "A few things changed in your work.",
    items,
    button: { label: "Open Dashboard", href: context.url("/dashboard") },
  };
}

function single(event: EmailEvent, context: EmailContext): EmailContent {
  switch (event.type) {
    case "task.assigned":
      return taskAssigned(event, context);
    case "proposal.submitted":
      return proposalSubmitted(event, context);
    case "estimate.decided":
      return proposalDecided([event], context);
    case "extra_hours.requested":
      return extraHoursRequested(event, context);
    case "extra_hours.decided":
      return extraHoursDecided(event, context);
    case "task.done":
      return taskDone(event, context);
    case "task.accepted":
    case "task.returned":
      return taskAcceptedOrReturned(event, context);
    case "task.held":
    case "task.resumed":
    case "task.cancelled":
    case "task.unassigned":
      return taskStatusChanged(event, context);
    case "project.status_changed":
      return projectStatusChanged(event, context);
    case "month.closed":
      return monthClosed(event, context);
    case "screenshot.deleted":
      return screenshotDeleted(event, context);
    default:
      return {
        subject: "An update in Olifant Workboard",
        heading: "An update for you",
        summary: "Something changed in your work.",
        button: { label: "Open Dashboard", href: context.url("/dashboard") },
      };
  }
}

function taskAssigned(event: EmailEvent, context: EmailContext): EmailContent {
  const task = taskName(event, context);
  return {
    subject: `New task: ${task}`,
    heading: "A task is waiting for your estimate",
    summary: `${actor(context)} assigned you ${task} on ${projectName(event, context)}. Estimate it so the work can be approved.`,
    button: { label: "Open Task", href: taskUrl(event, context) },
  };
}

function proposalSubmitted(event: EmailEvent, context: EmailContext): EmailContent {
  const data = asData(event.data);
  const count = wholeNumber(data.item_count);
  const estimates = count === 1 ? "1 estimate" : `${count ?? "New"} estimates`;
  const tasks = count === 1 ? "1 task" : count == null ? "tasks" : `${count} tasks`;
  const estimate = range(data);
  const who = actor(context);
  return {
    subject: `${who} sent ${estimates} for approval`,
    heading: "A proposal is waiting for you",
    summary: `${who} submitted ${tasks} on ${projectName(event, context)}${estimate ? `, ${estimate} in total` : ""}.`,
    button: {
      label: "Review Proposal",
      href: context.url(event.entityId ? `/approvals/${event.entityId}` : "/approvals"),
    },
  };
}

function proposalDecided(events: readonly EmailEvent[], context: EmailContext): EmailContent {
  const items = events.map((event): EmailItem => {
    const data = asData(event.data);
    const estimate = range(data);
    const comment = text(data.comment);
    return {
      title: `${taskName(event, context)}: ${decisionLabel(data.decision)}${estimate ? `, ${estimate}` : ""}`,
      ...(comment ? { detail: comment } : {}),
    };
  });
  const who = actor(context);

  if (events.length === 1) {
    const event = events[0];
    const data = asData(event.data);
    const task = taskName(event, context);
    const subject =
      data.decision === "approved"
        ? `Your estimate for ${task} was approved`
        : data.decision === "rejected"
          ? `Your estimate for ${task} was rejected`
          : `Changes requested to your estimate for ${task}`;
    const summary =
      data.decision === "approved"
        ? `${who} approved your estimate. You can start tracking time on ${task}.`
        : data.decision === "rejected"
          ? `${who} rejected your estimate for ${task}.`
          : `${who} asked you to change your estimate for ${task} and submit it again.`;
    return {
      subject,
      heading: "Your estimate was decided",
      summary,
      items,
      button: { label: "Open Task", href: taskUrl(event, context) },
    };
  }

  const proposalId = text(asData(events[0].data).proposal_id);
  return {
    subject: `${events.length} of your estimates were decided`,
    heading: "Your estimates were decided",
    summary: `${who} decided ${events.length} of your estimates on ${projectName(events[0], context)}.`,
    items,
    button: {
      label: "View Proposal",
      href: context.url(proposalId ? `/approvals/${proposalId}` : "/dashboard"),
    },
  };
}

function extraHoursRequested(event: EmailEvent, context: EmailContext): EmailContent {
  const data = asData(event.data);
  const hours = extraHours(data.minutes);
  const who = actor(context);
  return {
    subject: `${who} requested ${hours}`,
    heading: "Extra hours requested",
    summary: `${who} asked for ${hours} on ${taskName(event, context)} (${projectName(event, context)}).`,
    items: reasonItem("Reason", data.reason),
    button: { label: "Review Request", href: taskUrl(event, context) },
  };
}

function extraHoursDecided(event: EmailEvent, context: EmailContext): EmailContent {
  const data = asData(event.data);
  const approved = data.approved === true;
  const hours = extraHours(data.minutes);
  const task = taskName(event, context);
  return {
    subject: `Your request for extra hours was ${approved ? "approved" : "rejected"}`,
    heading: approved ? "Extra hours approved" : "Extra hours rejected",
    summary: approved
      ? `${actor(context)} approved ${hours} on ${task}. The task's limit went up by that much.`
      : `${actor(context)} rejected your request for ${hours} on ${task}.`,
    items: reasonItem("Reason", data.reason),
    button: { label: "Open Task", href: taskUrl(event, context) },
  };
}

function taskDone(event: EmailEvent, context: EmailContext): EmailContent {
  const task = taskName(event, context);
  return {
    subject: `${task} is Done`,
    heading: "A task is ready for review",
    summary: `${actor(context)} marked ${task} on ${projectName(event, context)} as Done. Accept it or return it.`,
    items: reasonItem("Comment", asData(event.data).comment),
    button: { label: "Review Task", href: taskUrl(event, context) },
  };
}

function taskAcceptedOrReturned(event: EmailEvent, context: EmailContext): EmailContent {
  const task = taskName(event, context);
  if (event.type === "task.accepted") {
    return {
      subject: `${task} was accepted`,
      heading: "Your task was accepted",
      summary: `${actor(context)} accepted ${task} on ${projectName(event, context)}.`,
      button: { label: "Open Task", href: taskUrl(event, context) },
    };
  }
  return {
    subject: `${task} was returned`,
    heading: "Your task needs more work",
    summary: `${actor(context)} returned ${task} to In progress.`,
    items: reasonItem("Comment", asData(event.data).comment),
    button: { label: "Open Task", href: taskUrl(event, context) },
  };
}

function taskStatusChanged(event: EmailEvent, context: EmailContext): EmailContent {
  const task = taskName(event, context);
  const project = projectName(event, context);
  const who = actor(context);
  switch (event.type) {
    case "task.held":
      return {
        subject: `${task} is on hold`,
        heading: "Your task is on hold",
        summary: `${who} put ${task} on ${project} on hold. Time can't be tracked on it until it resumes.`,
        button: { label: "Open Task", href: taskUrl(event, context) },
      };
    case "task.resumed":
      return {
        subject: `${task} was resumed`,
        heading: "Your task was resumed",
        summary: `${who} resumed ${task} on ${project}. You can track time on it again.`,
        button: { label: "Open Task", href: taskUrl(event, context) },
      };
    case "task.cancelled":
      return {
        subject: `${task} was cancelled`,
        heading: "Your task was cancelled",
        summary: `${who} cancelled ${task} on ${project}. No more time can be tracked on it.`,
        items: reasonItem("Comment", asData(event.data).comment),
        button: { label: "Open Task", href: taskUrl(event, context) },
      };
    default:
      return {
        subject: `${task} was reassigned`,
        heading: "A task was reassigned",
        summary: `${task} on ${project} was reassigned and no longer appears in your work.`,
        button: { label: "Open Dashboard", href: context.url("/dashboard") },
      };
  }
}

function projectStatusChanged(event: EmailEvent, context: EmailContext): EmailContent {
  const project = projectName(event, context);
  const href = context.url(event.projectId ? `/projects/${event.projectId}` : "/projects");
  const to = asData(event.data).to;
  const who = actor(context);
  if (to === "on_hold") {
    return {
      subject: `${project} is on hold`,
      heading: "A project is on hold",
      summary: `${who} put ${project} on hold. Running timers on it were stopped, and time can't be tracked until it resumes.`,
      button: { label: "Open Project", href },
    };
  }
  if (to === "archived") {
    return {
      subject: `${project} was archived`,
      heading: "A project was archived",
      summary: `${who} archived ${project}. It is now read-only.`,
      button: { label: "Open Project", href },
    };
  }
  return {
    subject: `${project} was resumed`,
    heading: "A project was resumed",
    summary: `${who} resumed ${project}. You can track time on its tasks again.`,
    button: { label: "Open Project", href },
  };
}

function monthClosed(event: EmailEvent, context: EmailContext): EmailContent {
  const month = text(asData(event.data).month);
  const label = month ? safeMonth(month) : "The month";
  const totals = context.monthTotals;
  const items: EmailItem[] = totals
    ? [
        { title: `Time: ${formatDuration(totals.countedMinutes)}` },
        ...(totals.amounts.length > 0 ? [{ title: `Amount: ${formatAmounts(totals.amounts)}` }] : []),
      ]
    : [];
  return {
    subject: `${label} is closed`,
    heading: "Your month is closed",
    summary: `${label} was closed, so your time for it is final. Your report is the basis for payment.`,
    items,
    button: { label: "View Report", href: context.url(month ? `/reports/${month.slice(0, 7)}` : "/reports") },
  };
}

function screenshotDeleted(event: EmailEvent, context: EmailContext): EmailContent {
  const task = taskName(event, context);
  return {
    subject: `Screenshot deleted on ${task}`,
    heading: "A screenshot was deleted",
    summary: `${actor(context)} deleted a screenshot on ${task}. The image is still on the task.`,
    button: { label: "Open Task", href: taskUrl(event, context) },
  };
}

function actor(context: EmailContext): string {
  return context.actorName ?? "Olifant";
}

function taskName(event: EmailEvent, context: EmailContext): string {
  return (event.taskId ? context.taskTitles.get(event.taskId) : undefined) ?? text(asData(event.data).title) ?? "a task";
}

function projectName(event: EmailEvent, context: EmailContext): string {
  return (event.projectId ? context.projectNames.get(event.projectId) : undefined) ?? "a project";
}

function taskUrl(event: EmailEvent, context: EmailContext): string {
  return context.url(event.taskId ? `/tasks/${event.taskId}` : "/dashboard");
}

function decisionLabel(decision: unknown): string {
  if (decision === "approved") return "Approved";
  if (decision === "rejected") return "Rejected";
  return "Changes requested";
}

function reasonItem(title: string, value: unknown): EmailItem[] {
  const detail = text(value);
  return detail ? [{ title, detail }] : [];
}

function safeMonth(month: string): string {
  try {
    return formatMonth(month);
  } catch {
    return "The month";
  }
}

function asData(value: unknown): Data {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {};
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function wholeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function extraHours(value: unknown): string {
  const minutes = wholeNumber(value);
  return minutes == null ? "extra hours" : `${formatDuration(minutes)} of extra hours`;
}

function range(data: Data): string | null {
  const min = wholeNumber(data.min_minutes);
  const max = wholeNumber(data.max_minutes);
  return min == null || max == null ? null : formatEstimateRange(min, max);
}
