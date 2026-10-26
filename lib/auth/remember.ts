import type { CookieOptions } from "@supabase/ssr";

// `0` means the auth cookies are session cookies. Anything else, including no
// cookie, keeps the persistent session Supabase already issues (Tech.md §5.1).
export const REMEMBER_COOKIE = "ow-remember";

const preferenceBase = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function prefersPersistentSession(value: string | undefined): boolean {
  return value !== "0";
}

/** Delete the preference when remembering; store `0` as a session cookie otherwise. */
export function rememberPreferenceCookie(remember: boolean) {
  return remember ? { ...preferenceBase, maxAge: 0 } : preferenceBase;
}

export function clearRememberPreferenceCookie() {
  return { ...preferenceBase, maxAge: 0 };
}

// `@supabase/ssr` forces a 400-day maxAge on every write. Drop it so the browser
// treats the cookie as a session cookie. A deletion (maxAge 0) must stay a deletion.
export function applyRemember<T extends CookieOptions>(options: T, remember: boolean): T {
  if (remember || options.maxAge === 0) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest as T;
}
