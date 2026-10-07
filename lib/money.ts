/**
 * Money is exact cents. TypeScript formats it and never adds two currencies
 * (PRD §8 rule 14, Tech.md §7.7).
 */

export type Currency = "EUR" | "USD";

export type Money = {
  cents: number;
  currency: Currency;
};

/** Numeric values from PostgREST ("1240.00" or 1240) become integer cents. */
export function toCents(amount: string | number): number {
  const text = typeof amount === "number" ? String(amount) : amount.trim();
  const match = text.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error("An amount must be a decimal with at most two places.");
  }
  const fraction = match[3] ?? "";
  if (fraction.length > 2) {
    throw new Error("An amount must be a decimal with at most two places.");
  }
  const cents = Number(match[2]) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) {
    throw new Error("An amount is too large to store as cents.");
  }
  return match[1] === "-" ? -cents : cents;
}

/** "€1,240.00" or "$300.00". */
export function formatMoney(cents: number, currency: Currency): string {
  if (!Number.isInteger(cents)) {
    throw new Error("Money must be whole cents.");
  }
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const major = Math.trunc(absolute / 100);
  const minor = absolute % 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(`${major}.${String(minor).padStart(2, "0")}`));
  return negative ? negate(formatted) : formatted;
}

/**
 * One value per currency, joined for display. This does not add them:
 * €1,240.00 and $300.00 stay "€1,240.00 · $300.00".
 */
export function formatAmounts(amounts: readonly Money[]): string {
  return amounts.map((amount) => formatMoney(amount.cents, amount.currency)).join(" · ");
}

function negate(formatted: string): string {
  if (formatted.startsWith("-")) return formatted;
  return `-${formatted}`;
}
