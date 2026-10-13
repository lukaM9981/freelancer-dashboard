"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/queries";
import { errorMessage, isErrorKey } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";
import { scheduleEmailDispatch } from "@/lib/email/dispatch";
import {
  type CloseMonthInput,
  type ReopenMonthInput,
  closeMonthSchema,
  reopenMonthSchema,
} from "@/lib/months/schemas";

type DbError = { message?: string; code?: string } | null;

export async function closeMonth(input: CloseMonthInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = closeMonthSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("close_month", { p_month: parsed.data.month });
  if (error) return dbFailure(error);

  scheduleEmailDispatch();
  revalidatePath("/", "layout");
  return ok();
}

export async function reopenMonth(input: ReopenMonthInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reopenMonthSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("reopen_month", {
    p_month: parsed.data.month,
    p_reason: parsed.data.reason,
  });
  if (error) return dbFailure(error, { comment_required: "reason" });

  revalidatePath("/", "layout");
  return ok();
}

function dbFailure(error: DbError, fields: Partial<Record<string, string>> = {}): ActionResult<never> {
  const message = errorMessage(error);
  const code = isErrorKey(error?.message) ? error.message : undefined;
  const field = code ? fields[code] : undefined;
  return fail(message, field ? { [field]: [message] } : undefined, code);
}
