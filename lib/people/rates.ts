import { toCents, type Currency } from "@/lib/money";

export type RateRecord = {
  id: string;
  hourlyRate: string | number;
  currency: string;
  effectiveFrom: string;
};

export type DisplayRate = {
  id: string;
  cents: number;
  currency: Currency;
  effectiveFrom: string;
};

const MAX_CENTS = 9_999_999_999;

export function parseRateAmount(amount: string): number {
  const cents = toCents(amount.trim());
  if (cents <= 0 || cents > MAX_CENTS) {
    throw new Error("Enter an amount from 0.01 to 99,999,999.99.");
  }
  return cents;
}

/** Canonical decimal for the numeric column, with no binary rounding. */
export function rateDecimal(amount: string): string {
  const cents = parseRateAmount(amount);
  const major = Math.trunc(cents / 100);
  const minor = cents % 100;
  return `${major}.${String(minor).padStart(2, "0")}`;
}

export function toDisplayRate(record: RateRecord): DisplayRate {
  if (record.currency !== "EUR" && record.currency !== "USD") {
    throw new Error("A rate is in EUR or USD.");
  }
  return {
    id: record.id,
    cents: toCents(record.hourlyRate),
    currency: record.currency,
    effectiveFrom: record.effectiveFrom,
  };
}

/** The rate in effect on `today` (`yyyy-MM-dd`): the latest start date that is not in the future. */
export function currentRate(rates: readonly DisplayRate[], today: string): DisplayRate | null {
  return (
    rates
      .filter((rate) => rate.effectiveFrom <= today)
      .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : a.effectiveFrom > b.effectiveFrom ? -1 : 0))[0] ??
    null
  );
}

export function isFutureRate(effectiveFrom: string, today: string): boolean {
  return effectiveFrom > today;
}
