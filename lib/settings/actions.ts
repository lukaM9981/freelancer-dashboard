"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/queries";
import { errorMessage } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";
import { type SettingsInput, settingsSchema } from "@/lib/settings/schemas";
import { isTimeZoneName } from "@/lib/settings/time-zones";

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  if (!isTimeZoneName(parsed.data.timeZone)) {
    return fail("Choose a time zone from the list.", { timeZone: ["Choose a time zone from the list."] });
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("update_settings", {
    p_name: parsed.data.name,
    p_time_zone: parsed.data.timeZone,
    p_tolerance_percent: parsed.data.tolerancePercent,
    p_default_currency: parsed.data.defaultCurrency,
  });
  if (error) return fail(errorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}
