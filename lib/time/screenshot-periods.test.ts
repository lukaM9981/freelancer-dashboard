import { describe, expect, it } from "vitest";
import {
  inPeriod,
  initialScreenshotPeriod,
  pageSlice,
  periodBounds,
  periodLabel,
  shiftPeriod,
  withUnit,
} from "@/lib/time/screenshot-periods";

const zone = "Europe/Budapest";

describe("screenshot periods", () => {
  it("opens on the week of the newest screenshot, Monday through Sunday", () => {
    const period = initialScreenshotPeriod("2026-10-25T23:00:00.000Z", zone);
    expect(period).toEqual({ unit: "week", anchor: "2026-10-26" });
    expect(periodBounds(period)).toEqual({ start: "2026-10-26", end: "2026-11-02" });
    expect(periodLabel(period, "2026-10-26")).toBe("This week, 26 Oct \u2013 1 Nov 2026");
    expect(periodLabel(period, "2026-11-02")).toBe("26 Oct \u2013 1 Nov 2026");
  });

  it("keeps a shot on the local Monday and drops the Sunday before it", () => {
    const week = { unit: "week" as const, anchor: "2026-10-28" };
    expect(inPeriod(week, "2026-10-25T23:00:00.000Z", zone)).toBe(true);
    expect(inPeriod(week, "2026-10-25T22:30:00.000Z", zone)).toBe(false);
    expect(periodBounds(week).start).toBe("2026-10-26");
  });

  it("steps a day, a week, and a month from the period start", () => {
    expect(shiftPeriod({ unit: "day", anchor: "2026-10-26" }, 1).anchor).toBe("2026-10-27");
    expect(shiftPeriod({ unit: "week", anchor: "2026-10-28" }, 1).anchor).toBe("2026-11-02");
    expect(shiftPeriod({ unit: "week", anchor: "2026-10-28" }, -1).anchor).toBe("2026-10-19");
    expect(shiftPeriod({ unit: "month", anchor: "2026-10-31" }, 1).anchor).toBe("2026-11-01");
    expect(shiftPeriod({ unit: "month", anchor: "2026-10-31" }, -1).anchor).toBe("2026-09-01");
  });

  it("names a day and a month, and a week that crosses the new year", () => {
    expect(periodLabel({ unit: "day", anchor: "2026-10-26" }, "2026-10-26")).toBe("Today, 26 Oct 2026");
    expect(periodLabel({ unit: "day", anchor: "2026-10-25" }, "2026-10-26")).toBe("25 Oct 2026");
    expect(periodLabel(withUnit({ unit: "week", anchor: "2026-10-26" }, "month"), "2026-10-26")).toBe(
      "This month, October 2026",
    );
    expect(periodLabel({ unit: "month", anchor: "2026-10-26" }, "2026-11-02")).toBe("October 2026");
    expect(periodLabel({ unit: "week", anchor: "2026-12-28" }, "2026-12-28")).toBe(
      "This week, 28 Dec 2026 \u2013 3 Jan 2027",
    );
  });

  it("shows twelve screenshots per page", () => {
    const shots = Array.from({ length: 13 }, (_, index) => index);
    expect(pageSlice(shots, 1)).toEqual({ items: shots.slice(0, 12), page: 1, pageCount: 2 });
    expect(pageSlice(shots, 2).items).toEqual([12]);
    expect(pageSlice(shots, 9).page).toBe(2);
    expect(pageSlice([], 1)).toEqual({ items: [], page: 1, pageCount: 1 });
  });
});
