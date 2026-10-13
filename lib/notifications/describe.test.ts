import { describe, expect, it } from "vitest";
import { describeNotification, notificationItems, type NotificationRow } from "@/lib/notifications/describe";

const row = (overrides: Partial<NotificationRow>): NotificationRow => ({
  id: "n1",
  type: "task.held",
  createdAt: "2026-10-12T10:00:00Z",
  readAt: null,
  txid: 100,
  taskId: "t1",
  projectId: "p1",
  data: {},
  actorName: "Olga",
  entityId: null,
  taskTitle: "Homepage",
  projectName: "Website",
  ...overrides,
});

describe("describeNotification", () => {
  it("links a submitted proposal to its review page", () => {
    const line = describeNotification(
      row({
        type: "proposal.submitted",
        taskId: null,
        actorName: "Ana Kovač",
        entityId: "prop1",
        data: { item_count: 3, min_minutes: 240, max_minutes: 480 },
      }),
    );
    expect(line).toEqual({
      text: "Ana Kovač submitted 3 tasks on Website for approval (4\u20138 h).",
      href: "/approvals/prop1",
    });
  });

  it("tells the assignee about a decision without naming other people", () => {
    expect(
      describeNotification(
        row({ type: "estimate.decided", data: { decision: "changes_requested", comment: "Split it", min_minutes: 60, max_minutes: 120 } }),
      ),
    ).toEqual({
      text: "Changes were requested to your estimate of 1\u20132 h for Homepage.",
      detail: "Split it",
      href: "/tasks/t1",
    });
    expect(describeNotification(row({ type: "extra_hours.decided", data: { approved: true, minutes: 90 } })).text).toBe(
      "Your request for 1h 30m of extra hours on Homepage was approved.",
    );
  });

  it("sends a previous assignee to the dashboard, using the title the event kept", () => {
    expect(
      describeNotification(row({ type: "task.unassigned", taskId: null, taskTitle: null, data: { title: "Old task" } })),
    ).toEqual({ text: "Old task was reassigned and is no longer yours.", href: "/dashboard" });
  });

  it("links month events to that month's report", () => {
    expect(describeNotification(row({ type: "month.closed", taskId: null, projectId: null, data: { month: "2026-09-01" } }))).toEqual({
      text: "September 2026 was closed. Your report for it is final.",
      href: "/reports/2026-09",
    });
  });

  it("describes project holds for members", () => {
    expect(
      describeNotification(row({ type: "project.status_changed", taskId: null, data: { from: "active", to: "on_hold" } })),
    ).toEqual({ text: "Website was put on hold.", href: "/projects/p1" });
  });
});

describe("notificationItems", () => {
  it("joins the estimate decisions of one action into one item", () => {
    const items = notificationItems([
      row({ id: "a", type: "estimate.decided", txid: 7, data: { decision: "approved", proposal_id: "prop1" } }),
      row({ id: "b", type: "estimate.decided", txid: 7, readAt: "2026-10-12T11:00:00Z", data: { decision: "approved" } }),
      row({ id: "c", type: "task.held", txid: 6 }),
    ]);
    expect(items.map((item) => [item.ids, item.text, item.href, item.read])).toEqual([
      [["a", "b"], "2 of your estimates were approved.", "/approvals/prop1", false],
      [["c"], "Homepage was put on hold.", "/tasks/t1", false],
    ]);
  });
});
