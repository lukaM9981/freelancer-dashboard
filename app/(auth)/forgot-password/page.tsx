import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Notice } from "@/components/auth/notice";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset your password · Olifant Workboard" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <h1 className="text-heading-md">Reset your password</h1>
        <CardDescription>
          Enter the email you sign in with and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error === "link-expired" && (
          <Notice variant="error">
            That reset link has expired or was already used. Request a new one below.
          </Notice>
        )}
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter>
        <Link href="/login" className="rounded-sm text-body-xs font-medium text-link focus-ring hover:underline underline-offset-4">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
