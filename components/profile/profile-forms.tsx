"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { FieldGroup } from "@/components/ui/field";
import { changePassword, updateProfile } from "@/lib/auth/actions";
import {
  type ChangePasswordInput,
  type UpdateProfileInput,
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/auth/schemas";
import { applyFieldErrors } from "@/lib/forms";

export function ProfileForms({ fullName }: { fullName: string }) {
  return (
    <div className="flex max-w-md flex-col gap-8">
      <NameForm fullName={fullName} />
      <PasswordForm />
    </div>
  );
}

function NameForm({ fullName }: { fullName: string }) {
  const router = useRouter();
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName },
  });

  async function onSubmit(values: UpdateProfileInput) {
    const result = await updateProfile(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Name saved.");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <h2 className="text-heading-xs">Name</h2>
      <FieldGroup>
        <TextField control={form.control} name="fullName" label="Name" autoComplete="name" />
      </FieldGroup>
      <div className="flex justify-end">
        <SubmitButton pending={form.formState.isSubmitting}>Save Name</SubmitButton>
      </div>
    </form>
  );
}

function PasswordForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    const result = await changePassword(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    form.reset();
    toast.success("Password updated.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <h2 className="text-heading-xs">Password</h2>
      <FieldGroup>
        <TextField
          control={form.control}
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
        />
        <TextField
          control={form.control}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          description="8 to 72 characters."
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
      </FieldGroup>
      <div className="flex justify-end">
        <SubmitButton pending={form.formState.isSubmitting} variant="secondary">
          Change Password
        </SubmitButton>
      </div>
    </form>
  );
}
