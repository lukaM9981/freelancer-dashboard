import { describe, expect, it } from "vitest";
import { collectRisks, type RiskTask } from "@/lib/dashboard/risks";

const now = new Date("2026-10-12T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const task = (overrides: Partial<RiskTask>): RiskTask => ({
  id: "t1",
  title: "Homepage",
  projectName: "Website",
  assigneeName: "Ana Kovač",
  limitMinutes: 480,
  countedMinutes: 0,
  overLimitMinutes: 0,
  ...overrides,
});

describe("collectRisks", () => {
  it("flags tasks from 80% of the limit, and over-limit time instead of the percentage", () => {
    const rows = collectRisks(
      [
        task({ id: "under", title: "Under", countedMinutes: 383 }),
        task({ id: "near", title: "Near", countedMinutes: 384 }),
        task({ id: "over", title: "Over", countedMinutes: 528, overLimitMinutes: 42 }),
      ],
      [],
      [],
      now,
    );
    expect(rows.map((row) => [row.title, row.notes.map((note) => note.text)])).toEqual([
      ["Over", ["42m over limit"]],
      ["Near", ["80% of the 8h limit"]],
    ]);
  });

  it("merges every risk on one task into one row, most severe first", () => {
    const rows = collectRisks(
      [task({ countedMinutes: 400 })],
      [{ taskId: "t1", lastTrackedAt: daysAgo(9) }],
      [
        {
          kind: "extra_hours",
          id: "x1",
          taskId: "t1",
          taskTitle: "Homepage",
          projectName: "Website",
          personName: "Ana Kovač",
          waitingSince: daysAgo(1),
          minutes: 120,
        },
      ],
      now,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].href).toBe("/tasks/t1");
    expect(rows[0].notes.map((note) => note.kind)).toEqual(["extra_hours", "near_limit", "stalled"]);
    expect(rows[0].notes[0].text).toBe("+2h extra hours requested, waiting 1 day");
    expect(rows[0].notes[2].text).toBe("No time tracked for 9 days");
  });

  it("lists decisions only once they have waited more than three days", () => {
    const proposal = (id: string, days: number) => ({
      kind: "proposal" as const,
      id,
      projectName: "Website",
      personName: "Ana Kovač",
      waitingSince: daysAgo(days),
      itemCount: 2,
    });
    const rows = collectRisks([], [], [proposal("fresh", 3), proposal("slow", 4)], now);
    expect(rows).toEqual([
      {
        key: "proposal:slow",
        href: "/approvals/slow",
        title: "Proposal with 2 items",
        projectName: "Website",
        personName: "Ana Kovač",
        notes: [{ kind: "slow_decision", text: "Waiting 4 days for a decision" }],
      },
    ]);
  });

  it("notes a Done task waiting for acceptance", () => {
    const rows = collectRisks(
      [task({ countedMinutes: 120 })],
      [],
      [
        {
          kind: "done_task",
          id: "t1",
          taskId: "t1",
          taskTitle: "Homepage",
          projectName: "Website",
          personName: "Ana Kovač",
          waitingSince: daysAgo(5),
        },
      ],
      now,
    );
    expect(rows[0].notes).toEqual([{ kind: "slow_decision", text: "Done, waiting 5 days for acceptance" }]);
  });
});
