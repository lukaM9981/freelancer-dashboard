import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Notice } from "@/components/auth/notice";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in · Olifant Workboard" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, notice } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <h1 className="text-heading-md">Sign in</h1>
        <CardDescription>Welcome back to Olifant Workboard.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {notice === "account-created" && (
          <Notice variant="success">Your account is ready. Sign in with your new password.</Notice>
        )}
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </CardContent>
    </Card>
  );
}
