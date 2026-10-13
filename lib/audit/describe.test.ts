import { describe, expect, it } from "vitest";
import { type AuditRow, describeAuditEvent } from "@/lib/audit/describe";

const zone = "Europe/Budapest";

function row(overrides: Partial<AuditRow>): AuditRow {
  return {
    id: 1,
    occurredAt: "2026-10-06T12:00:00.000Z",
    type: "task.created",
    actorId: "admin-1",
    actorName: "Marta",
    subjectId: null,
    subjectName: null,
    task: null,
    project: null,
    entityId: null,
    inviteeName: null,
    data: {},
    ...overrides,
  };
}

describe("describeAuditEvent", () => {
  it("uses the task history sentences for task events, and links the task and project", () => {
    const entry = describeAuditEvent(
      row({ task: { id: "t1", title: "Header" }, project: { id: "p1", name: "Website" } }),
      "admin-2",
      zone,
    );
    expect(entry.text).toBe("Marta created the task.");
    expect(entry.links).toEqual([
      { label: "Website", href: "/projects/p1" },
      { label: "Header", href: "/tasks/t1" },
    ]);
    expect(entry.changes).toEqual([]);
  });

  it("describes people events and links the person", () => {
    const entry = describeAuditEvent(
      row({ type: "person.role_changed", subjectId: "ana", subjectName: "Ana", data: { from: "freelancer", to: "admin" } }),
      "admin-1",
      zone,
    );
    expect(entry.text).toBe("You changed the role of Ana to Admin.");
    expect(entry.changes).toEqual([{ label: "Role", from: "Freelancer", to: "Admin" }]);
    expect(entry.links).toEqual([{ label: "Ana", href: "/people/ana" }]);
  });

  it("names the invitee from the invitation, or the email in the event", () => {
    expect(
      describeAuditEvent(row({ type: "person.invited", inviteeName: "Ana", data: { role: "admin" } }), "x", zone).text,
    ).toBe("Marta invited Ana as an Admin.");
    expect(
      describeAuditEvent(row({ type: "person.invited", data: { email: "ana@example.com", role: "freelancer" } }), "x", zone)
        .text,
    ).toBe("Marta invited ana@example.com as a Freelancer.");
  });

  it("formats rates as exact money", () => {
    const entry = describeAuditEvent(
      row({
        type: "rate.added",
        subjectId: "ana",
        subjectName: "Ana",
        data: { hourly_rate: 42.5, currency: "EUR", effective_from: "2026-10-01" },
      }),
      "x",
      zone,
    );
    expect(entry.text).toBe("Marta added a rate of \u20ac42.50/h for Ana, from 1 Oct 2026.");
  });

  it("lists only the settings that changed", () => {
    const entry = describeAuditEvent(
      row({
        type: "settings.changed",
        data: {
          from: { id: 1, name: "Olifant Digital", time_zone: "Europe/Budapest", tolerance_percent: 10, default_currency: "EUR" },
          to: { name: "Olifant Digital", time_zone: "Europe/Budapest", tolerance_percent: 15, default_currency: "USD" },
        },
      }),
      "x",
      zone,
    );
    expect(entry.changes).toEqual([
      { label: "Tolerance", from: "10%", to: "15%" },
      { label: "Default currency", from: "EUR", to: "USD" },
    ]);
  });

  it("shows time entry edits in the organization's time zone", () => {
    const entry = describeAuditEvent(
      row({
        type: "time_entry.updated",
        data: {
          from: { work_date: "2026-10-06", minutes: 60, description: "Layout", started_at: "2026-10-06T07:00:00Z", ended_at: "2026-10-06T08:00:00Z" },
          to: { work_date: "2026-10-06", minutes: 90, description: "Layout", started_at: "2026-10-06T07:00:00Z", ended_at: "2026-10-06T08:30:00Z" },
        },
      }),
      "x",
      zone,
    );
    expect(entry.changes).toEqual([
      { label: "Duration", from: "1h", to: "1h 30m" },
      { label: "End", from: "6 Oct 2026, 10:00", to: "6 Oct 2026, 10:30" },
    ]);
  });

  it("links month events to their report and keeps the reopen reason", () => {
    const entry = describeAuditEvent(
      row({ type: "month.reopened", data: { month: "2026-09-01", reason: "Late entry" } }),
      "x",
      zone,
    );
    expect(entry).toMatchObject({
      text: "Marta reopened September 2026.",
      detail: "Late entry",
      links: [{ label: "Report", href: "/reports/2026-09" }],
    });
  });

  it("keeps the comment body when a comment is deleted, and compares edits", () => {
    expect(describeAuditEvent(row({ type: "comment.deleted", data: { body: "Old note" } }), "x", zone).detail).toBe(
      "Old note",
    );
    expect(
      describeAuditEvent(row({ type: "comment.updated", data: { from: "Draft", to: "Final" } }), "x", zone).changes,
    ).toEqual([{ label: "Comment", from: "Draft", to: "Final" }]);
  });

  it("names a deleted draft from the event and an automatic event as the app", () => {
    expect(describeAuditEvent(row({ type: "task.deleted", data: { title: "Footer" } }), "x", zone).text).toBe(
      "Marta deleted the draft task \u201cFooter\u201d.",
    );
    expect(
      describeAuditEvent(row({ type: "month.closed", actorId: null, data: { month: "2026-09-01" } }), "x", zone).text,
    ).toBe("Olifant Workboard closed September 2026.");
  });
});
