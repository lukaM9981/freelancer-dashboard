/** Every `audit_events.event_type` the database writes, grouped for the audit log filter (PRD §6.13). */
export const EVENT_GROUPS = [
  {
    id: "tasks",
    label: "Tasks",
    types: [
      ["task.created", "Task created"],
      ["task.updated", "Task edited"],
      ["task.estimate_changed", "Working estimate changed"],
      ["task.assigned", "Task assigned"],
      ["task.unassigned", "Task taken from its assignee"],
      ["task.held", "Task put on hold"],
      ["task.resumed", "Task resumed"],
      ["task.cancelled", "Task cancelled"],
      ["task.done", "Task marked Done"],
      ["task.accepted", "Task accepted"],
      ["task.returned", "Task returned"],
      ["task.deleted", "Draft task deleted"],
      ["task.limit_reached", "Limit reached"],
      ["task.over_limit", "Over-limit time tracked"],
    ],
  },
  {
    id: "estimates",
    label: "Estimates",
    types: [
      ["proposal.submitted", "Proposal submitted"],
      ["estimate.submitted", "Estimate submitted"],
      ["estimate.withdrawn", "Estimate withdrawn"],
      ["estimate.decided", "Estimate decided"],
    ],
  },
  {
    id: "extra_hours",
    label: "Extra hours",
    types: [
      ["extra_hours.requested", "Extra hours requested"],
      ["extra_hours.decided", "Extra hours decided"],
    ],
  },
  {
    id: "time",
    label: "Time and timer",
    types: [
      ["timer.started", "Timer started"],
      ["timer.stopped", "Timer stopped"],
      ["timer.auto_stopped", "Timer stopped automatically"],
      ["timer.discarded", "Timer discarded"],
      ["time_entry.created", "Time added"],
      ["time_entry.updated", "Time edited"],
      ["time_entry.deleted", "Time deleted"],
    ],
  },
  {
    id: "comments",
    label: "Comments and links",
    types: [
      ["comment.created", "Comment added"],
      ["comment.updated", "Comment edited"],
      ["comment.deleted", "Comment deleted"],
      ["link.added", "Link added"],
      ["link.removed", "Link removed"],
    ],
  },
  {
    id: "projects",
    label: "Projects",
    types: [
      ["project.created", "Project created"],
      ["project.updated", "Project edited"],
      ["project.status_changed", "Project status changed"],
      ["member.added", "Member added"],
      ["member.removed", "Member removed"],
    ],
  },
  {
    id: "people",
    label: "People and rates",
    types: [
      ["person.invited", "Person invited"],
      ["invitation.resent", "Invitation resent"],
      ["invitation.revoked", "Invitation revoked"],
      ["person.activated", "Invitation accepted"],
      ["person.updated", "Name changed"],
      ["person.role_changed", "Role changed"],
      ["person.deactivated", "Person deactivated"],
      ["person.reactivated", "Person reactivated"],
      ["rate.added", "Rate added"],
      ["rate.deleted", "Rate deleted"],
    ],
  },
  {
    id: "months",
    label: "Months",
    types: [
      ["month.closed", "Month closed"],
      ["month.reopened", "Month reopened"],
    ],
  },
  {
    id: "settings",
    label: "Settings",
    types: [["settings.changed", "Settings changed"]],
  },
] as const satisfies readonly { id: string; label: string; types: readonly (readonly [string, string])[] }[];

/**
 * The event types an audit log filter value stands for: a group id ("tasks") or one event
 * type ("task.created"). Null for a value that is neither.
 */
export function eventTypesFor(filter: string): string[] | null {
  for (const group of EVENT_GROUPS) {
    if (group.id === filter) return group.types.map(([type]) => type);
    if (group.types.some(([type]) => type === filter)) return [filter];
  }
  return null;
}
