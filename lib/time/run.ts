import { TZDate, tz } from "@date-fns/tz";
import { addDays, format, startOfDay, startOfMinute } from "date-fns";
import { addCalendarDays } from "@/lib/dates";

/** A run past this shows the warning and asks to confirm the end (PRD §6.8). */
export const LONG_RUN_MS = 10 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;

export type RunSegment = { workDate: string; start: Date; end: Date; minutes: number };

/**
 * The entries a timer run becomes, one per organization-local day, as `app.save_timer`
 * saves them (DB.md §5.4): split at every local midnight, a stretch under a minute is
 * dropped, the rest rounded to the nearest minute.
 */
export function splitRun(start: Date, end: Date, timeZone: string): RunSegment[] {
  const zone = tz(timeZone);
  const segments: RunSegment[] = [];
  let dayStart = startOfDay(start, { in: zone });
  while (dayStart.getTime() < end.getTime()) {
    const nextDay = addDays(dayStart, 1, { in: zone });
    const segStart = Math.max(start.getTime(), dayStart.getTime());
    const segEnd = Math.min(end.getTime(), nextDay.getTime());
    if (segEnd - segStart >= MINUTE_MS) {
      segments.push({
        workDate: format(dayStart, "yyyy-MM-dd", { in: zone }),
        start: new Date(segStart),
        end: new Date(segEnd),
        minutes: Math.round((segEnd - segStart) / MINUTE_MS),
      });
    }
    dayStart = nextDay;
  }
  return segments;
}

/** The `yyyy-MM-dd` and `HH:mm` a moment shows in a time zone, for date and time inputs. */
export function localParts(moment: Date, timeZone: string): { date: string; time: string } {
  const zone = tz(timeZone);
  return { date: format(moment, "yyyy-MM-dd", { in: zone }), time: format(moment, "HH:mm", { in: zone }) };
}

/** The moment a local `yyyy-MM-dd` date and `HH:mm` time name in a time zone, or null. */
export function zonedMoment(date: string, time: string, timeZone: string): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!day || !clock) return null;
  const [year, month, dayOfMonth, hours, minutes] = [day[1], day[2], day[3], clock[1], clock[2]].map(Number);
  if (hours > 23 || minutes > 59) return null;
  const moment = new TZDate(year, month - 1, dayOfMonth, hours, minutes, 0, timeZone);
  if (Number.isNaN(moment.getTime())) return null;
  const parts = localParts(moment, timeZone);
  // Rejects dates that roll over, such as 31 September.
  return parts.date === date ? new Date(moment.getTime()) : null;
}

export type RunFields = { startDate: string; startTime: string; endDate: string; endTime: string };

export type ResolvedRun =
  | { ok: true; start: Date; end: Date }
  | { ok: false; field: keyof RunFields; message: string };

/**
 * Turns the review dialog's fields into the run to save. The run can be shortened but never
 * extended (PRD §6.8): a start before the real start or an end after the stop is refused.
 * Fields the person left alone keep the exact real moment, seconds included.
 */
export function resolveRun(
  fields: RunFields,
  run: { startedAt: Date; stoppedAt: Date; timeZone: string },
): ResolvedRun {
  const initialStart = localParts(run.startedAt, run.timeZone);
  const initialEnd = localParts(run.stoppedAt, run.timeZone);

  let start: Date;
  if (fields.startDate === initialStart.date && fields.startTime === initialStart.time) {
    start = run.startedAt;
  } else {
    const parsed = zonedMoment(fields.startDate, fields.startTime, run.timeZone);
    if (!parsed) return { ok: false, field: "startTime", message: "Enter a valid start time." };
    if (parsed.getTime() < startOfMinute(run.startedAt).getTime()) {
      return {
        ok: false,
        field: "startTime",
        message: `The timer started at ${initialStart.time}. Add earlier work as a manual entry.`,
      };
    }
    start = parsed.getTime() < run.startedAt.getTime() ? run.startedAt : parsed;
  }

  let end: Date;
  if (fields.endDate === initialEnd.date && fields.endTime === initialEnd.time) {
    end = run.stoppedAt;
  } else {
    const parsed = zonedMoment(fields.endDate, fields.endTime, run.timeZone);
    if (!parsed) return { ok: false, field: "endTime", message: "Enter a valid end time." };
    if (parsed.getTime() > run.stoppedAt.getTime()) {
      return { ok: false, field: "endTime", message: `The timer stopped at ${initialEnd.time}. The end can't be later.` };
    }
    end = parsed;
  }

  if (end.getTime() <= start.getTime()) {
    return { ok: false, field: "endTime", message: "The end must be after the start." };
  }
  return { ok: true, start, end };
}

export type EntryEditFields = {
  workDate: string;
  startTime: string;
  endTime: string;
  endsAtMidnight: boolean;
};

export type ResolvedEntry =
  | { ok: true; startedAt: string; endedAt: string; minutes: number }
  | { ok: false; field: "workDate" | "startTime" | "endTime"; message: string };

/**
 * The start and end saved when a timed entry is edited. Start and end stay on one
 * organization-local day (DB.md §6.4). Fields left alone keep the stored timestamp,
 * seconds included, so opening the dialog and saving does not move the entry.
 */
export function resolveEntryEdit(
  fields: EntryEditFields,
  original: { startedAt: string; endedAt: string },
  timeZone: string,
): ResolvedEntry {
  const originalStart = new Date(original.startedAt);
  const originalEnd = new Date(original.endedAt);
  if (Number.isNaN(originalStart.getTime()) || Number.isNaN(originalEnd.getTime())) {
    return { ok: false, field: "startTime", message: "Enter a valid start time." };
  }

  const initialStart = localParts(originalStart, timeZone);
  const initialEnd = localParts(originalEnd, timeZone);
  const endedAtMidnight = initialEnd.time === "00:00" && initialEnd.date !== initialStart.date;
  const startUnchanged = fields.workDate === initialStart.date && fields.startTime === initialStart.time;
  const endUnchanged =
    fields.workDate === initialStart.date &&
    (fields.endsAtMidnight
      ? endedAtMidnight
      : !endedAtMidnight && initialEnd.date === initialStart.date && fields.endTime === initialEnd.time);

  let startedAt: string;
  if (startUnchanged) {
    startedAt = original.startedAt;
  } else {
    const start = zonedMoment(fields.workDate, fields.startTime, timeZone);
    if (!start) return { ok: false, field: "startTime", message: "Enter a valid start time." };
    startedAt = start.toISOString();
  }

  let endedAt: string;
  if (startUnchanged && endUnchanged) {
    endedAt = original.endedAt;
  } else if (fields.endsAtMidnight) {
    const end = zonedMoment(addCalendarDays(fields.workDate, 1), "00:00", timeZone);
    if (!end) return { ok: false, field: "endTime", message: "Enter a valid end time." };
    endedAt = end.toISOString();
  } else {
    const end = zonedMoment(fields.workDate, fields.endTime, timeZone);
    if (!end) return { ok: false, field: "endTime", message: "Enter a valid end time." };
    endedAt = end.toISOString();
  }

  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (!(endMs > startMs)) {
    return { ok: false, field: "endTime", message: "The end must be after the start." };
  }

  const startDate = localParts(new Date(startMs), timeZone).date;
  const endDate = localParts(new Date(endMs - 1), timeZone).date;
  if (startDate !== fields.workDate || endDate !== fields.workDate) {
    return { ok: false, field: "endTime", message: "A timed entry has to stay within one day." };
  }

  const minutes = Math.round((endMs - startMs) / 60_000);
  if (minutes < 1) return { ok: false, field: "endTime", message: "Enter at least 1 minute." };
  if (minutes > 1500) return { ok: false, field: "endTime", message: "A timed entry has to stay within one day." };
  return { ok: true, startedAt, endedAt, minutes };
}

/** Clock range for a timed entry, in the organization's time zone. An end at the next midnight reads "23:30–midnight". */
export function formatEntryClock(startedAt: string, endedAt: string, timeZone: string): string {
  const start = localParts(new Date(startedAt), timeZone);
  const end = localParts(new Date(endedAt), timeZone);
  if (end.time === "00:00" && end.date !== start.date) return `${start.time}\u2013midnight`;
  return `${start.time}\u2013${end.time}`;
}

/** Fields for the timed-entry dialog, read from the stored timestamps. */
export function entryEditDefaults(
  startedAt: string,
  endedAt: string,
  timeZone: string,
): EntryEditFields {
  const start = localParts(new Date(startedAt), timeZone);
  const end = localParts(new Date(endedAt), timeZone);
  const endsAtMidnight = end.time === "00:00" && end.date !== start.date;
  return {
    workDate: start.date,
    startTime: start.time,
    endTime: endsAtMidnight ? "23:59" : end.time,
    endsAtMidnight,
  };
}

/**
 * The range sent to `stop_timer`. The database keeps microseconds and a JavaScript date only
 * milliseconds, so an unchanged start is sent as the database's own value; otherwise it
 * would land a fraction before the real start and count as extending the run. The end is
 * rounded down to the second so a browser clock slightly ahead never puts it in the future.
 */
export function stopRange(range: { start: Date; end: Date }, realStartedAt: string): { startedAt: string; endedAt: string } {
  const startedAt =
    range.start.getTime() <= Date.parse(realStartedAt) ? realStartedAt : range.start.toISOString();
  const endedAt = new Date(Math.floor(range.end.getTime() / 1000) * 1000).toISOString();
  return { startedAt, endedAt };
}
