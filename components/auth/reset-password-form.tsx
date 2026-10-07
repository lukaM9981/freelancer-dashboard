"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { FieldGroup } from "@/components/ui/field";
import { resetPassword } from "@/lib/auth/actions";
import {
  PASSWORD_MIN_LENGTH,
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/lib/auth/schemas";
import { applyFieldErrors } from "@/lib/forms";

export function ResetPasswordForm({ email }: { email: string }) {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    const result = await resetPassword(values);
    if (result && !result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <FieldGroup>
        <TextField
          control={form.control}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          autoFocus
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting} className="w-full">
        Save Password
      </SubmitButton>
    </form>
  );
}
