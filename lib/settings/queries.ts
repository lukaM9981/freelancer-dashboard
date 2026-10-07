import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Currency } from "@/lib/money";

export type OrganizationSettings = {
  name: string;
  timeZone: string;
  tolerancePercent: number;
  defaultCurrency: Currency;
};

/**
 * The single settings row, once per request. Everyone signed in can read it
 * (DB.md §4.1); screens pass `timeZone` into lib/dates.ts.
 */
export const getOrganizationSettings = cache(async (): Promise<OrganizationSettings> => {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("organization_settings")
    .select("name, time_zone, tolerance_percent, default_currency")
    .eq("id", 1)
    .single();

  if (error || !data) {
    console.error("Failed to load organization settings", error);
    throw new Error("Organization settings are unavailable.");
  }

  const currency: Currency = data.default_currency === "USD" ? "USD" : "EUR";

  return {
    name: data.name,
    timeZone: data.time_zone,
    tolerancePercent: Number(data.tolerance_percent),
    defaultCurrency: currency,
  };
});
