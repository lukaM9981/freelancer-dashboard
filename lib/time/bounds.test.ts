import { describe, expect, it } from "vitest";
import { clampMonth, earliestWorkDate, monthIsOpen } from "@/lib/time/bounds";

describe("earliestWorkDate", () => {
  it("keeps the approval date when no month is closed", () => {
    expect(earliestWorkDate("2026-10-03", null)).toBe("2026-10-03");
  });

  it("starts the day after the most recently closed month", () => {
    expect(earliestWorkDate("2026-09-02", "2026-09-01")).toBe("2026-10-01");
    expect(earliestWorkDate("2026-10-06", "2026-09-01")).toBe("2026-10-06");
  });
});

describe("monthIsOpen", () => {
  it("locks the closed month and everything before it", () => {
    expect(monthIsOpen("2026-09-30", "2026-09-01")).toBe(false);
    expect(monthIsOpen("2026-10-01", "2026-09-01")).toBe(true);
    expect(monthIsOpen("2026-08-01", null)).toBe(true);
  });
});

describe("clampMonth", () => {
  it("keeps a month inside the viewer's range and falls back otherwise", () => {
    expect(clampMonth("2026-09", "2026-08-01", "2026-10-01")).toBe("2026-09-01");
    expect(clampMonth("2026-07", "2026-08-01", "2026-10-01")).toBe("2026-10-01");
    expect(clampMonth("2026-13", "2026-08-01", "2026-10-01")).toBe("2026-10-01");
    expect(clampMonth(undefined, "2026-10-01", "2026-10-01")).toBe("2026-10-01");
  });
});
