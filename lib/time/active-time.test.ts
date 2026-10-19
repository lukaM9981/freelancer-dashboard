import { describe, expect, it } from "vitest";
import { activeMilliseconds } from "@/lib/time/active-time";

describe("activeMilliseconds", () => {
  it("returns the closed segments while the timer is paused", () => {
    expect(activeMilliseconds({ accumulatedMs: 90_000, segmentStartedAt: null, now: 1_000_000 })).toBe(90_000);
  });

  it("adds the open segment and ignores a clock behind its start", () => {
    expect(
      activeMilliseconds({
        accumulatedMs: 60_000,
        segmentStartedAt: new Date(500_000).toISOString(),
        now: 530_000,
      }),
    ).toBe(90_000);
    expect(
      activeMilliseconds({
        accumulatedMs: 60_000,
        segmentStartedAt: new Date(500_000).toISOString(),
        now: 400_000,
      }),
    ).toBe(60_000);
  });
});
