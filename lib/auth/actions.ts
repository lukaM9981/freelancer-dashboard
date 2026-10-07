"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { authErrorMessage } from "@/lib/auth/errors";
import { RECOVERY_GRANT_COOKIE } from "@/lib/auth/recovery";
import { HOME_PATH, LOGIN_PATH, safeRedirectPath } from "@/lib/auth/routes";
import { requireViewer } from "@/lib/auth/queries";
import {
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/lib/auth/schemas";
import { appUrl } from "@/lib/auth/urls";
import { ERROR_MESSAGES, errorMessage } from "@/lib/db/errors";
import { type ActionResult, fail, invalidInput, ok } from "@/lib/db/result";

export async function signIn(input: LoginInput, next?: string | null): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(authErrorMessage(error));

  // A deactivated person whose auth user isn't banned yet still gets a session; RLS
  // hides their profile, so refuse them here instead of bouncing between pages.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return fail(ERROR_MESSAGES.person_not_active);
  }

  redirect(safeRedirectPath(next));
}

export async function signOut() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: appUrl("/confirm"),
  });
  // Supabase answers the same for unknown addresses; only rate limits are worth showing.
  if (error) {
    if (error.code?.startsWith("over_")) return fail(authErrorMessage(error));
    console.error("Password reset email failed", error);
  }
  return ok();
}

export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId || cookieStore.get(RECOVERY_GRANT_COOKIE)?.value !== userId) {
    return fail("This reset link has expired. Request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(authErrorMessage(error));

  cookieStore.delete(RECOVERY_GRANT_COOKIE);
  redirect(HOME_PATH);
}

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  if (parsed.data.fullName === viewer.fullName) return ok();

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("update_my_profile", { p_full_name: parsed.data.fullName });
  if (error) return fail(errorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}

export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = createClient(await cookies());
  const { error: currentError } = await supabase.auth.signInWithPassword({
    email: viewer.email,
    password: parsed.data.currentPassword,
  });
  if (currentError) {
    if (currentError.code === "invalid_credentials") {
      return fail("The current password is incorrect.", {
        currentPassword: ["The current password is incorrect."],
      });
    }
    return fail(authErrorMessage(currentError));
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(authErrorMessage(error));
  return ok();
}
