"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireViewer } from "@/lib/auth/queries";
import { errorMessage, isErrorKey } from "@/lib/db/errors";
import { type ActionResult, type FieldErrors, fail, invalidInput, ok } from "@/lib/db/result";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { resolveEntryEdit } from "@/lib/time/run";
import {
  type AddTimeEntryInput,
  type DeleteTimeEntryInput,
  type EntryDescriptionInput,
  type ScreenshotIdInput,
  type StartTimerInput,
  type StopTimerInput,
  type TimerIdInput,
  type UpdateManualEntryInput,
  type UpdateTimedEntryInput,
  addTimeEntrySchema,
  deleteTimeEntrySchema,
  entryDescriptionSchema,
  screenshotIdSchema,
  startTimerSchema,
  stopTimerSchema,
  timerIdSchema,
  updateManualEntrySchema,
  updateTimedEntrySchema,
} from "@/lib/time/schemas";

type DbError = { message?: string; code?: string } | null;

// Refusals the review dialog shows next to a field instead of only in a toast. The dialog
// already checks start and end itself, so `timer_range_invalid` names no single field.
const TIMER_FIELDS: Partial<Record<string, string>> = {
  daily_limit_exceeded: "endTime",
};

const MANUAL_FIELDS: Partial<Record<string, string>> = {
  work_date_in_future: "workDate",
  work_date_before_approval: "workDate",
  month_closed: "workDate",
  daily_limit_exceeded: "minutes",
};

const TIMED_FIELDS: Partial<Record<string, string>> = {
  work_date_in_future: "workDate",
  work_date_before_approval: "workDate",
  month_closed: "workDate",
  daily_limit_exceeded: "endTime",
  entry_spans_midnight: "endTime",
};

function dbFailure(error: DbError, fields: Partial<Record<string, string>> = TIMER_FIELDS): ActionResult<never> {
  const message = errorMessage(error);
  const code = isErrorKey(error?.message) ? error.message : undefined;
  const field = code ? fields[code] : undefined;
  const fieldErrors: FieldErrors | undefined = field ? { [field]: [message] } : undefined;
  return fail(message, fieldErrors, code);
}

export async function startTimer(input: StartTimerInput): Promise<ActionResult<{ timerId: string }>> {
  await requireViewer();
  const parsed = startTimerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.rpc("start_timer", { p_task_id: parsed.data.taskId });
  if (error || !data) return dbFailure(error);

  revalidateTime();
  return ok({ timerId: data });
}

/** Closes the open segment. Already paused returns the same moment. */
export async function pauseTimer(): Promise<ActionResult<{ pausedAt: string }>> {
  await requireViewer();
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.rpc("pause_timer");
  if (error || !data) return dbFailure(error);
  revalidateTime();
  return ok({ pausedAt: data });
}

export async function resumeTimer(): Promise<ActionResult> {
  await requireViewer();
  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("resume_timer");
  if (error) return dbFailure(error);
  revalidateTime();
  return ok();
}

export async function touchTimerShare(): Promise<void> {
  await requireViewer();
  const supabase = createClient(await cookies());
  await supabase.rpc("touch_timer_share");
}

export async function createTimerScreenshot(input: TimerIdInput): Promise<ActionResult<{ path: string }>> {
  await requireViewer();
  const parsed = timerIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.rpc("create_timer_screenshot", { p_timer_id: parsed.data.timerId });
  if (error || !data) return dbFailure(error);
  return ok({ path: data });
}

export async function discardUnstoredScreenshot(input: ScreenshotIdInput): Promise<void> {
  await requireViewer();
  const parsed = screenshotIdSchema.safeParse(input);
  if (!parsed.success) return;
  const supabase = createClient(await cookies());
  await supabase.rpc("discard_unstored_screenshot", { p_id: parsed.data.id });
}

export async function deleteTimerScreenshot(input: ScreenshotIdInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = screenshotIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("delete_timer_screenshot", { p_id: parsed.data.id });
  if (error) return dbFailure(error, {});
  revalidateTime();
  return ok();
}

/** Saves the running timer as one entry per local day (PRD §5.5) and returns the minutes saved. */
export async function stopTimer(input: StopTimerInput): Promise<ActionResult<{ minutes: number }>> {
  await requireViewer();
  const parsed = stopTimerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data: minutes, error } = await supabase.rpc("stop_timer", {
    p_started_at: parsed.data.startedAt,
    p_ended_at: parsed.data.endedAt,
    p_description: parsed.data.description,
  });
  if (error) return dbFailure(error);

  revalidateTime();
  return ok({ minutes: minutes ?? 0 });
}

export async function discardTimer(): Promise<ActionResult> {
  await requireViewer();
  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("discard_timer");
  if (error) return dbFailure(error);

  revalidateTime();
  return ok();
}

/** Only the description changes, which is allowed at any task status while the month is open (PRD §6.8). */
export async function correctEntryDescription(input: EntryDescriptionInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = entryDescriptionSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("update_time_entry", {
    p_entry_id: parsed.data.entryId,
    p_description: parsed.data.description,
  });
  if (error) return dbFailure(error);

  revalidateTime();
  return ok();
}

export async function addTimeEntry(input: AddTimeEntryInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = addTimeEntrySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("add_time_entry", {
    p_task_id: parsed.data.taskId,
    p_work_date: parsed.data.workDate,
    p_minutes: parsed.data.minutes,
    p_description: parsed.data.description,
  });
  if (error) return dbFailure(error, MANUAL_FIELDS);

  revalidateTime();
  return ok();
}

export async function updateManualEntry(input: UpdateManualEntryInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = updateManualEntrySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("update_time_entry", {
    p_entry_id: parsed.data.entryId,
    p_description: parsed.data.description,
    p_work_date: parsed.data.workDate,
    p_minutes: parsed.data.minutes,
  });
  if (error) return dbFailure(error, MANUAL_FIELDS);

  revalidateTime();
  return ok();
}

export async function updateTimedEntry(input: UpdateTimedEntryInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = updateTimedEntrySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const { timeZone } = await getOrganizationSettings();
  const resolved = resolveEntryEdit(parsed.data, parsed.data, timeZone);
  if (!resolved.ok) return fail("Check the highlighted fields.", { [resolved.field]: [resolved.message] });

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("update_time_entry", {
    p_entry_id: parsed.data.entryId,
    p_description: parsed.data.description,
    p_started_at: resolved.startedAt,
    p_ended_at: resolved.endedAt,
  });
  if (error) return dbFailure(error, TIMED_FIELDS);

  revalidateTime();
  return ok();
}

export async function deleteTimeEntry(input: DeleteTimeEntryInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = deleteTimeEntrySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("delete_time_entry", { p_entry_id: parsed.data.entryId });
  if (error) return dbFailure(error, {});

  revalidateTime();
  return ok();
}

// The timer bar lives in the layout, and time changes task, project, and dashboard figures.
function revalidateTime() {
  revalidatePath("/", "layout");
}
