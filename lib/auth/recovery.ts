// Set by /confirm after a valid recovery link and required by the reset action
// (Tech.md §5.4). Holds the recovering user's id so it can't be reused by another session.
export const RECOVERY_GRANT_COOKIE = "recovery_grant";

export const recoveryGrantCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 15 * 60,
} as const;
