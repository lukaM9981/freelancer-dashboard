import { describe, expect, it } from "vitest";
import { composeEmail, type EmailContext, type EmailEvent } from "@/lib/email/templates/content";

const context = (overrides: Partial<EmailContext> = {}): EmailContext => ({
  actorName: "Olga",
  taskTitles: new Map([
    ["t1", "Homepage"],
    ["t2", "Pricing page"],
  ]),
  projectNames: new Map([["p1", "Website"]]),
  monthTotals: null,
  url: (path) => `https://workboard.test${path}`,
  ...overrides,
});

const event = (overrides: Partial<EmailEvent>): EmailEvent => ({
  type: "task.held",
  data: {},
  taskId: "t1",
  projectId: "p1",
  entityId: null,
  ...overrides,
});

describe("composeEmail", () => {
  it("lists every decision of one action in one email", () => {
    const content = composeEmail(
      [
        event({ type: "estimate.decided", data: { decision: "approved", min_minutes: 240, max_minutes: 480, proposal_id: "prop1" } }),
        event({ type: "estimate.decided", taskId: "t2", data: { decision: "rejected", comment: "Too big", min_minutes: 60, max_minutes: 120 } }),
      ],
      context(),
    );
    expect(content.subject).toBe("2 of your estimates were decided");
    expect(content.items).toEqual([
      { title: "Homepage: Approved, 4\u20138 h" },
      { title: "Pricing page: Rejected, 1\u20132 h", detail: "Too big" },
    ]);
    expect(content.button).toEqual({ label: "View Proposal", href: "https://workboard.test/approvals/prop1" });
  });

  it("links a proposal email to the review page", () => {
    const content = composeEmail(
      [event({ type: "proposal.submitted", taskId: null, entityId: "prop1", data: { item_count: 1, min_minutes: 60, max_minutes: 90 } })],
      context({ actorName: "Ana Kovač" }),
    );
    expect(content.subject).toBe("Ana Kovač sent 1 estimate for approval");
    expect(content.summary).toBe("Ana Kovač submitted 1 task on Website, 1\u20131.5 h in total.");
    expect(content.button.href).toBe("https://workboard.test/approvals/prop1");
  });

  it("shows the month totals per currency without adding them", () => {
    const content = composeEmail(
      [event({ type: "month.closed", taskId: null, projectId: null, data: { month: "2026-09-01" } })],
      context({
        monthTotals: {
          countedMinutes: 605,
          amounts: [
            { currency: "EUR", cents: 124000 },
            { currency: "USD", cents: 30000 },
          ],
        },
      }),
    );
    expect(content.subject).toBe("September 2026 is closed");
    expect(content.items).toEqual([{ title: "Time: 10h 5m" }, { title: "Amount: \u20ac1,240.00 \u00b7 $300.00" }]);
    expect(content.button.href).toBe("https://workboard.test/reports/2026-09");
  });

  it("never names the new assignee to the previous one", () => {
    const content = composeEmail(
      [event({ type: "task.unassigned", taskId: null, data: { title: "Homepage" } })],
      context(),
    );
    expect(content.summary).toBe("Homepage on Website was reassigned and no longer appears in your work.");
    expect(content.button.href).toBe("https://workboard.test/dashboard");
  });
});
