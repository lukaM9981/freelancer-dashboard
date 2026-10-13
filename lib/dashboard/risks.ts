import { formatAge, formatDuration } from "@/lib/format";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Decisions waiting longer than this are a risk (PRD §6.11). */
export const SLOW_DECISION_MS = 3 * DAY_MS;
/** In progress tasks with nothing tracked for this long are stalled (PRD §6.11). */
export const STALLED_MS = 7 * DAY_MS;

export type RiskTask = {
  id: string;
  title: string;
  projectName: string;
  assigneeName: string | null;
  limitMinutes: number | null;
  countedMinutes: number;
  overLimitMinutes: number;
};

export type StalledTask = { taskId: string; lastTrackedAt: string };

export type WaitingItem =
  | { kind: "proposal"; id: string; projectName: string; personName: string; waitingSince: string; itemCount: number }
  | { kind: "extra_hours"; id: string; taskId: string; taskTitle: string; projectName: string; personName: string; waitingSince: string; minutes: number }
  | { kind: "done_task"; id: string; taskId: string; taskTitle: string; projectName: string; personName: string; waitingSince: string };

export type RiskKind = "over_limit" | "extra_hours" | "slow_decision" | "near_limit" | "stalled";

export type RiskNote = { kind: RiskKind; text: string };

export type RiskRow = {
  key: string;
  href: string;
  title: string;
  projectName: string;
  personName: string | null;
  notes: RiskNote[];
};

const SEVERITY: Record<RiskKind, number> = {
  over_limit: 0,
  extra_hours: 1,
  slow_decision: 2,
  near_limit: 3,
  stalled: 4,
};

/**
 * "Overruns and risks" (PRD §6.11): tasks at or above 80% of their limit, tasks with
 * over-limit time, open extra-hours requests, stalled In progress tasks, and decisions
 * waiting more than three days. A task with several risks is one row.
 */
export function collectRisks(
  tasks: readonly RiskTask[],
  stalled: readonly StalledTask[],
  waiting: readonly WaitingItem[],
  now: Date,
): RiskRow[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const rows = new Map<string, RiskRow>();

  const taskRow = (taskId: string, fallback: { title: string; projectName: string; personName: string | null }) => {
    const key = `task:${taskId}`;
    let row = rows.get(key);
    if (!row) {
      const task = taskById.get(taskId);
      row = {
        key,
        href: `/tasks/${taskId}`,
        title: task?.title ?? fallback.title,
        projectName: task?.projectName ?? fallback.projectName,
        personName: task?.assigneeName ?? fallback.personName,
        notes: [],
      };
      rows.set(key, row);
    }
    return row;
  };

  for (const task of tasks) {
    const fallback = { title: task.title, projectName: task.projectName, personName: task.assigneeName };
    if (task.overLimitMinutes > 0) {
      taskRow(task.id, fallback).notes.push({
        kind: "over_limit",
        text: `${formatDuration(task.overLimitMinutes)} over limit`,
      });
    } else if (task.limitMinutes != null && task.limitMinutes > 0 && task.countedMinutes * 100 >= task.limitMinutes * 80) {
      const percent = Math.floor((task.countedMinutes * 100) / task.limitMinutes);
      taskRow(task.id, fallback).notes.push({
        kind: "near_limit",
        text: `${percent}% of the ${formatDuration(task.limitMinutes)} limit`,
      });
    }
  }

  for (const item of waiting) {
    const slow = now.getTime() - Date.parse(item.waitingSince) > SLOW_DECISION_MS;
    const age = formatAge(item.waitingSince, now);
    if (item.kind === "extra_hours") {
      const fallback = { title: item.taskTitle, projectName: item.projectName, personName: item.personName };
      taskRow(item.taskId, fallback).notes.push({
        kind: "extra_hours",
        text: `+${formatDuration(item.minutes)} extra hours requested, waiting ${age}`,
      });
    } else if (slow && item.kind === "done_task") {
      const fallback = { title: item.taskTitle, projectName: item.projectName, personName: item.personName };
      taskRow(item.taskId, fallback).notes.push({
        kind: "slow_decision",
        text: `Done, waiting ${age} for acceptance`,
      });
    } else if (slow && item.kind === "proposal") {
      rows.set(`proposal:${item.id}`, {
        key: `proposal:${item.id}`,
        href: `/approvals/${item.id}`,
        title: item.itemCount === 1 ? "Proposal with 1 item" : `Proposal with ${item.itemCount} items`,
        projectName: item.projectName,
        personName: item.personName,
        notes: [{ kind: "slow_decision", text: `Waiting ${age} for a decision` }],
      });
    }
  }

  for (const entry of stalled) {
    const task = taskById.get(entry.taskId);
    if (!task) continue;
    const days = Math.floor((now.getTime() - Date.parse(entry.lastTrackedAt)) / DAY_MS);
    taskRow(task.id, { title: task.title, projectName: task.projectName, personName: task.assigneeName }).notes.push({
      kind: "stalled",
      text: `No time tracked for ${days} days`,
    });
  }

  return [...rows.values()]
    .map((row) => ({ ...row, notes: [...row.notes].sort((a, b) => SEVERITY[a.kind] - SEVERITY[b.kind]) }))
    .sort(
      (a, b) =>
        SEVERITY[a.notes[0].kind] - SEVERITY[b.notes[0].kind] ||
        a.projectName.localeCompare(b.projectName, "en") ||
        a.title.localeCompare(b.title, "en") ||
        a.key.localeCompare(b.key),
    );
}
