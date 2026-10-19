import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { Viewer } from "@/lib/auth/queries";
import { SCREENSHOT_BUCKET } from "@/lib/time/screenshot-bucket";

const URL_SECONDS = 60 * 60;

export type TaskScreenshot = {
  id: string;
  capturedAt: string;
  url: string | null;
  /** Set when a freelancer hid it. Admins still see the image. */
  deletedAt: string | null;
};

type ShotRow = {
  id: string;
  captured_at: string;
  storage_path: string;
  deleted_at: string | null;
};

/** Screenshots on a task the viewer can see. A freelancer does not receive hidden ones. */
export async function listTaskScreenshots(taskId: string, viewer: Viewer): Promise<TaskScreenshot[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("timer_screenshots")
    .select("id, captured_at, storage_path, deleted_at")
    .eq("task_id", taskId)
    .order("captured_at", { ascending: false });
  if (error) throw new Error(`Screenshots failed: ${error.message}`);

  const rows = (data ?? []) as ShotRow[];
  const urls = await signScreenshotPaths(
    supabase,
    rows.map((row) => row.storage_path),
  );
  return rows.map((row) => ({
    id: row.id,
    capturedAt: row.captured_at,
    url: urls.get(row.storage_path) ?? null,
    deletedAt: viewer.role === "admin" ? row.deleted_at : null,
  }));
}

async function signScreenshotPaths(supabase: SupabaseClient, paths: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const { data, error } = await supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrls(unique, URL_SECONDS);
  if (error || !data) {
    console.error("Screenshot URLs failed", error);
    return urls;
  }
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
