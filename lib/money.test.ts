import { describe, expect, it } from "vitest";
import { formatAmounts, formatMoney, toCents } from "@/lib/money";

describe("toCents", () => {
  it("turns exact decimals into cents", () => {
    expect(toCents("1240.00")).toBe(124000);
    expect(toCents("1240.5")).toBe(124050);
    expect(toCents("0.01")).toBe(1);
    expect(toCents(300)).toBe(30000);
    expect(toCents("-1.25")).toBe(-125);
  });

  it("rejects values that are not exact cents", () => {
    expect(() => toCents("1.234")).toThrow();
    expect(() => toCents("12.3.4")).toThrow();
    expect(() => toCents("€10")).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats euros and dollars without combining them", () => {
    expect(formatMoney(124000, "EUR")).toBe("€1,240.00");
    expect(formatMoney(30000, "USD")).toBe("$300.00");
    expect(
      formatAmounts([
        { cents: 124000, currency: "EUR" },
        { cents: 30000, currency: "USD" },
      ]),
    ).toBe("€1,240.00 · $300.00");
  });

  it("keeps a one-cent amount exact", () => {
    expect(formatMoney(1, "USD")).toBe("$0.01");
    expect(formatMoney(-30000, "EUR")).toBe("-€300.00");
  });
});
