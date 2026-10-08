import { describe, expect, it } from "vitest";
import {
  entryEditDefaults,
  formatEntryClock,
  localParts,
  resolveEntryEdit,
  resolveRun,
  splitRun,
  stopRange,
  zonedMoment,
} from "@/lib/time/run";

const zone = "Europe/Budapest";

describe("splitRun", () => {
  it("keeps a run inside one day as one entry, rounded to the minute", () => {
    const segments = splitRun(new Date("2026-10-08T08:00:10.000Z"), new Date("2026-10-08T09:30:40.000Z"), zone);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ workDate: "2026-10-08", minutes: 91 });
  });

  it("splits at the organization's midnight, not UTC's", () => {
    // 23:00 on 7 Oct to 01:30 on 8 Oct in Budapest (UTC+2).
    const segments = splitRun(new Date("2026-10-07T21:00:00.000Z"), new Date("2026-10-07T23:30:00.000Z"), zone);
    expect(segments.map((segment) => [segment.workDate, segment.minutes])).toEqual([
      ["2026-10-07", 60],
      ["2026-10-08", 90],
    ]);
  });

  it("handles the 25-hour day when daylight saving ends (DB.md §5.4)", () => {
    // 23:00 on 24 Oct (UTC+2) to 04:00 on 25 Oct (UTC+1).
    const segments = splitRun(new Date("2026-10-24T21:00:00.000Z"), new Date("2026-10-25T03:00:00.000Z"), zone);
    expect(segments.map((segment) => [segment.workDate, segment.minutes])).toEqual([
      ["2026-10-24", 60],
      ["2026-10-25", 300],
    ]);
  });

  it("drops a stretch under a minute", () => {
    expect(splitRun(new Date("2026-10-08T08:00:00.000Z"), new Date("2026-10-08T08:00:59.000Z"), zone)).toEqual([]);
    // 30 seconds before midnight are dropped; the rest of the run is kept.
    const segments = splitRun(new Date("2026-10-07T21:59:30.000Z"), new Date("2026-10-07T22:45:00.000Z"), zone);
    expect(segments.map((segment) => [segment.workDate, segment.minutes])).toEqual([["2026-10-08", 45]]);
  });
});

describe("zonedMoment", () => {
  it("reads a local date and time in the organization zone", () => {
    expect(zonedMoment("2026-10-08", "14:05", zone)?.toISOString()).toBe("2026-10-08T12:05:00.000Z");
    expect(localParts(new Date("2026-10-08T22:30:00.000Z"), zone)).toEqual({ date: "2026-10-09", time: "00:30" });
  });

  it("refuses values that aren't a real date or time", () => {
    expect(zonedMoment("2026-09-31", "10:00", zone)).toBeNull();
    expect(zonedMoment("2026-10-08", "24:00", zone)).toBeNull();
    expect(zonedMoment("", "10:00", zone)).toBeNull();
  });
});

describe("resolveRun", () => {
  const run = {
    startedAt: new Date("2026-10-08T08:00:30.000Z"), // 10:00:30 local
    stoppedAt: new Date("2026-10-08T10:15:45.000Z"), // 12:15:45 local
    timeZone: zone,
  };
  const untouched = { startDate: "2026-10-08", startTime: "10:00", endDate: "2026-10-08", endTime: "12:15" };

  it("keeps the exact real moments for fields left alone", () => {
    expect(resolveRun(untouched, run)).toEqual({ ok: true, start: run.startedAt, end: run.stoppedAt });
  });

  it("allows a later start and an earlier end", () => {
    const result = resolveRun({ ...untouched, startTime: "10:30", endTime: "12:00" }, run);
    expect(result).toEqual({
      ok: true,
      start: new Date("2026-10-08T08:30:00.000Z"),
      end: new Date("2026-10-08T10:00:00.000Z"),
    });
  });

  it("refuses to extend the run", () => {
    expect(resolveRun({ ...untouched, startTime: "09:59" }, run)).toMatchObject({ ok: false, field: "startTime" });
    expect(resolveRun({ ...untouched, endTime: "12:16" }, run)).toMatchObject({ ok: false, field: "endTime" });
  });

  it("treats a retyped start minute as the real start", () => {
    const result = resolveRun({ ...untouched, startDate: "2026-10-08", startTime: "10:00", endTime: "11:00" }, run);
    expect(result).toMatchObject({ ok: true, start: run.startedAt });
  });

  it("sends an unchanged start with the database's microseconds", () => {
    const realStartedAt = "2026-10-08T15:48:12.345678+00:00";
    const startedAt = new Date(realStartedAt);
    const stoppedAt = new Date("2026-10-08T15:55:40.987Z");
    const range = resolveRun(
      { startDate: "2026-10-08", startTime: "17:48", endDate: "2026-10-08", endTime: "17:55" },
      { startedAt, stoppedAt, timeZone: zone },
    );
    expect(range.ok).toBe(true);
    if (!range.ok) return;
    expect(stopRange(range, realStartedAt)).toEqual({
      startedAt: realStartedAt,
      endedAt: "2026-10-08T15:55:40.000Z",
    });
  });

  it("sends a changed start as it was entered", () => {
    const range = { start: new Date("2026-10-08T16:00:00.000Z"), end: new Date("2026-10-08T16:30:00.000Z") };
    expect(stopRange(range, "2026-10-08T15:48:12.345678+00:00").startedAt).toBe("2026-10-08T16:00:00.000Z");
  });

  it("needs the end after the start", () => {
    expect(resolveRun({ ...untouched, startTime: "11:00", endTime: "11:00" }, run)).toMatchObject({
      ok: false,
      field: "endTime",
    });
  });
});

describe("resolveEntryEdit", () => {
  function at(date: string, time: string): string {
    const moment = zonedMoment(date, time, zone);
    if (!moment) throw new Error("Expected a valid moment.");
    return moment.toISOString();
  }

  const startedAt = at("2026-10-08", "14:05");
  const endedAt = at("2026-10-08", "15:30");
  const original = { startedAt, endedAt };

  it("keeps the stored timestamps when the clock is left alone", () => {
    const resolved = resolveEntryEdit(entryEditDefaults(startedAt, endedAt, zone), original, zone);
    expect(resolved).toEqual({ ok: true, startedAt, endedAt, minutes: 85 });
  });

  it("keeps an end at midnight, and can end earlier the same day", () => {
    const start = at("2026-10-08", "23:30");
    const end = at("2026-10-09", "00:00");
    const fields = entryEditDefaults(start, end, zone);
    expect(fields.endsAtMidnight).toBe(true);
    expect(formatEntryClock(start, end, zone)).toBe("23:30\u2013midnight");
    expect(resolveEntryEdit(fields, { startedAt: start, endedAt: end }, zone)).toMatchObject({
      ok: true,
      startedAt: start,
      endedAt: end,
      minutes: 30,
    });
    expect(
      resolveEntryEdit({ ...fields, endsAtMidnight: false, endTime: "23:45" }, { startedAt: start, endedAt: end }, zone),
    ).toMatchObject({ ok: true, minutes: 15 });
  });

  it("refuses an end that is not after the start", () => {
    const fields = entryEditDefaults(startedAt, endedAt, zone);
    expect(resolveEntryEdit({ ...fields, endTime: "14:05" }, original, zone)).toMatchObject({
      ok: false,
      field: "endTime",
    });
  });
});
