import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative } from "@/lib/dates";

const zone = "Europe/Budapest";

describe("formatDate", () => {
  it("renders the organization's time zone, not UTC", () => {
    expect(formatDateTime("2026-10-06T12:05:00.000Z", zone)).toBe("6 Oct 2026, 14:05");
    expect(formatDate("2026-10-06T22:30:00.000Z", zone)).toBe("7 Oct 2026");
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
