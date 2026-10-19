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
  /** Set for freelancer rows when that person has a photo. */
  avatarUrl?: string | null;
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

