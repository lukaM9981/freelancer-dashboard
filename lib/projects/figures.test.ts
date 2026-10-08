import { describe, expect, it } from "vitest";
import { countByStatus, monthFigures, projectSummary } from "@/lib/projects/figures";

describe("countByStatus", () => {
  it("counts statuses in lifecycle order and skips the empty ones", () => {
    expect(
      countByStatus([
        { status: "in_progress" },
        { status: "draft" },
        { status: "in_progress" },
        { status: "accepted" },
      ]),
    ).toEqual([
      { status: "draft", count: 1 },
      { status: "in_progress", count: 2 },
      { status: "accepted", count: 1 },
    ]);
  });
});

describe("monthFigures", () => {
  it("keeps currencies apart and sums exact cents", () => {
    const figures = monthFigures([
      { counted_minutes: 90, over_limit_minutes: 0, amount: "0.10", currency: "EUR" },
      { counted_minutes: 30, over_limit_minutes: 15, amount: 0.2, currency: "EUR" },
      { counted_minutes: 60, over_limit_minutes: 0, amount: "45.00", currency: "USD" },
    ]);
    expect(figures.trackedMinutes).toBe(195);
    expect(figures.amounts).toEqual([
      { currency: "EUR", cents: 30 },
      { currency: "USD", cents: 4500 },
    ]);
    expect(figures.missingRate).toBe(false);
  });

  it("flags counted time without a rate", () => {
    const figures = monthFigures([
      { counted_minutes: 60, over_limit_minutes: 0, amount: 0, currency: null },
    ]);
    expect(figures).toEqual({ trackedMinutes: 60, amounts: [], missingRate: true });
  });

  it("does not flag a line that is entirely over limit", () => {
    expect(
      monthFigures([{ counted_minutes: 0, over_limit_minutes: 20, amount: 0, currency: null }]).missingRate,
    ).toBe(false);
  });
});

describe("projectSummary", () => {
  it("leaves withdrawn limits and finished work out of planning figures", () => {
    const summary = projectSummary([
      { status: "in_progress", limit_minutes: 480, counted_minutes: 300, over_limit_minutes: 0, remaining_minutes: 180 },
      { status: "accepted", limit_minutes: 240, counted_minutes: 264, over_limit_minutes: 6, remaining_minutes: 0 },
      { status: "cancelled", limit_minutes: 120, counted_minutes: 30, over_limit_minutes: 0, remaining_minutes: 90 },
      { status: "draft", limit_minutes: null, counted_minutes: 0, over_limit_minutes: 0, remaining_minutes: 0 },
    ]);
    expect(summary).toEqual({
      approvedMinutes: 720,
      countedMinutes: 594,
      remainingMinutes: 180,
      overLimitMinutes: 6,
    });
  });
});
