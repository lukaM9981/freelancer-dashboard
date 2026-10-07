import { describe, expect, it } from "vitest";
import { formatDuration, parseDuration, snapMinutes } from "@/lib/duration";
import { formatEstimateRange, formatPercent, formatTimer } from "@/lib/format";

describe("parseDuration", () => {
  it.each([
    ["1:30", 90],
    ["10:30", 630],
    ["1:5", 65],
    ["1h 30m", 90],
    ["1h30m", 90],
    ["1H 30M", 90],
    ["90m", 90],
    ["2h", 120],
    ["1.5", 90],
    ["1.5h", 90],
    ["1.25", 75],
    ["10", 600],
    ["2", 120],
    ["0", 0],
    ["0m", 0],
  ])("reads %s as %i minutes", (input, minutes) => {
    expect(parseDuration(input)).toBe(minutes);
  });

  it.each(["", "   ", "1:60", "abc", "1h 30", "-1", "1.333"])("rejects %s", (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0m"],
    [45, "45m"],
    [60, "1h"],
    [720, "12h"],
    [528, "8h 48m"],
  ])("formats %i minutes as %s", (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label);
  });
});

describe("snapMinutes", () => {
  it("snaps to the nearest 15 minutes", () => {
    expect(snapMinutes(80, 15)).toBe(75);
    expect(snapMinutes(8, 15)).toBe(15);
    expect(snapMinutes(7, 15)).toBe(0);
    expect(snapMinutes(90, 15)).toBe(90);
  });
});

describe("format helpers", () => {
  it("formats an estimate range with an en dash", () => {
    expect(formatEstimateRange(240, 480)).toBe("4–8 h");
    expect(formatEstimateRange(150, 225)).toBe("2.5–3.75 h");
  });

  it("formats a timer clock and a percent", () => {
    expect(formatTimer(5025)).toBe("01:23:45");
    expect(formatPercent(80)).toBe("80%");
  });
});
