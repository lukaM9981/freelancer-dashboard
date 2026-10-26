import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { REMEMBER_COOKIE, applyRemember, prefersPersistentSession } from "@/lib/auth/remember";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request,
  });

  const remember = prefersPersistentSession(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, applyRemember(options, remember))
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    },
  );

  // Refresh the session. Skipping this leaves expired tokens in place and
  // signs users out at random.
  const { data } = await supabase.auth.getClaims()

  return {
    supabase,
    userId: data?.claims.sub ?? null,
    // setAll replaces the response, so read it only after the last auth call.
    response: () => supabaseResponse,
  }
};
