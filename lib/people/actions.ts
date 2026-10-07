"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { appUrl } from "@/lib/auth/urls";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { requireAdmin } from "@/lib/auth/queries";
import { errorMessage } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";
import { invitationEmailConfigured, sendInvitationEmail } from "@/lib/email/send-invitation";
import { generateInvitationToken, hashInvitationToken } from "@/lib/invitations/tokens";
import { rateDecimal } from "@/lib/people/rates";
import {
  type AddRateInput,
  type InvitationDelivery,
  type InviteInput,
  type SetRoleInput,
  addRateSchema,
  deleteRateSchema,
  invitationIdSchema,
  inviteSchema,
  personIdSchema,
  setRoleSchema,
} from "@/lib/people/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

const BAN_DURATION = "876000h";

type SessionClient = ReturnType<typeof createClient>;

export async function invitePerson(input: InviteInput): Promise<ActionResult<InvitationDelivery>> {
  const viewer = await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const token = generateInvitationToken();
  const inviteUrl = invitationUrl(token);
  if (!inviteUrl) return fail("The app address isn't configured, so the invitation link can't be created.");

  const supabase = createClient(await cookies());
  const { data: invitationId, error } = await supabase.rpc("create_invitation", {
    p_email: parsed.data.email,
    p_full_name: parsed.data.fullName,
    p_role: parsed.data.role,
    p_token_hash: hashInvitationToken(token),
  });
  if (error || !invitationId) return fail(errorMessage(error));

  const delivery = await deliverInvitation(supabase, {
    invitationId,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    inviteUrl,
    replyTo: viewer.email,
  });
  revalidatePath("/people");
  return ok(delivery);
}

export async function resendInvitation(input: {
  invitationId: string;
}): Promise<ActionResult<InvitationDelivery>> {
  const viewer = await requireAdmin();
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data: invitation, error: lookupError } = await supabase
    .from("invitations")
    .select("id, email, full_name")
    .eq("id", parsed.data.invitationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();
  if (lookupError) return fail(errorMessage(lookupError));
  if (!invitation) return fail("This invitation was already accepted or revoked.");

  const token = generateInvitationToken();
  const inviteUrl = invitationUrl(token);
  if (!inviteUrl) return fail("The app address isn't configured, so the invitation link can't be created.");

  const { error } = await supabase.rpc("renew_invitation", {
    p_invitation_id: invitation.id,
    p_token_hash: hashInvitationToken(token),
  });
  if (error) return fail(errorMessage(error));

  const delivery = await deliverInvitation(supabase, {
    invitationId: invitation.id,
    email: invitation.email,
    fullName: invitation.full_name,
    inviteUrl,
    replyTo: viewer.email,
  });
  revalidatePath("/people");
  return ok(delivery);
}

export async function revokeInvitation(input: { invitationId: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("revoke_invitation", {
    p_invitation_id: parsed.data.invitationId,
  });
  if (error) return fail(errorMessage(error));
  revalidatePath("/people");
  return ok();
}

export async function setPersonRole(input: SetRoleInput): Promise<ActionResult> {
  const viewer = await requireAdmin();
  const parsed = setRoleSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("set_person_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return fail(errorMessage(error));

  revalidatePath("/people");
  revalidatePath(`/people/${parsed.data.userId}`);
  if (viewer.id === parsed.data.userId && parsed.data.role === "freelancer") {
    redirect("/dashboard");
  }
  return ok();
}

export async function deactivatePerson(input: { userId: string }): Promise<ActionResult> {
  const viewer = await requireAdmin();
  const parsed = personIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("deactivate_person", { p_user_id: parsed.data.userId });
  if (error) return fail(errorMessage(error));

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: BAN_DURATION,
  });
  if (banError) {
    console.error("Failed to block sign-in after deactivation", banError);
    return fail("This person was deactivated, but their sign-in could not be blocked. Try again.");
  }

  revalidatePath("/people");
  revalidatePath(`/people/${parsed.data.userId}`);
  if (viewer.id === parsed.data.userId) {
    await supabase.auth.signOut();
    redirect(LOGIN_PATH);
  }
  return ok();
}

export async function reactivatePerson(input: { userId: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = personIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("reactivate_person", { p_user_id: parsed.data.userId });
  if (error) return fail(errorMessage(error));

  const admin = createAdminClient();
  const { error: unbanError } = await admin.auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: "none",
  });
  if (unbanError) {
    console.error("Failed to restore sign-in after reactivation", unbanError);
    return fail("This person was reactivated, but their sign-in could not be restored. Try again.");
  }

  revalidatePath("/people");
  revalidatePath(`/people/${parsed.data.userId}`);
  return ok();
}

export async function addRate(input: AddRateInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = addRateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.userId)
    .maybeSingle();
  if (profileError) return fail(errorMessage(profileError));
  if (!profile) return fail("This person doesn't exist, or you can't see them.");
  if (profile.role !== "freelancer") {
    return fail("Rates are set on freelancers.");
  }

  const { error } = await supabase.rpc("add_rate", {
    p_user_id: parsed.data.userId,
    p_hourly_rate: rateDecimal(parsed.data.amount) as unknown as number,
    p_currency: parsed.data.currency,
    p_effective_from: parsed.data.effectiveFrom,
  });
  if (error?.code === "23505") {
    return fail("A rate already starts on this date.", {
      effectiveFrom: ["A rate already starts on this date."],
    });
  }
  if (error) return fail(errorMessage(error));

  revalidatePath("/people");
  revalidatePath(`/people/${parsed.data.userId}`);
  return ok();
}

export async function deleteRate(input: { rateId: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteRateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data: rate, error: lookupError } = await supabase
    .from("rates")
    .select("user_id")
    .eq("id", parsed.data.rateId)
    .maybeSingle();
  if (lookupError) return fail(errorMessage(lookupError));
  if (!rate) return fail("This rate doesn't exist, or you can't see it.");

  const { error } = await supabase.rpc("delete_rate", { p_rate_id: parsed.data.rateId });
  if (error) return fail(errorMessage(error));

  revalidatePath("/people");
  revalidatePath(`/people/${rate.user_id}`);
  return ok();
}

function invitationUrl(token: string): string | null {
  if (!process.env.NEXT_PUBLIC_APP_URL) return null;
  return appUrl(`/invite/${token}`);
}

async function deliverInvitation(
  supabase: SessionClient,
  input: { invitationId: string; email: string; fullName: string; inviteUrl: string; replyTo: string },
): Promise<InvitationDelivery> {
  if (!invitationEmailConfigured()) {
    return { delivered: "link", inviteUrl: input.inviteUrl, reason: "unconfigured" };
  }

  const sent = await sendInvitationEmail({
    to: input.email,
    fullName: input.fullName,
    inviteUrl: input.inviteUrl,
    replyTo: input.replyTo,
  });
  if (sent.ok) return { delivered: "email" };

  console.error("Invitation email failed", sent.error);
  const { error } = await supabase.rpc("record_invitation_send_error", {
    p_invitation_id: input.invitationId,
    p_error: sent.error,
  });
  if (error) console.error("Could not store the invitation email error", error);
  return { delivered: "link", inviteUrl: input.inviteUrl, reason: "failed" };
}
