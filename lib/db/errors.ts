// User-facing text for the error keys raised by the database (DB.md §10). Keys are
// added here as the features that raise them are built.
export const ERROR_MESSAGES = {
  not_authorized: "You're not signed in, or your account isn't active. Sign in and try again.",
  admin_only: "Only an Admin can do this.",
  person_not_found: "This person doesn't exist, or you can't see them.",
  person_exists: "Someone with this email already has an account.",
  person_not_active: "This account is deactivated. Ask Olifant to reactivate it.",
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
