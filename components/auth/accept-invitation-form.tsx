"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type AcceptInvitationInput,
  PASSWORD_MIN_LENGTH,
  acceptInvitationSchema,
} from "@/lib/auth/schemas";
import { applyFieldErrors } from "@/lib/forms";
import { acceptInvitation } from "@/lib/invitations/actions";

type AcceptInvitationFormProps = {
  token: string;
  email: string;
  fullName: string;
};

export function AcceptInvitationForm({ token, email, fullName }: AcceptInvitationFormProps) {
  const form = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token, fullName, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: AcceptInvitationInput) {
    const result = await acceptInvitation(values);
    if (result && !result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field-email">Email</FieldLabel>
          <Input id="field-email" type="email" value={email} autoComplete="username" readOnly />
        </Field>
        <TextField
          control={form.control}
          name="fullName"
          label="Your name"
          autoComplete="name"
        />
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          autoFocus
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
        />
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting} className="w-full">
        Create Account
      </SubmitButton>
    </form>
  );
}
