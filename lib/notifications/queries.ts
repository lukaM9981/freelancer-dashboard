import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Viewer } from "@/lib/auth/queries";
import { notificationItems, type NotificationItem, type NotificationRow } from "@/lib/notifications/describe";

type Supabase = ReturnType<typeof createClient>;

export const BELL_SHOWN = 10;
export const PAGE_STEP = 50;
export const PAGE_MAX = 500;

// RLS lets Admins read everyone's notifications (so failed emails stay visible), so every
// query here filters by recipient explicitly (DB.md §7).
const COLUMNS =
  "id, type, created_at, read_at, txid, task_id, project_id, data, event:audit_events!notifications_event_id_fkey(entity_id, actor:profiles!audit_events_actor_id_fkey(full_name))";

export type BellData = { unreadCount: number; items: NotificationItem[] };

/** The bell's unread count and newest items, rendered by the app layout. */
export async function getBellNotifications(viewer: Viewer): Promise<BellData> {
  const supabase = createClient(await cookies());
  const [unread, latest] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", viewer.id)
      .is("read_at", null),
    loadRows(supabase, viewer.id, { unreadOnly: false, limit: BELL_SHOWN }),
  ]);
  if (unread.error) throw new Error(`Notifications failed: ${unread.error.message}`);
  return { unreadCount: unread.count ?? 0, items: notificationItems(latest.rows) };
}

export type NotificationPage = { items: NotificationItem[]; hasMore: boolean; unreadCount: number };

export async function listNotifications(
  viewer: Viewer,
  options: { unreadOnly: boolean; limit: number },
): Promise<NotificationPage> {
  const supabase = createClient(await cookies());
  const [page, unread] = await Promise.all([
    loadRows(supabase, viewer.id, options),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", viewer.id)
      .is("read_at", null),
  ]);
  if (unread.error) throw new Error(`Notifications failed: ${unread.error.message}`);
  return { items: notificationItems(page.rows), hasMore: page.hasMore, unreadCount: unread.count ?? 0 };
}

async function loadRows(
  supabase: Supabase,
  recipientId: string,
  options: { unreadOnly: boolean; limit: number },
): Promise<{ rows: NotificationRow[]; hasMore: boolean }> {
  let query = supabase
    .from("notifications")
    .select(COLUMNS)
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit + 1);
  if (options.unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) throw new Error(`Notifications failed: ${error.message}`);
  const fetched = data ?? [];
  const page = fetched.slice(0, options.limit);

  const taskIds = unique(page.map((row) => row.task_id));
  const projectIds = unique(page.map((row) => row.project_id));
  const [tasks, projects] = await Promise.all([
    taskIds.length > 0
      ? supabase.from("tasks").select("id, title").in("id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length > 0
      ? supabase.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (tasks.error) throw new Error(`Notifications failed: ${tasks.error.message}`);
  if (projects.error) throw new Error(`Notifications failed: ${projects.error.message}`);
  const taskTitles = new Map((tasks.data ?? []).map((task) => [task.id, task.title]));
  const projectNames = new Map((projects.data ?? []).map((project) => [project.id, project.name]));

  const rows = page.map((row): NotificationRow => {
    const event = embedded<{ entity_id: string | null; actor: unknown }>(row.event);
    const actor = embedded<{ full_name: string }>(event?.actor);
    return {
      id: row.id,
      type: row.type,
      createdAt: row.created_at,
      readAt: row.read_at,
      txid: row.txid,
      taskId: row.task_id,
      projectId: row.project_id,
      data: row.data,
      actorName: actor?.full_name ?? null,
      entityId: event?.entity_id ?? null,
      taskTitle: row.task_id ? (taskTitles.get(row.task_id) ?? null) : null,
      projectName: row.project_id ? (projectNames.get(row.project_id) ?? null) : null,
    };
  });
  return { rows, hasMore: fetched.length > options.limit };
}

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value != null))];
}

function embedded<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}
