import { describe, expect, it } from "vitest";
import { monthBlockers, monthWarnings } from "@/lib/months/checks";

const open = {
  month: "2026-09-01",
  currentMonth: "2026-10-01",
  monthsWithTime: ["2026-09-01"],
  closedMonths: [],
  runningTimerStarts: [],
  openExtraHours: false,
  missingRate: false,
};

describe("monthBlockers", () => {
  it("lets a finished month with time close", () => {
    expect(monthBlockers(open)).toEqual([]);
  });

  it("keeps the current month open until it has ended", () => {
    expect(monthBlockers({ ...open, month: "2026-10-01", monthsWithTime: ["2026-10-01"] })).toEqual([
      "month_not_ended",
    ]);
  });

  it("blocks while an earlier month that has time is still open", () => {
    expect(
      monthBlockers({
        ...open,
        month: "2026-10-01",
        currentMonth: "2026-11-01",
        monthsWithTime: ["2026-08-01", "2026-10-01"],
      }),
    ).toEqual(["earlier_month_open"]);
  });

  it("ignores a gap month that has no time", () => {
    expect(
      monthBlockers({
        ...open,
        monthsWithTime: ["2026-08-01", "2026-10-01"],
        closedMonths: ["2026-08-01"],
        currentMonth: "2026-11-01",
        month: "2026-10-01",
      }),
    ).toEqual([]);
  });

  it("blocks on a timer that started before the month ended", () => {
    expect(monthBlockers({ ...open, runningTimerStarts: ["2026-09-30"] })).toEqual(["timer_running_in_month"]);
    expect(monthBlockers({ ...open, runningTimerStarts: ["2026-10-01"] })).toEqual([]);
  });

  it("blocks on an open extra-hours request and on a missing rate", () => {
    expect(monthBlockers({ ...open, openExtraHours: true, missingRate: true })).toEqual([
      "open_extra_hours_request",
      "missing_rate",
    ]);
  });
});

describe("monthWarnings", () => {
  it("warns about acceptance and unpaid time without blocking", () => {
    expect(monthWarnings(1, 42)).toEqual([
      "1 task is Done and still waiting for acceptance. Closing includes its time.",
      "42m is over limit and will stay unpaid.",
    ]);
    expect(monthWarnings(2, 0)).toEqual([
      "2 tasks are Done and still waiting for acceptance. Closing includes their time.",
    ]);
  });
});
