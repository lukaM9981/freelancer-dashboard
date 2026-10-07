import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import {
  HOME_PATH,
  LOGIN_PATH,
  isPublicPath,
  isSignedOutOnlyPath,
} from "@/lib/auth/routes";

// Optimistic routing only; the (app) layout and every action check again (Tech.md §5.1).
export async function proxy(request: NextRequest) {
  const { supabase, userId, response } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && !isPublicPath(pathname)) {
    const url = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return redirectKeepingCookies(url, response());
  }

  if (userId && isSignedOutOnlyPath(pathname)) {
    // RLS hides the profile from deactivated people, so this also catches a session
    // that outlived its profile. Signing it out here prevents a redirect loop with
    // requireViewer().
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (profile) return redirectKeepingCookies(new URL(HOME_PATH, request.url), response());
    await supabase.auth.signOut({ scope: "local" });
  }

  return response();
}

function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
