"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { FieldGroup } from "@/components/ui/field";
import { signIn } from "@/lib/auth/actions";
import { type LoginInput, loginSchema } from "@/lib/auth/schemas";
import { applyFieldErrors } from "@/lib/forms";

export function LoginForm({ next }: { next?: string }) {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    const result = await signIn(values, next);
    if (result && !result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
        />
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          description={
            <Link href="/forgot-password" className="rounded-sm focus-ring">
              Forgot your password?
            </Link>
          }
        />
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting} className="w-full">
        Sign In
      </SubmitButton>
    </form>
  );
}
