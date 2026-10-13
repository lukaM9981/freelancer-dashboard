"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/queries";
import { errorMessage } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";
import { scheduleEmailDispatch } from "@/lib/email/dispatch";
import {
  type ProjectFormInput,
  type ProjectMemberInput,
  type SetProjectStatusInput,
  type UpdateProjectInput,
  projectFormSchema,
  projectMemberSchema,
  setProjectStatusSchema,
  updateProjectSchema,
} from "@/lib/projects/schemas";

export async function createProject(input: ProjectFormInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_name: parsed.data.name,
    p_description: parsed.data.description,
  });
  if (error || !projectId) return fail(errorMessage(error));

  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateProject(input: UpdateProjectInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("update_project", {
    p_project_id: parsed.data.projectId,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
  });
  if (error) return fail(errorMessage(error));

  revalidateProject(parsed.data.projectId);
  return ok();
}

export async function setProjectStatus(input: SetProjectStatusInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = setProjectStatusSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("set_project_status", {
    p_project_id: parsed.data.projectId,
    p_status: parsed.data.status,
  });
  if (error) return fail(errorMessage(error));

  scheduleEmailDispatch();
  revalidateProject(parsed.data.projectId);
  return ok();
}

export async function addProjectMember(input: ProjectMemberInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = projectMemberSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("add_project_member", {
    p_project_id: parsed.data.projectId,
    p_user_id: parsed.data.userId,
  });
  if (error?.message === "person_not_active") {
    return fail("This person is deactivated. Reactivate them before adding them to a project.");
  }
  if (error) return fail(errorMessage(error));

  revalidateProject(parsed.data.projectId, parsed.data.userId);
  return ok();
}

export async function removeProjectMember(input: ProjectMemberInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = projectMemberSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("remove_project_member", {
    p_project_id: parsed.data.projectId,
    p_user_id: parsed.data.userId,
  });
  if (error) return fail(errorMessage(error));

  revalidateProject(parsed.data.projectId, parsed.data.userId);
  return ok();
}

function revalidateProject(projectId: string, userId?: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/people");
  if (userId) revalidatePath(`/people/${userId}`);
}
