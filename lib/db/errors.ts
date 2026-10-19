// User-facing text for the error keys raised by the database (DB.md §10). Keys are
// added here as the features that raise them are built.
export const ERROR_MESSAGES = {
  not_authorized: "You're not signed in, or your account isn't active. Sign in and try again.",
  admin_only: "Only an Admin can do this.",
  person_not_found: "This person doesn't exist, or you can't see them.",
  person_exists: "Someone with this email already has an account.",
  person_not_active: "This account is deactivated. Ask Olifant to reactivate it.",
  invalid_avatar_path: "That photo could not be saved. Try a JPG, PNG, or WebP image.",
  invitation_pending: "This email already has a pending invitation. Resend or revoke it instead.",
  invitation_not_pending: "This invitation was already accepted or revoked.",
  no_valid_invitation: "This invitation link has expired. Ask Olifant for a new one.",
  last_admin: "There must always be at least one active Admin.",
  rate_in_closed_month: "That date is in a closed month. Choose a later date.",
  rate_not_deletable: "Only a rate that hasn't started yet can be deleted.",
  rate_not_found: "This rate doesn't exist, or you can't see it.",
  invalid_time_zone: "Choose a time zone from the list.",
  project_not_found: "This project doesn't exist, or you can't see it.",
  project_archived: "This project is archived, so it can't be changed. Restore it first.",
  project_has_open_tasks:
    "This project still has open tasks. Finish, cancel, or delete them before archiving.",
  member_has_open_tasks:
    "This person still has open tasks in this project. Reassign or cancel them first.",
  task_not_found: "This task doesn't exist, or you can't see it.",
  link_not_found: "This link was already removed.",
  not_project_member: "You're not a member of this project. Ask an Admin to add you.",
  assignee_not_member: "This person isn't a member of the project. Add them to the project first.",
  not_task_assignee: "Only the person assigned to this task can do this.",
  invalid_task_status: "This task's status changed, so this is no longer possible. Reload the page.",
  invalid_status_transition: "This task's status changed, so this is no longer possible. Reload the page.",
  task_was_submitted: "This task has been submitted, so it can't be deleted. An Admin can cancel it instead.",
  task_has_time: "Time has been tracked on this task, so it can't be reassigned. Cancel it instead.",
  self_approval_not_allowed: "You can't decide on your own task. Another Admin has to do it.",
  task_not_in_project: "Every task in a proposal must belong to the same project.",
  no_tasks: "Select at least one task to submit.",
  estimate_incomplete: "Every task needs an estimate before it can be submitted. Edit the task to add one.",
  revision_not_found: "This item doesn't exist, or you can't see it.",
  revision_already_decided: "This item was already decided or withdrawn. Reload the page.",
  nothing_pending: "Every item in this proposal has already been decided.",
  no_decisions: "Choose a decision first.",
  invalid_decision: "Choose approve, request changes, or reject.",
  comment_required: "Write a comment. It's required for this decision.",
  extra_hours_pending: "This task already has an open extra-hours request.",
  extra_hours_not_found: "This request doesn't exist, or you can't see it.",
  extra_hours_already_decided: "This request was already decided. Reload the page.",
  project_not_active: "The project is on hold or archived, so no time can be tracked on it.",
  timer_already_running: "A timer is already running. Stop it before starting another one.",
  timer_not_running: "This timer has already stopped.",
  timer_not_paused: "This timer is already running.",
  screenshot_not_found: "This screenshot was already deleted.",
  timer_range_invalid:
    "A run can be shortened but not extended. Add work done before the timer started as a manual entry.",
  timer_running_on_task: "The timer is still running on this task. Stop it first.",
  daily_limit_exceeded: "This would put more than 24 hours on one day. Enter less time.",
  work_date_in_future: "That date is in the future.",
  work_date_before_approval: "That date is before the task was approved.",
  month_closed: "That month is closed, so its time can't change.",
  month_not_ended: "This month hasn't ended yet. Close it once the month is over.",
  earlier_month_open: "An earlier month still has time and is open. Close that month first.",
  timer_running_in_month: "A timer that started in this month, or earlier, is still running. Stop it first.",
  open_extra_hours_request:
    "A task with over-limit time this month has an open extra-hours request. Decide it first.",
  missing_rate: "Counted time this month has no rate. Add a rate that covers those dates.",
  month_already_closed: "This month is already closed.",
  month_not_latest_closed: "Only the most recently closed month can be reopened.",
  entry_not_found: "This time entry doesn't exist, or you can't change it.",
  entry_spans_midnight: "A timed entry has to stay within one day.",
} as const satisfies Record<string, string>;

export type ErrorKey = keyof typeof ERROR_MESSAGES;

export const GENERIC_ERROR = "Something went wrong. Try again.";
const CHECK_FIELDS = "Check the highlighted fields.";

type DbError = { message?: string; code?: string } | null | undefined;

export function isErrorKey(value: unknown): value is ErrorKey {
  return typeof value === "string" && Object.hasOwn(ERROR_MESSAGES, value);
}

export function errorMessage(error: DbError): string {
  if (isErrorKey(error?.message)) return ERROR_MESSAGES[error.message];
  // Check-constraint violations the forms should have prevented.
  if (error?.code === "23514") return CHECK_FIELDS;
  console.error("Unmapped database error", error);
  return GENERIC_ERROR;
}
