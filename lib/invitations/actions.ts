"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authErrorMessage } from "@/lib/auth/errors";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";
import { type AcceptInvitationInput, acceptInvitationSchema } from "@/lib/auth/schemas";
import { ERROR_MESSAGES } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput } from "@/lib/db/result";
import { findPendingInvitation } from "@/lib/invitations/queries";

export async function acceptInvitation(input: AcceptInvitationInput): Promise<ActionResult> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { token, fullName, password } = parsed.data;

  const invitation = await findPendingInvitation(token);
  if (!invitation) return fail(ERROR_MESSAGES.no_valid_invitation);

  // The emailed token proves ownership of the address, so the email is confirmed here.
  // app.handle_new_user creates the profile and marks the invitation accepted in the
  // same transaction (DB.md §5.1).
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });
  if (createError) return fail(authErrorMessage(createError));

  const supabase = createClient(await cookies());
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invitation.email,
    password,
  });
  if (signInError) {
    console.error("Sign-in after accepting an invitation failed", signInError);
    redirect(`${LOGIN_PATH}?notice=account-created`);
  }

  if (fullName !== invitation.fullName.trim()) {
    const { error } = await supabase.rpc("update_my_profile", { p_full_name: fullName });
    if (error) console.error("update_my_profile failed after accepting an invitation", error);
  }

  redirect(HOME_PATH);
}
