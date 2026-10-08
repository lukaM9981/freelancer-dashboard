"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireViewer } from "@/lib/auth/queries";
import { errorMessage } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";
import {
  type AddCommentInput,
  type AddLinkInput,
  type CreateTaskInput,
  type DeleteCommentInput,
  type EditCommentInput,
  type RemoveLinkInput,
  type TaskIdInput,
  type UpdateTaskInput,
  addCommentSchema,
  addLinkSchema,
  createTaskSchema,
  deleteCommentSchema,
  editCommentSchema,
  removeLinkSchema,
  taskIdSchema,
  updateTaskSchema,
} from "@/lib/tasks/schemas";

export async function createTask(input: CreateTaskInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { projectId, title, description, assigneeId, estimateMin, estimateMax, estimateNote } = parsed.data;
  const isAdmin = viewer.role === "admin";

  const supabase = createClient(await cookies());
  const { data: taskId, error } = await supabase.rpc("create_task", {
    p_project_id: projectId,
    p_title: title,
    p_description: description,
    ...(isAdmin && assigneeId ? { p_assignee_id: assigneeId } : {}),
  });
  if (error?.message === "assignee_not_member") {
    return fail("Check the highlighted fields.", { assigneeId: ["This person isn't a member of the project."] });
  }
  if (error || !taskId) return fail(errorMessage(error));

  revalidateProject(projectId);

  // Freelancers create tasks for themselves and can estimate them straight away.
  if (!isAdmin && estimateMin != null && estimateMax != null) {
    const estimate = await supabase.rpc("set_task_estimate", {
      p_task_id: taskId,
      p_min_minutes: estimateMin,
      p_max_minutes: estimateMax,
      p_note: estimateNote,
    });
    if (estimate.error) {
      console.error("Task created, but its estimate wasn't saved", estimate.error);
      redirect(`/tasks/${taskId}/edit?notice=estimate-not-saved`);
    }
  }

  redirect(`/tasks/${taskId}`);
}

export async function updateTask(input: UpdateTaskInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { taskId, title, description, assigneeId, estimateMin, estimateMax, estimateNote } = parsed.data;

  const supabase = createClient(await cookies());
  const current = await supabase
    .from("tasks")
    .select("project_id, title, description, status, assignee_id, estimate_min_minutes, estimate_max_minutes, estimate_note")
    .eq("id", taskId)
    .maybeSingle();
  if (current.error || !current.data) return fail(errorMessage({ message: "task_not_found" }));
  const task = current.data;

  // Only what changed is sent, so a retry after a partial failure picks up where it stopped.
  if (title !== task.title || description !== task.description) {
    const { error } = await supabase.rpc("update_task", {
      p_task_id: taskId,
      p_title: title,
      p_description: description,
    });
    if (error) return fail(errorMessage(error));
  }

  const estimating =
    task.assignee_id === viewer.id && (task.status === "draft" || task.status === "changes_requested");
  if (estimating) {
    const hadEstimate = task.estimate_min_minutes != null && task.estimate_max_minutes != null;
    if (estimateMin == null || estimateMax == null) {
      if (hadEstimate) {
        return fail("Check the highlighted fields.", {
          estimateMin: ["Enter a minimum."],
          estimateMax: ["Enter a maximum."],
        });
      }
    } else if (
      estimateMin !== task.estimate_min_minutes ||
      estimateMax !== task.estimate_max_minutes ||
      estimateNote !== (task.estimate_note ?? "")
    ) {
      const { error } = await supabase.rpc("set_task_estimate", {
        p_task_id: taskId,
        p_min_minutes: estimateMin,
        p_max_minutes: estimateMax,
        p_note: estimateNote,
      });
      if (error) return fail(errorMessage(error));
    }
  }

  if (assigneeId !== undefined && assigneeId !== task.assignee_id) {
    if (assigneeId == null) {
      return fail("Check the highlighted fields.", { assigneeId: ["Choose a person."] });
    }
    const { error } = await supabase.rpc("assign_task", { p_task_id: taskId, p_assignee_id: assigneeId });
    if (error?.message === "assignee_not_member") {
      return fail("Check the highlighted fields.", { assigneeId: ["This person isn't a member of the project."] });
    }
    if (error) return fail(errorMessage(error));
  }

  revalidateTask(taskId, task.project_id);
  return ok();
}

export async function deleteTask(input: TaskIdInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const task = await supabase.from("tasks").select("project_id").eq("id", parsed.data.taskId).maybeSingle();
  if (task.error || !task.data) return fail(errorMessage({ message: "task_not_found" }));

  const { error } = await supabase.rpc("delete_task", { p_task_id: parsed.data.taskId });
  if (error) return fail(errorMessage(error));

  revalidateProject(task.data.project_id);
  redirect(`/projects/${task.data.project_id}`);
}

export async function addComment(input: AddCommentInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("add_comment", { p_task_id: parsed.data.taskId, p_body: parsed.data.body });
  if (error) return fail(errorMessage(error));

  revalidatePath(`/tasks/${parsed.data.taskId}`);
  return ok();
}

export async function editComment(input: EditCommentInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = editCommentSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("edit_comment", {
    p_comment_id: parsed.data.commentId,
    p_body: parsed.data.body,
  });
  if (error) return fail(errorMessage(error));

  revalidatePath(`/tasks/${parsed.data.taskId}`);
  return ok();
}

export async function deleteComment(input: DeleteCommentInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("delete_comment", { p_comment_id: parsed.data.commentId });
  if (error) return fail(errorMessage(error));

  revalidatePath(`/tasks/${parsed.data.taskId}`);
  return ok();
}

export async function addTaskLink(input: AddLinkInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = addLinkSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("add_task_link", {
    p_task_id: parsed.data.taskId,
    p_url: parsed.data.url,
    ...(parsed.data.label ? { p_label: parsed.data.label } : {}),
  });
  if (error) return fail(errorMessage(error));

  revalidatePath(`/tasks/${parsed.data.taskId}`);
  return ok();
}

export async function removeTaskLink(input: RemoveLinkInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = removeLinkSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("remove_task_link", { p_link_id: parsed.data.linkId });
  if (error) return fail(errorMessage(error));

  revalidatePath(`/tasks/${parsed.data.taskId}`);
  return ok();
}

function revalidateProject(projectId: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

function revalidateTask(taskId: string, projectId: string) {
  revalidateProject(projectId);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/tasks/${taskId}/edit`);
}
