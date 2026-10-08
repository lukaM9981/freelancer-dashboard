import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Viewer } from "@/lib/auth/queries";

export type RunningTimer = {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  startedAt: string;
};

type TaskEmbed = { title: string; project_id: string; project: { name: string } | { name: string }[] | null } | null;

function embedded<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] ?? null) : value) as T | null;
}

/** The viewer's own running timer, the source of truth for the timer bar (Tech.md §7.3). */
export const getRunningTimer = cache(async (viewer: Viewer): Promise<RunningTimer | null> => {
  // Only the assignee tracks time, and Admins are never assignees (PRD §4).
  if (viewer.role !== "freelancer") return null;

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("timers")
    .select(
      "id, task_id, started_at, task:tasks!timers_task_id_fkey(title, project_id, project:projects!tasks_project_id_fkey(name))",
    )
    .eq("user_id", viewer.id)
    .is("stopped_at", null)
    .maybeSingle();
  if (error) throw new Error(`Timer lookup failed: ${error.message}`);
  if (!data) return null;

  const task = embedded<NonNullable<TaskEmbed>>(data.task);
  return {
    id: data.id,
    taskId: data.task_id,
    taskTitle: task?.title ?? "Task",
    projectId: task?.project_id ?? "",
    projectName: embedded<{ name: string }>(task?.project)?.name ?? "Project",
    startedAt: data.started_at,
  };
});
