import { GENERIC_ERROR } from "@/lib/db/errors";

// Supabase Auth error codes (AuthError.code) that the auth screens can run into.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "The email or password is incorrect.",
  user_banned: "This account is deactivated. Ask Olifant to reactivate it.",
  email_not_confirmed: "This email address isn't confirmed yet. Use the link from your invitation.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  over_email_send_rate_limit: "Too many emails were sent. Wait a few minutes and try again.",
  same_password: "Choose a password different from your current one.",
  weak_password: "This password is too weak. Choose a longer or less common one.",
  email_exists: "An account with this email already exists. Sign in instead.",
  user_already_exists: "An account with this email already exists. Sign in instead.",
};

export function authErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code && error.code in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[error.code];
  console.error("Unmapped auth error", error);
  return GENERIC_ERROR;
}
