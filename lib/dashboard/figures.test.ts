import { describe, expect, it } from "vitest";
import { timeByFreelancer, timeByProject, type DashboardLine } from "@/lib/dashboard/figures";

const line = (overrides: Partial<DashboardLine>): DashboardLine => ({
  user_id: "ana",
  project_id: "site",
  project_name: "Website",
  counted_minutes: 0,
  over_limit_minutes: 0,
  amount: 0,
  currency: "EUR",
  ...overrides,
});

describe("timeByFreelancer", () => {
  it("groups per person, keeps currencies apart, and puts the most time first", () => {
    const rows = timeByFreelancer(
      [
        line({ user_id: "ana", counted_minutes: 60, amount: "40.00" }),
        line({ user_id: "ana", counted_minutes: 30, over_limit_minutes: 12, amount: "25.00", currency: "USD" }),
        line({ user_id: "ben", counted_minutes: 120, amount: "0.10" }),
        line({ user_id: "ben", project_id: "app", counted_minutes: 15, amount: "0.20" }),
      ],
      new Map([
        ["ana", "Ana Kovač"],
        ["ben", "Ben Ford"],
      ]),
    );
    expect(rows).toEqual([
      { id: "ben", name: "Ben Ford", countedMinutes: 135, overLimitMinutes: 0, amounts: [{ currency: "EUR", cents: 30 }], missingRate: false },
      {
        id: "ana",
        name: "Ana Kovač",
        countedMinutes: 90,
        overLimitMinutes: 12,
        amounts: [
          { currency: "EUR", cents: 4000 },
          { currency: "USD", cents: 2500 },
        ],
        missingRate: false,
      },
    ]);
  });

  it("flags counted time without a rate", () => {
    const [row] = timeByFreelancer([line({ counted_minutes: 45, amount: 0, currency: null })], new Map());
    expect(row).toMatchObject({ name: "Unknown person", amounts: [], missingRate: true });
  });
});

describe("timeByProject", () => {
  it("groups per project with the project's name", () => {
    const rows = timeByProject([
      line({ project_id: "site", counted_minutes: 30 }),
      line({ user_id: "ben", project_id: "site", counted_minutes: 30 }),
      line({ project_id: "app", project_name: "Mobile app", counted_minutes: 90 }),
    ]);
    expect(rows.map((row) => [row.name, row.countedMinutes])).toEqual([
      ["Mobile app", 90],
      ["Website", 60],
    ]);
  });
});
