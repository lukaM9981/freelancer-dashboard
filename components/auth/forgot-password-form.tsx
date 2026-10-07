"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Notice } from "@/components/auth/notice";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { FieldGroup } from "@/components/ui/field";
import { requestPasswordReset } from "@/lib/auth/actions";
import { type ForgotPasswordInput, forgotPasswordSchema } from "@/lib/auth/schemas";
import { applyFieldErrors } from "@/lib/forms";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    const result = await requestPasswordReset(values);
    if (result.ok) {
      setSentTo(values.email);
      return;
    }
    applyFieldErrors(form.setError, result.fieldErrors);
    toast.error(result.error);
  }

  if (sentTo) {
    return (
      <Notice variant="success">
        If an account exists for <span className="font-bold">{sentTo}</span>, we&apos;ve sent it a
        link to choose a new password. The link works once.
      </Notice>
    );
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
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting} className="w-full">
        Send Reset Link
      </SubmitButton>
    </form>
  );
}
