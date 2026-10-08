import { describe, expect, it } from "vitest";
import {
  formatAge,
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatRelative,
  isoDateInZone,
  monthStartInZone,
  nextMonthStart,
} from "@/lib/dates";

const zone = "Europe/Budapest";

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
