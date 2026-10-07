export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";

// Reachable without a session (PRD §6.1). Route handlers under /api check their own
// credentials.
const PUBLIC_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/confirm",
  "/invite/",
  "/api/",
];

// A signed-in person is sent to the dashboard from these.
const SIGNED_OUT_ONLY = ["/login", "/forgot-password"];

function matches(pathname: string, prefix: string) {
  if (prefix.endsWith("/")) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isSignedOutOnlyPath(pathname: string) {
  return SIGNED_OUT_ONLY.some((prefix) => matches(pathname, prefix));
}

/**
 * Returns a same-origin path to redirect to, or the fallback. Rejects absolute and
 * protocol-relative URLs, backslash tricks, and the auth pages themselves.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = HOME_PATH,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  // Control characters can be stripped by browsers and turn "/\t/evil.com" into "//evil.com".
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  const base = "http://localhost";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  if (isPublicPath(url.pathname)) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
