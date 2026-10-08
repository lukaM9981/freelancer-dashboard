import { describe, expect, it } from "vitest";
import {
  type PermissionTask,
  type PermissionViewer,
  type TaskActions,
  availableActions,
  canChangeComment,
} from "@/lib/tasks/permissions";

const admin: PermissionViewer = { id: "admin-1", role: "admin" };
const otherAdmin: PermissionViewer = { id: "admin-2", role: "admin" };
const ana: PermissionViewer = { id: "ana", role: "freelancer" };
const ben: PermissionViewer = { id: "ben", role: "freelancer" };

function task(overrides: Partial<PermissionTask> = {}): PermissionTask {
  return {
    status: "draft",
    assigneeId: "ana",
    createdBy: "ana",
    everSubmitted: false,
    projectStatus: "active",
    hasEstimate: false,
    hasTime: false,
    timerRunning: false,
    extraHoursPending: false,
    ...overrides,
  };
}

function allowed(actions: TaskActions): string[] {
  return Object.entries(actions)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .sort();
}

describe("availableActions", () => {
  it("lets the assignee edit, estimate, and delete their own new draft", () => {
    expect(allowed(availableActions(task(), ana))).toEqual(
      ["comment", "delete", "editDetails", "estimate", "manageLinks"].sort(),
    );
  });

  it("offers submitting only once the draft has an estimate", () => {
    expect(availableActions(task(), ana).submit).toBe(false);
    expect(availableActions(task({ hasEstimate: true }), ana).submit).toBe(true);
    expect(availableActions(task({ status: "changes_requested", hasEstimate: true }), ana).submit).toBe(true);
  });

  it("gives another freelancer nothing", () => {
    for (const status of ["draft", "approved", "in_progress", "done"] as const) {
      expect(allowed(availableActions(task({ status }), ben))).toEqual([]);
    }
  });

  it("never lets an Admin estimate, submit, track time, or mark work done", () => {
    const actions = availableActions(task({ status: "in_progress", hasEstimate: true }), admin);
    expect(actions.estimate).toBe(false);
    expect(actions.submit).toBe(false);
    expect(actions.trackTime).toBe(false);
    expect(actions.markDone).toBe(false);
    expect(actions.requestExtraHours).toBe(false);
  });

  it("lets Admins edit the details until the task is final", () => {
    expect(availableActions(task({ status: "done" }), admin).editDetails).toBe(true);
    for (const status of ["accepted", "rejected", "cancelled"] as const) {
      expect(availableActions(task({ status }), admin).editDetails).toBe(false);
    }
  });

  it("stops the assignee editing once the task is submitted", () => {
    for (const status of ["pending_approval", "approved", "in_progress", "on_hold", "done"] as const) {
      const actions = availableActions(task({ status, everSubmitted: true }), ana);
      expect(actions.editDetails).toBe(false);
      expect(actions.estimate).toBe(false);
    }
  });

  it("allows the first assignment only on a draft that was never submitted", () => {
    expect(availableActions(task({ assigneeId: null, createdBy: "admin-1" }), admin).assign).toBe(true);
    expect(availableActions(task(), admin).assign).toBe(true);
    expect(availableActions(task({ everSubmitted: true }), admin).assign).toBe(false);
    expect(availableActions(task({ status: "changes_requested", everSubmitted: true }), admin).assign).toBe(false);
    expect(availableActions(task(), ana).assign).toBe(false);
  });

  it("allows reassigning only before any time is tracked", () => {
    expect(availableActions(task({ status: "approved", everSubmitted: true }), admin).reassign).toBe(true);
    expect(availableActions(task({ status: "in_progress", hasTime: true }), admin).reassign).toBe(false);
    expect(availableActions(task({ status: "approved", timerRunning: true }), admin).reassign).toBe(false);
    expect(availableActions(task({ status: "done" }), admin).reassign).toBe(false);
  });

  it("deletes only never-submitted tasks, by their creator or an Admin", () => {
    expect(availableActions(task(), ana).delete).toBe(true);
    expect(availableActions(task({ createdBy: "admin-1" }), ana).delete).toBe(false);
    expect(availableActions(task({ createdBy: "ana" }), admin).delete).toBe(true);
    expect(availableActions(task({ everSubmitted: true }), admin).delete).toBe(false);
    expect(availableActions(task({ everSubmitted: true }), ana).delete).toBe(false);
  });

  it("lets the assignee withdraw a pending estimate and an Admin decide it", () => {
    const pending = task({ status: "pending_approval", everSubmitted: true });
    expect(availableActions(pending, ana).withdraw).toBe(true);
    expect(availableActions(pending, admin).decideEstimate).toBe(true);
    expect(availableActions(pending, ana).decideEstimate).toBe(false);
  });

  it("never lets an Admin decide on a task assigned to themselves", () => {
    const own = task({ status: "pending_approval", assigneeId: "admin-1", everSubmitted: true });
    expect(availableActions(own, admin).decideEstimate).toBe(false);
    expect(availableActions(own, otherAdmin).decideEstimate).toBe(true);
    const done = task({ status: "done", assigneeId: "admin-1", everSubmitted: true });
    expect(availableActions(done, admin).accept).toBe(false);
    expect(availableActions(done, admin).cancel).toBe(false);
  });

  it("follows the hold, resume, and cancel transitions", () => {
    expect(availableActions(task({ status: "approved" }), admin).hold).toBe(true);
    expect(availableActions(task({ status: "in_progress" }), admin).hold).toBe(true);
    expect(availableActions(task({ status: "done" }), admin).hold).toBe(false);
    expect(availableActions(task({ status: "on_hold" }), admin).resume).toBe(true);
    expect(availableActions(task({ status: "approved" }), admin).resume).toBe(false);
    expect(availableActions(task({ status: "done" }), admin).cancel).toBe(true);
    expect(availableActions(task({ status: "accepted" }), admin).cancel).toBe(false);
  });

  it("lets the assignee mark only an In progress task as Done", () => {
    expect(availableActions(task({ status: "in_progress" }), ana).markDone).toBe(true);
    expect(availableActions(task({ status: "approved" }), ana).markDone).toBe(false);
  });

  it("refuses acceptance while an extra-hours request is open, but allows returning", () => {
    const done = task({ status: "done", extraHoursPending: true });
    expect(availableActions(done, admin).accept).toBe(false);
    expect(availableActions(done, admin).return).toBe(true);
    expect(availableActions(done, admin).decideExtraHours).toBe(true);
    expect(availableActions(task({ status: "done" }), admin).accept).toBe(true);
  });

  it("allows one open extra-hours request on a working task", () => {
    expect(availableActions(task({ status: "on_hold" }), ana).requestExtraHours).toBe(true);
    expect(availableActions(task({ status: "in_progress", extraHoursPending: true }), ana).requestExtraHours).toBe(
      false,
    );
    expect(availableActions(task({ status: "done" }), ana).requestExtraHours).toBe(false);
  });

  it("tracks time only on Approved or In progress tasks in an Active project", () => {
    expect(availableActions(task({ status: "approved" }), ana).trackTime).toBe(true);
    expect(availableActions(task({ status: "in_progress" }), ana).trackTime).toBe(true);
    expect(availableActions(task({ status: "on_hold" }), ana).trackTime).toBe(false);
    expect(availableActions(task({ status: "approved", projectStatus: "on_hold" }), ana).trackTime).toBe(false);
  });

  it("keeps comments and links open at final statuses", () => {
    const accepted = availableActions(task({ status: "accepted" }), ana);
    expect(accepted.comment).toBe(true);
    expect(accepted.manageLinks).toBe(true);
  });

  it("makes everything read-only in an archived project", () => {
    for (const viewer of [admin, ana]) {
      expect(allowed(availableActions(task({ projectStatus: "archived" }), viewer))).toEqual([]);
    }
  });
});

describe("canChangeComment", () => {
  const active = { projectStatus: "active" as const };

  it("lets authors change their own ordinary comments", () => {
    expect(canChangeComment({ authorId: "ana", kind: "comment" }, active, ana)).toBe(true);
    expect(canChangeComment({ authorId: "admin-1", kind: "comment" }, active, ana)).toBe(false);
  });

  it("keeps decision comments permanent", () => {
    expect(canChangeComment({ authorId: "admin-1", kind: "decision" }, active, admin)).toBe(false);
  });

  it("refuses changes in an archived project", () => {
    expect(canChangeComment({ authorId: "ana", kind: "comment" }, { projectStatus: "archived" }, ana)).toBe(false);
  });
});
