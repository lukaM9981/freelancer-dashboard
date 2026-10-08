import { describe, expect, it } from "vitest";
import { costOfMinutes, costRange, sumEstimates } from "@/lib/proposals/figures";

describe("sumEstimates", () => {
  it("adds the minimums and the maximums separately", () => {
    expect(
      sumEstimates([
        { minMinutes: 240, maxMinutes: 480 },
        { minMinutes: 90, maxMinutes: 135 },
      ]),
    ).toEqual({ minMinutes: 330, maxMinutes: 615 });
    expect(sumEstimates([])).toEqual({ minMinutes: 0, maxMinutes: 0 });
  });
});

describe("costOfMinutes", () => {
  it("prices whole hours exactly", () => {
    expect(costOfMinutes(480, 4500)).toBe(36000);
  });

  it("rounds half a cent up and less than half down", () => {
    // 1 minute at €0.30/h is half a cent.
    expect(costOfMinutes(1, 30)).toBe(1);
    expect(costOfMinutes(1, 29)).toBe(0);
    // 7 minutes at €33.33/h is 388.85 cents.
    expect(costOfMinutes(7, 3333)).toBe(389);
  });

  it("refuses fractional minutes or cents", () => {
    expect(() => costOfMinutes(1.5, 100)).toThrow();
    expect(() => costOfMinutes(60, 10.5)).toThrow();
  });
});

describe("costRange", () => {
  it("prices both ends of the range in the rate's currency", () => {
    expect(costRange({ minMinutes: 240, maxMinutes: 480 }, { cents: 5000, currency: "USD" })).toEqual({
      min: { cents: 20000, currency: "USD" },
      max: { cents: 40000, currency: "USD" },
    });
  });

  it("is null without a rate", () => {
    expect(costRange({ minMinutes: 240, maxMinutes: 480 }, null)).toBeNull();
  });
});
