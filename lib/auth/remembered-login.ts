// The sign-in form stores one email and password in this browser when Remember me
// is on (PRD §6.1). Sign-out leaves it in place so the next visit can fill it in.
export const REMEMBERED_LOGIN_KEY = "ow-remembered-login";

export type RememberedLogin = { email: string; password: string };

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

function browserStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function readRememberedLogin(): RememberedLogin | null {
  const store = browserStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedLogin>;
    if (typeof parsed.email !== "string" || typeof parsed.password !== "string") return null;
    const email = normalizeLoginEmail(parsed.email);
    if (!email || !parsed.password) return null;
    return { email, password: parsed.password };
  } catch {
    return null;
  }
}

export function writeRememberedLogin(email: string, password: string) {
  const store = browserStorage();
  if (!store || !password) return;
  store.setItem(
    REMEMBERED_LOGIN_KEY,
    JSON.stringify({ email: normalizeLoginEmail(email), password }),
  );
}

export function clearRememberedLogin() {
  browserStorage()?.removeItem(REMEMBERED_LOGIN_KEY);
}

/** The stored password when the typed email is that account, otherwise null. */
export function rememberedPasswordFor(saved: RememberedLogin | null, email: string): string | null {
  if (!saved) return null;
  if (normalizeLoginEmail(email) !== saved.email) return null;
  return saved.password;
}
