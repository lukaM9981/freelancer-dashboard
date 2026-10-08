"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin, requireViewer } from "@/lib/auth/queries";
import { errorMessage } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";
import {
  type DecideItemInput,
  type ProposalIdInput,
  type SubmitProposalInput,
  type WithdrawItemsInput,
  decideItemSchema,
  proposalIdSchema,
  submitProposalSchema,
  withdrawItemsSchema,
} from "@/lib/proposals/schemas";

export async function submitProposal(input: SubmitProposalInput): Promise<ActionResult<{ proposalId: string }>> {
  await requireViewer();
  const parsed = submitProposalSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data: proposalId, error } = await supabase.rpc("submit_proposal", {
    p_project_id: parsed.data.projectId,
    p_task_ids: parsed.data.taskIds,
  });
  if (error || !proposalId) return fail(errorMessage(error));

  revalidateApprovals();
  return ok({ proposalId });
}

export async function withdrawItems(input: WithdrawItemsInput): Promise<ActionResult> {
  await requireViewer();
  const parsed = withdrawItemsSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("withdraw_estimates", { p_revision_ids: parsed.data.revisionIds });
  if (error) return fail(errorMessage(error));

  revalidateApprovals();
  return ok();
}

/** One decision is one action, and so at most one email to the assignee (Tech.md §7.2). */
export async function decideItem(input: DecideItemInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = decideItemSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { revisionId, decision, comment } = parsed.data;

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("decide_estimates", {
    p_decisions: [{ revision_id: revisionId, decision, ...(comment ? { comment } : {}) }],
  });
  if (error) return fail(errorMessage(error));

  revalidateApprovals();
  return ok();
}

export async function approveAllRemaining(input: ProposalIdInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = proposalIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("approve_all_remaining", { p_proposal_id: parsed.data.proposalId });
  if (error) return fail(errorMessage(error));

  revalidateApprovals();
  return ok();
}

// A decision changes the inbox, the sidebar count in the layout, and the task and project
// pages of every item, so the whole app tree is refreshed.
function revalidateApprovals() {
  revalidatePath("/", "layout");
}
