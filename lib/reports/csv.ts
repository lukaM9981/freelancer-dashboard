/**
 * Monthly CSV (PRD §6.10, Tech.md §11). Amounts are integer cents. Each report
 * line's amount is split across its time entries by the largest-remainder method,
 * so the rows add up to the figure on the screen and in a closed month.
 */

import type { Currency } from "@/lib/money";

export const CSV_HEADERS = [
  "Month",
  "Freelancer",
  "Project",
  "Task",
  "Work date",
  "Start time",
  "End time",
  "Source",
  "Description",
  "Duration (minutes)",
  "Duration (hours)",
  "Counted (minutes)",
  "Counted (hours)",
  "Over limit (minutes)",
  "Over limit (hours)",
  "Rate",
  "Currency",
  "Amount",
] as const;

export type CsvEntry = {
  id: string;
  userId: string;
  freelancer: string;
  project: string;
  task: string;
  taskId: string;
  /** `yyyy-MM-dd` */
  workDate: string;
  /** `HH:mm` for a timed entry, otherwise empty. */
  startTime: string;
  endTime: string;
  source: "timer" | "manual";
  description: string;
  durationMinutes: number;
  countedMinutes: number;
  overLimitMinutes: number;
  /** Rate in effect on the work date, or null when none covers it. */
  rateId: string | null;
};

export type CsvLine = {
  userId: string;
  taskId: string;
  rateId: string | null;
  amountCents: number;
  hourlyRateCents: number | null;
  currency: Currency | null;
};

export type RateSpan = {
  id: string;
  userId: string;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
};

/** The rate `report_lines` uses: latest `effective_from` on or before the work date. */
export function rateCovering(rates: readonly RateSpan[], userId: string, workDate: string): string | null {
  let match: RateSpan | null = null;
  for (const rate of rates) {
    if (rate.userId !== userId || rate.effectiveFrom > workDate) continue;
    if (match == null || rate.effectiveFrom > match.effectiveFrom) match = rate;
  }
  return match?.id ?? null;
}

/**
 * Splits `totalCents` across `weights` so the shares are whole cents and sum to the
 * total. Ties go to the earlier weight.
 */
export function allocateCents(totalCents: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("An amount is a whole number of cents.");
  }
  if (weights.some((weight) => !Number.isInteger(weight) || weight < 0)) {
    throw new Error("A weight is a whole number of minutes.");
  }
  const shares = weights.map(() => 0);
  if (shares.length === 0 || totalCents === 0) return shares;
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return shares;

  const fractions: { index: number; remainder: number }[] = [];
  let allocated = 0;
  for (let index = 0; index < weights.length; index++) {
    const product = totalCents * weights[index];
    if (!Number.isSafeInteger(product)) {
      throw new Error("An amount is too large to split into cents.");
    }
    const share = Math.floor(product / totalWeight);
    shares[index] = share;
    allocated += share;
    fractions.push({ index, remainder: product % totalWeight });
  }

  fractions.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  let left = totalCents - allocated;
  for (let index = 0; left > 0; index++) {
    shares[fractions[index].index] += 1;
    left -= 1;
  }
  return shares;
}

/** Decimal hours for the CSV, always two places. `90` → `"1.50"`. */
export function decimalHours(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("A duration must be a whole number of minutes.");
  }
  const numerator = minutes * 5;
  const hundredths = Math.floor(numerator / 3) + (numerator % 3 >= 2 ? 1 : 0);
  const whole = Math.trunc(hundredths / 100);
  const fraction = hundredths % 100;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

/** `"60.00"` from cents, with no currency symbol. */
export function decimalAmount(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("Money must be whole cents.");
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const text = `${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

function lineKey(userId: string, taskId: string, rateId: string | null): string {
  return `${userId}\0${taskId}\0${rateId ?? ""}`;
}

/** Cents for each entry, allocated from the report line the entry belongs to. */
export function entryAmounts(entries: readonly CsvEntry[], lines: readonly CsvLine[]): Map<string, number> {
  const groups = new Map<string, CsvEntry[]>();
  for (const entry of entries) {
    const key = lineKey(entry.userId, entry.taskId, entry.rateId);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }

  const amounts = new Map<string, number>();
  for (const line of lines) {
    const group = (groups.get(lineKey(line.userId, line.taskId, line.rateId)) ?? [])
      .slice()
      .sort((a, b) => a.workDate.localeCompare(b.workDate) || a.id.localeCompare(b.id));
    const shares = allocateCents(
      line.amountCents,
      group.map((entry) => entry.countedMinutes),
    );
    group.forEach((entry, index) => amounts.set(entry.id, shares[index] ?? 0));
  }
  return amounts;
}

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

/**
 * UTF-8 CSV with a byte-order mark so Excel reads č, ć, đ, š, ž (Tech.md §11).
 * `month` is `yyyy-MM`.
 */
export function buildReportCsv(month: string, entries: readonly CsvEntry[], lines: readonly CsvLine[]): string {
  const amounts = entryAmounts(entries, lines);
  const priced = new Map(lines.map((line) => [lineKey(line.userId, line.taskId, line.rateId), line]));
  const rows = entries
    .slice()
    .sort(
      (a, b) =>
        a.freelancer.localeCompare(b.freelancer) ||
        a.workDate.localeCompare(b.workDate) ||
        a.project.localeCompare(b.project) ||
        a.task.localeCompare(b.task) ||
        a.id.localeCompare(b.id),
    )
    .map((entry) => {
      const line = priced.get(lineKey(entry.userId, entry.taskId, entry.rateId));
      const cents = amounts.get(entry.id) ?? 0;
      return [
        month,
        entry.freelancer,
        entry.project,
        entry.task,
        entry.workDate,
        entry.startTime,
        entry.endTime,
        entry.source,
        entry.description,
        String(entry.durationMinutes),
        decimalHours(entry.durationMinutes),
        String(entry.countedMinutes),
        decimalHours(entry.countedMinutes),
        String(entry.overLimitMinutes),
        decimalHours(entry.overLimitMinutes),
        line?.hourlyRateCents == null ? "" : decimalAmount(line.hourlyRateCents),
        line?.currency ?? "",
        decimalAmount(cents),
      ];
    });

  const body = [CSV_HEADERS, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  return `\uFEFF${body}\r\n`;
}
