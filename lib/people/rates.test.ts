import { describe, expect, it } from "vitest";
import { currentRate, isFutureRate, rateDecimal, type DisplayRate } from "@/lib/people/rates";

const rates: DisplayRate[] = [
  { id: "a", cents: 4500, currency: "EUR", effectiveFrom: "2026-01-01" },
  { id: "b", cents: 5000, currency: "EUR", effectiveFrom: "2026-06-01" },
  { id: "c", cents: 5500, currency: "USD", effectiveFrom: "2026-12-01" },
];

describe("currentRate", () => {
  it("uses the latest rate that has already started", () => {
    expect(currentRate(rates, "2026-06-01")?.id).toBe("b");
    expect(currentRate(rates, "2026-03-01")?.id).toBe("a");
    expect(currentRate(rates, "2025-12-31")).toBeNull();
  });

  it("leaves a future rate out of the current one", () => {
    expect(currentRate(rates, "2026-11-30")?.id).toBe("b");
    expect(isFutureRate("2026-12-01", "2026-11-30")).toBe(true);
    expect(isFutureRate("2026-06-01", "2026-06-01")).toBe(false);
  });
});

describe("rateDecimal", () => {
  it("keeps cents exact", () => {
    expect(rateDecimal("45")).toBe("45.00");
    expect(rateDecimal("45.5")).toBe("45.50");
    expect(rateDecimal("0.01")).toBe("0.01");
  });
});
