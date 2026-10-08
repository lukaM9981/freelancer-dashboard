"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireViewer } from "@/lib/auth/queries";
import { errorMessage, isErrorKey } from "@/lib/db/errors";
import { type ActionResult, type FieldErrors, fail, invalidInput, ok } from "@/lib/db/result";
import {
  type EntryDescriptionInput,
  type StartTimerInput,
  type StopTimerInput,
  entryDescriptionSchema,
  startTimerSchema,
  stopTimerSchema,
} from "@/lib/time/schemas";

type DbError = { message?: string; code?: string } | null;

// Refusals the review dialog shows next to a field instead of only in a toast. The dialog
// already checks start and end itself, so `timer_range_invalid` names no single field.
const FIELD_OF_ERROR: Partial<Record<string, "startTime" | "endTime">> = {
  daily_limit_exceeded: "endTime",
};

function dbFailure(error: DbError): ActionResult<never> {
  const message = errorMessage(error);
  const code = isErrorKey(error?.message) ? error.message : undefined;
  const field = code ? FIELD_OF_ERROR[code] : undefined;
  const fieldErrors: FieldErrors | undefined = field ? { [field]: [message] } : undefined;
  return fail(message, fieldErrors, code);
}

export async function startTimer(input: StartTimerInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = startTimerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("start_timer", { p_task_id: parsed.data.taskId });
  if (error) return dbFailure(error);

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

// The timer bar lives in the layout, and time changes task, project, and dashboard figures.
function revalidateTime() {
  revalidatePath("/", "layout");
}
