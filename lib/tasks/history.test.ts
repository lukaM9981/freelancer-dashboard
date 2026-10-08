import { describe, expect, it } from "vitest";
import { type HistoryEvent, describeEvent } from "@/lib/tasks/history";

function event(overrides: Partial<HistoryEvent>): HistoryEvent {
  return {
    type: "task.created",
    actorId: "admin-1",
    actorName: "Marta",
    subjectId: "ana",
    subjectName: "Ana",
    data: {},
    ...overrides,
  };
}

describe("describeEvent", () => {
  it("names the actor, and says You for the viewer", () => {
    expect(describeEvent(event({}), "ana").text).toBe("Marta created the task.");
    expect(describeEvent(event({ actorId: "ana", actorName: "Ana" }), "ana").text).toBe("You created the task.");
  });

  it("says who a task was assigned to", () => {
    expect(describeEvent(event({ type: "task.assigned" }), "admin-1").text).toBe(
      "You assigned the task to Ana.",
    );
    expect(describeEvent(event({ type: "task.assigned" }), "ana").text).toBe("Marta assigned the task to you.");
  });

  it("shows estimate changes with before and after ranges", () => {
    const line = describeEvent(
      event({
        type: "task.estimate_changed",
        actorId: "ana",
        data: { from: { min_minutes: 240, max_minutes: 480 }, to: { min_minutes: 360, max_minutes: 600 } },
      }),
      "admin-1",
    );
    expect(line.text).toBe("Marta changed the estimate from 4\u20138 h to 6\u201310 h.");
  });

  it("describes a rename and a new description together", () => {
    const line = describeEvent(
      event({
        type: "task.updated",
        data: {
          from: { title: "Header", description: "" },
          to: { title: "Site header", description: "Sticky on scroll" },
        },
      }),
      "ana",
    );
    expect(line.text).toBe(
      "Marta renamed the task from \u201cHeader\u201d to \u201cSite header\u201d and changed the description.",
    );
  });

  it("puts decision comments in the detail", () => {
    const line = describeEvent(
      event({
        type: "estimate.decided",
        data: { decision: "changes_requested", comment: "Split the API work out.", min_minutes: 120, max_minutes: 240 },
      }),
      "ana",
    );
    expect(line).toEqual({
      text: "Marta requested changes to the estimate of 2\u20134 h.",
      detail: "Split the API work out.",
    });
  });

  it("credits system events to the app", () => {
    const line = describeEvent(
      event({ type: "task.over_limit", actorId: null, actorName: null, data: { over_limit_minutes: 42 } }),
      "ana",
    );
    expect(line.text).toBe("Over-limit time was tracked: 42m.");
  });

  it("summarises time entry edits", () => {
    const line = describeEvent(
      event({
        type: "time_entry.updated",
        actorId: "ana",
        data: {
          from: { work_date: "2026-10-05", minutes: 60, description: "Layout" },
          to: { work_date: "2026-10-06", minutes: 90, description: "Layout" },
        },
      }),
      "ana",
    );
    expect(line.text).toBe("You edited the time entry for 6 Oct 2026 (1h \u2192 1h 30m, 5 Oct 2026 \u2192 6 Oct 2026).");
  });

  it("survives missing or malformed data", () => {
    expect(describeEvent(event({ type: "extra_hours.requested", data: null }), "ana").text).toBe(
      "Marta requested extra hours.",
    );
    expect(describeEvent(event({ type: "something.new" }), "ana").text).toBe("Marta: something new.");
  });
});
