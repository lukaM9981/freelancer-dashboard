import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  dayStartInZone,
  formatAge,
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatMonth,
  formatRelative,
  isoDateInZone,
  monthStartInZone,
  monthStartOf,
  monthStartsBetween,
  nextMonthStart,
  previousMonthStart,
} from "@/lib/dates";

const zone = "Europe/Budapest";

describe("dayStartInZone", () => {
  it("starts the day at local midnight, across daylight saving changes", () => {
    expect(dayStartInZone("2026-10-06", zone)).toBe("2026-10-05T22:00:00.000Z");
    expect(dayStartInZone("2026-11-02", zone)).toBe("2026-11-01T23:00:00.000Z");
    expect(dayStartInZone("2026-10-06", "America/New_York")).toBe("2026-10-06T04:00:00.000Z");
  });

  it("refuses dates that don't exist", () => {
    expect(() => dayStartInZone("2026-02-30", zone)).toThrow();
    expect(() => dayStartInZone("6 Oct 2026", zone)).toThrow();
  });
});

describe("formatDate", () => {
  it("renders the organization's time zone, not UTC", () => {
    expect(formatDateTime("2026-10-06T12:05:00.000Z", zone)).toBe("6 Oct 2026, 14:05");
    expect(formatDate("2026-10-06T22:30:00.000Z", zone)).toBe("7 Oct 2026");
  });
});

describe("isoDateInZone", () => {
  it("uses the organization zone around midnight", () => {
    expect(isoDateInZone(zone, new Date("2026-10-07T22:30:00.000Z"))).toBe("2026-10-08");
    expect(nextMonthStart("2026-09-01")).toBe("2026-10-01");
    expect(nextMonthStart("2026-12-01")).toBe("2027-01-01");
    expect(formatCalendarDate("2026-10-06")).toBe("6 Oct 2026");
  });

  it("starts the month in the organization zone", () => {
    expect(monthStartInZone(zone, new Date("2026-09-30T22:30:00.000Z"))).toBe("2026-10-01");
    expect(monthStartInZone(zone, new Date("2026-10-31T12:00:00.000Z"))).toBe("2026-10-01");
  });

  it("walks calendar months and days without a time zone shift", () => {
    expect(previousMonthStart("2026-01-01")).toBe("2025-12-01");
    expect(monthStartOf("2026-10-08")).toBe("2026-10-01");
    expect(monthStartsBetween("2026-08-01", "2026-10-01")).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
    expect(formatMonth("2026-10-01")).toBe("October 2026");
    expect(addCalendarDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-10-06T14:00:00.000Z");

  it("uses a short label for the same day and yesterday", () => {
    expect(formatRelative("2026-10-06T11:00:00.000Z", zone, now)).toBe("3h ago");
    expect(formatRelative("2026-10-06T13:48:00.000Z", zone, now)).toBe("12m ago");
    expect(formatRelative("2026-10-05T18:00:00.000Z", zone, now)).toBe("yesterday");
    expect(formatRelative("2026-10-01T12:00:00.000Z", zone, now)).toBe("1 Oct 2026");
  });
});

describe("formatAge", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");

  it("counts whole hours, then whole days", () => {
    expect(formatAge("2026-10-08T11:30:00.000Z", now)).toBe("under 1h");
    expect(formatAge("2026-10-08T07:00:00.000Z", now)).toBe("5h");
    expect(formatAge("2026-10-07T11:00:00.000Z", now)).toBe("1 day");
    expect(formatAge("2026-10-05T12:00:00.000Z", now)).toBe("3 days");
  });
});
