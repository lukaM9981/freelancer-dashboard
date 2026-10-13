"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { requireViewer } from "@/lib/auth/queries";
import { errorMessage } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";

const markReadSchema = z.object({
  /** Omitted: everything the viewer has is marked read. */
  ids: z.array(z.uuid()).min(1).max(500).optional(),
});

export async function markNotificationsRead(input: z.input<typeof markReadSchema>): Promise<ActionResult> {
  await requireViewer();
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("mark_notifications_read", parsed.data.ids ? { p_ids: parsed.data.ids } : {});
  if (error) return fail(errorMessage(error));
  return ok();
}
