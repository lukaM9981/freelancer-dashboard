import { describe, expect, it } from "vitest";
import { activityFeed, type ActivityEvent } from "@/lib/dashboard/activity";

const event = (overrides: Partial<ActivityEvent>): ActivityEvent => ({
  id: 1,
  occurredAt: "2026-10-12T10:00:00Z",
  txid: 100,
  type: "timer.stopped",
  actorId: "ana",
  actorName: "Ana Kovač",
  subjectId: "ana",
  subjectName: "Ana Kovač",
  taskId: "t1",
  taskTitle: "Homepage",
  projectName: "Website",
  data: {},
  ...overrides,
});

describe("activityFeed", () => {
  it("describes time entries with the freelancer's name", () => {
    const items = activityFeed(
      [
        event({ id: 3, data: { minutes: 80 } }),
        event({ id: 2, type: "time_entry.created", data: { minutes: 60, work_date: "2026-10-09" } }),
        event({
          id: 1,
          type: "timer.auto_stopped",
          actorId: "admin",
          actorName: "Olga",
          data: { minutes: 25, reason: "task put on hold" },
        }),
      ],
      "admin",
      10,
    );
    expect(items.map((item) => [item.text, item.detail, item.href])).toEqual([
      ["Ana Kovač tracked 1h 20m on Homepage.", undefined, "/tasks/t1"],
      ["Ana Kovač added 1h for 9 Oct 2026 on Homepage.", undefined, "/tasks/t1"],
      ["Ana Kovač\u2019s timer stopped automatically on Homepage and saved 25m.", "Reason: task put on hold.", "/tasks/t1"],
    ]);
  });

  it("turns the viewer's own decisions into \u201cYou\u201d and links estimates to the proposal", () => {
    const [item] = activityFeed(
      [
        event({
          type: "estimate.decided",
          actorId: "admin",
          data: { decision: "rejected", comment: "Too broad", min_minutes: 240, max_minutes: 480, proposal_id: "p1" },
        }),
      ],
      "admin",
      10,
    );
    expect(item).toMatchObject({
      text: "You rejected Ana Kovač\u2019s estimate of 4\u20138 h on Homepage.",
      detail: "Too broad",
      href: "/approvals/p1",
    });
  });

  it("joins estimate decisions from one action into one line", () => {
    const decided = (id: number, txid: number) =>
      event({
        id,
        txid,
        type: "estimate.decided",
        actorId: "admin",
        actorName: "Olga",
        data: { decision: "approved", min_minutes: 60, max_minutes: 120, proposal_id: "p1" },
      });
    const items = activityFeed([decided(5, 9), decided(4, 9), decided(3, 9), decided(2, 8)], "someone-else", 10);
    expect(items.map((item) => item.text)).toEqual([
      "Olga approved 3 estimates from Ana Kovač.",
      "Olga approved Ana Kovač\u2019s estimate of 1\u20132 h on Homepage.",
    ]);
  });

  it("describes extra-hours decisions and stops at the limit", () => {
    const items = activityFeed(
      [
        event({ id: 2, type: "extra_hours.decided", actorId: "admin", actorName: "Olga", data: { approved: true, minutes: 120 } }),
        event({ id: 1, type: "extra_hours.decided", actorId: "admin", actorName: "Olga", data: { approved: false, minutes: 60, reason: "Out of scope" } }),
      ],
      "x",
      1,
    );
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Olga approved Ana Kovač\u2019s request for 2h of extra hours on Homepage.");
  });
});
