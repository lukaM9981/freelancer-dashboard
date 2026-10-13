import type { Money } from "@/lib/money";
import { monthFigures, type MonthLine } from "@/lib/projects/figures";

export type DashboardLine = MonthLine & {
  user_id: string | null;
  project_id: string | null;
  project_name: string | null;
};

export type TimeBreakdown = {
  id: string;
  name: string;
  countedMinutes: number;
  overLimitMinutes: number;
  /** One amount per currency, never added across currencies (PRD §8 rule 14). */
  amounts: Money[];
  missingRate: boolean;
};

/** This month's `report_lines` per freelancer, most counted time first. */
export function timeByFreelancer(lines: readonly DashboardLine[], names: ReadonlyMap<string, string>): TimeBreakdown[] {
  return breakdown(lines, (line) => line.user_id, (id) => names.get(id) ?? "Unknown person");
}

/** This month's `report_lines` per project, most counted time first. */
export function timeByProject(lines: readonly DashboardLine[]): TimeBreakdown[] {
  const names = new Map<string, string>();
  for (const line of lines) {
    if (line.project_id && line.project_name) names.set(line.project_id, line.project_name);
  }
  return breakdown(lines, (line) => line.project_id, (id) => names.get(id) ?? "Project");
}

function breakdown(
  lines: readonly DashboardLine[],
  keyOf: (line: DashboardLine) => string | null,
  nameOf: (id: string) => string,
): TimeBreakdown[] {
  const groups = new Map<string, DashboardLine[]>();
  for (const line of lines) {
    const key = keyOf(line);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(line);
    else groups.set(key, [line]);
  }
  return [...groups.entries()]
    .map(([id, group]) => {
      const figures = monthFigures(group);
      return {
        id,
        name: nameOf(id),
        countedMinutes: group.reduce((sum, line) => sum + (line.counted_minutes ?? 0), 0),
        overLimitMinutes: group.reduce((sum, line) => sum + (line.over_limit_minutes ?? 0), 0),
        amounts: figures.amounts,
        missingRate: figures.missingRate,
      };
    })
    .sort(
      (a, b) =>
        b.countedMinutes - a.countedMinutes ||
        b.overLimitMinutes - a.overLimitMinutes ||
        a.name.localeCompare(b.name, "en") ||
        a.id.localeCompare(b.id),
    );
}

export type OpenTask = {
  projectId: string;
  projectName: string;
  limitMinutes: number | null;
  countedMinutes: number;
  overLimitMinutes: number;
};

export type EstimateVsActual = {
  projectId: string;
  projectName: string;
  taskCount: number;
  /** The approved limits: the maximum of each estimate plus approved extra hours. */
  approvedMinutes: number;
  countedMinutes: number;
  overLimitMinutes: number;
};

/**
 * Approved limits against counted time on open tasks (Approved, In progress, On hold,
 * Done), per project. Time is each task's total, not only this month's.
 */
export function estimateVsActual(tasks: readonly OpenTask[]): EstimateVsActual[] {
  const projects = new Map<string, EstimateVsActual>();
  for (const task of tasks) {
    const row = projects.get(task.projectId) ?? {
      projectId: task.projectId,
      projectName: task.projectName,
      taskCount: 0,
      approvedMinutes: 0,
      countedMinutes: 0,
      overLimitMinutes: 0,
    };
    row.taskCount += 1;
    row.approvedMinutes += task.limitMinutes ?? 0;
    row.countedMinutes += task.countedMinutes;
    row.overLimitMinutes += task.overLimitMinutes;
    projects.set(task.projectId, row);
  }
  return [...projects.values()].sort(
    (a, b) => a.projectName.localeCompare(b.projectName, "en") || a.projectId.localeCompare(b.projectId),
  );
}
