/**
 * Durations are whole minutes everywhere (PRD §8 rule 11, Tech.md §7.7).
 * A bare number is hours: "10" is 10h, "10:30" is 10h 30m, "1.5" is 1.5 hours.
 */

/** Turns a typed duration into whole minutes, or null when it can't be read. */
export function parseDuration(input: string): number | null {
  const text = input.trim();
  if (!text) return null;

  const clock = text.match(/^(\d+):(\d{1,2})$/);
  if (clock) {
    const minutes = Number(clock[2]);
    if (minutes >= 60) return null;
    return wholeMinutes(Number(clock[1]) * 60 + minutes);
  }

  const hoursAndMinutes = text.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);
  if (hoursAndMinutes && (hoursAndMinutes[1] != null || hoursAndMinutes[2] != null)) {
    return wholeMinutes(Number(hoursAndMinutes[1] ?? 0) * 60 + Number(hoursAndMinutes[2] ?? 0));
  }

  const decimalHours = text.match(/^(\d+(?:\.\d+)?)(?:\s*h)?$/i);
  if (decimalHours) return hoursToMinutes(decimalHours[1]);

  return null;
}

/** "8h 48m", "45m", "12h", "0m". Zero parts are omitted. */
export function formatDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("A duration must be a whole number of minutes.");
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

/** Nearest step. 1h 20m on a 15-minute step becomes 1h 15m. */
export function snapMinutes(minutes: number, step: number): number {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("A duration must be a whole number of minutes.");
  }
  if (!Number.isInteger(step) || step <= 0) {
    throw new Error("A step must be a positive whole number of minutes.");
  }
  return Math.round(minutes / step) * step;
}

function wholeMinutes(minutes: number): number | null {
  if (!Number.isSafeInteger(minutes) || minutes < 0) return null;
  return minutes;
}

/** Decimal hours ("1.5", "1.25") become whole minutes, or null when they don't land on one. */
function hoursToMinutes(text: string): number | null {
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > 4) return null;
  const scale = 10 ** fraction.length;
  const scaled = Number(whole) * scale + (fraction === "" ? 0 : Number(fraction));
  if (!Number.isSafeInteger(scaled)) return null;
  if ((scaled * 60) % scale !== 0) return null;
  return wholeMinutes((scaled * 60) / scale);
}
