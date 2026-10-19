import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/** The sharing tab calls this as the page closes, so the clock stops with the share. */
export async function POST() {
  const supabase = createClient(await cookies());
  await supabase.rpc("pause_timer");
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
