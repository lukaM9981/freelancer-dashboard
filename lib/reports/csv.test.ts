import { describe, expect, it } from "vitest";
import {
  allocateCents,
  buildReportCsv,
  decimalHours,
  entryAmounts,
  rateCovering,
  type CsvEntry,
  type CsvLine,
} from "@/lib/reports/csv";

describe("allocateCents", () => {
  it("gives the leftover cent to the larger share", () => {
    expect(allocateCents(100, [30, 60])).toEqual([33, 67]);
    expect(allocateCents(100, [30, 60]).reduce((sum, share) => sum + share, 0)).toBe(100);
  });

  it("breaks a tie toward the earlier entry", () => {
    expect(allocateCents(1, [1, 1])).toEqual([1, 0]);
  });

  it("pays nothing when nothing was counted", () => {
    expect(allocateCents(0, [10, 20])).toEqual([0, 0]);
    expect(allocateCents(500, [0, 0])).toEqual([0, 0]);
  });
});

describe("decimalHours", () => {
  it("keeps two decimal places", () => {
    expect(decimalHours(0)).toBe("0.00");
    expect(decimalHours(1)).toBe("0.02");
    expect(decimalHours(90)).toBe("1.50");
    expect(decimalHours(60)).toBe("1.00");
  });
});

describe("rateCovering", () => {
  const rates = [
    { id: "early", userId: "ana", effectiveFrom: "2026-01-01" },
    { id: "later", userId: "ana", effectiveFrom: "2026-09-15" },
    { id: "other", userId: "mia", effectiveFrom: "2026-01-01" },
  ];

  it("uses the latest rate on or before the work date", () => {
    expect(rateCovering(rates, "ana", "2026-09-14")).toBe("early");
    expect(rateCovering(rates, "ana", "2026-09-15")).toBe("later");
    expect(rateCovering(rates, "ana", "2025-12-31")).toBeNull();
  });
});

describe("buildReportCsv", () => {
  const entries: CsvEntry[] = [
    entry("a", "2026-09-01", 30, 30),
    entry("b", "2026-09-02", 60, 60),
  ];
  const lines: CsvLine[] = [
    {
      userId: "ana",
      taskId: "task",
      rateId: "rate",
      amountCents: 100,
      hourlyRateCents: 4000,
      currency: "EUR",
    },
  ];

  it("makes the entry amounts add up to the report line", () => {
    const amounts = entryAmounts(entries, lines);
    expect(amounts.get("a")).toBe(33);
    expect(amounts.get("b")).toBe(67);

    const csv = buildReportCsv("2026-09", entries, lines);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("0.33");
    expect(csv).toContain("0.67");
    expect(csv).toContain("40.00");
    expect(csv).toContain("EUR");
  });

  it("quotes a description that contains a comma or a quote", () => {
    const csv = buildReportCsv("2026-09", [{ ...entries[0], description: 'Say "hi", then stop' }], lines);
    expect(csv).toContain('"Say ""hi"", then stop"');
  });
});

function entry(id: string, workDate: string, duration: number, counted: number): CsvEntry {
  return {
    id,
    userId: "ana",
    freelancer: "Ana",
    project: "Site",
    task: "Homepage",
    taskId: "task",
    workDate,
    startTime: "",
    endTime: "",
    source: "manual",
    description: "Copy",
    durationMinutes: duration,
    countedMinutes: counted,
    overLimitMinutes: 0,
    rateId: "rate",
  };
}
