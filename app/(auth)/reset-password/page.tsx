import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { RECOVERY_GRANT_COOKIE } from "@/lib/auth/recovery";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Choose a new password · Olifant Workboard" };

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const hasGrant = !!claims?.sub && cookieStore.get(RECOVERY_GRANT_COOKIE)?.value === claims.sub;

  if (!hasGrant) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-heading-md">This link has expired</h1>
          <CardDescription>
            Password reset links work once and only for a short time. Request a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password" className={buttonVariants({ className: "w-full" })}>
            Request a New Link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-heading-md">Choose a new password</h1>
        <CardDescription>You&apos;ll be signed in once it&apos;s saved.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm email={claims?.email ?? ""} />
      </CardContent>
    </Card>
  );
}
