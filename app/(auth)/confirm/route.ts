import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { RECOVERY_GRANT_COOKIE, recoveryGrantCookieOptions } from "@/lib/auth/recovery";

// Password recovery callback (Tech.md §5.4). Accepts the PKCE `?code=` and the
// `?token_hash=&type=recovery` forms. No other type is valid: there is no sign-up.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let userId: string | undefined;
  if (tokenHash && type === "recovery") {
    const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (!error) userId = data.user?.id;
  } else if (code && !tokenHash) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id;
  }

  if (!userId) redirect("/forgot-password?error=link-expired");

  cookieStore.set(RECOVERY_GRANT_COOKIE, userId, recoveryGrantCookieOptions);
  redirect("/reset-password");
}
