import { describe, expect, it } from "vitest";
import { eventTypesFor } from "@/lib/audit/events";
import { auditHref, NO_FILTERS, parseAuditFilters, rangeIsInverted, shownCount } from "@/lib/audit/filters";

const ANA = "0b6c2f4e-9d1a-4c3b-8e7f-1a2b3c4d5e6f";

describe("parseAuditFilters", () => {
  it("keeps valid values", () => {
    expect(
      parseAuditFilters({ person: ANA, project: ANA.toUpperCase(), type: "time", from: "2026-10-01", to: "2026-10-31" }),
    ).toEqual({ person: ANA, project: ANA, type: "time", from: "2026-10-01", to: "2026-10-31" });
  });

  it("drops malformed and unknown values", () => {
    expect(
      parseAuditFilters({ person: "ana", project: "1,2", type: "task.nope", from: "2026-02-30", to: "yesterday" }),
    ).toEqual(NO_FILTERS);
    expect(parseAuditFilters({ person: [ANA, "x"], type: "" })).toEqual({ ...NO_FILTERS, person: ANA });
  });

  it("spots an inverted range", () => {
    expect(rangeIsInverted({ ...NO_FILTERS, from: "2026-10-02", to: "2026-10-01" })).toBe(true);
    expect(rangeIsInverted({ ...NO_FILTERS, from: "2026-10-01", to: "2026-10-01" })).toBe(false);
  });
});

describe("eventTypesFor", () => {
  it("expands a group and passes one type through", () => {
    expect(eventTypesFor("months")).toEqual(["month.closed", "month.reopened"]);
    expect(eventTypesFor("rate.added")).toEqual(["rate.added"]);
    expect(eventTypesFor("rates")).toBeNull();
  });
});

describe("auditHref", () => {
  it("writes only the filters that are set", () => {
    expect(auditHref(NO_FILTERS)).toBe("/audit");
    expect(auditHref({ ...NO_FILTERS, type: "time", from: "2026-10-01" }, 100)).toBe(
      "/audit?type=time&from=2026-10-01&show=100",
    );
    expect(auditHref({ ...NO_FILTERS, person: ANA }, 50)).toBe(`/audit?person=${ANA}`);
  });
});

describe("shownCount", () => {
  it("rounds to whole pages within the limit", () => {
    expect(shownCount(undefined)).toBe(50);
    expect(shownCount("120")).toBe(150);
    expect(shownCount("9999")).toBe(500);
    expect(shownCount("-5")).toBe(50);
  });
});
