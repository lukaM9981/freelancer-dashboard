import type { Currency, Money } from "@/lib/money";

export type EstimateRange = { minMinutes: number; maxMinutes: number };

export type CostRange = { min: Money; max: Money };

export function sumEstimates(items: readonly EstimateRange[]): EstimateRange {
  let minMinutes = 0;
  let maxMinutes = 0;
  for (const item of items) {
    minMinutes += item.minMinutes;
    maxMinutes += item.maxMinutes;
  }
  return { minMinutes, maxMinutes };
}

/** Minutes priced at an hourly rate in cents, rounded half up to whole cents, in integers only. */
export function costOfMinutes(minutes: number, hourlyCents: number): number {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("A duration must be a whole number of minutes.");
  }
  if (!Number.isInteger(hourlyCents) || hourlyCents < 0) {
    throw new Error("A rate must be whole cents.");
  }
  const product = minutes * hourlyCents;
  if (!Number.isSafeInteger(product)) {
    throw new Error("This amount is too large to calculate exactly.");
  }
  const remainder = product % 60;
  return (product - remainder) / 60 + (remainder >= 30 ? 1 : 0);
}

/**
 * What an estimate range costs at the freelancer's current rate (PRD §5.3). Null when they
 * have no rate yet.
 */
export function costRange(
  range: EstimateRange,
  rate: { cents: number; currency: Currency } | null,
): CostRange | null {
  if (!rate) return null;
  return {
    min: { cents: costOfMinutes(range.minMinutes, rate.cents), currency: rate.currency },
    max: { cents: costOfMinutes(range.maxMinutes, rate.cents), currency: rate.currency },
  };
}
