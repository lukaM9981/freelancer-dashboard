"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { changePassword, removeAvatar, updateAvatar, updateProfile } from "@/lib/auth/actions";
import { AVATAR_MAX_BYTES } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import {
  type ChangePasswordInput,
  type UpdateProfileInput,
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/auth/schemas";
import { applyFieldErrors } from "@/lib/forms";

export function ProfileForms({ fullName, avatarUrl }: { fullName: string; avatarUrl: string | null }) {
  return (
    <div className="flex max-w-md flex-col gap-8">
      <PhotoForm name={fullName} avatarUrl={avatarUrl} />
      <NameForm fullName={fullName} />
      <PasswordForm />
    </div>
  );
}

function PhotoForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"upload" | "remove" | null>(null);

  async function onFile(file: File | undefined) {
    if (!file || pending) return;
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("The photo must be 2 MB or smaller.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setPending("upload");
    const body = new FormData();
    body.set("photo", file);
    const result = await updateAvatar(body);
    setPending(null);
    if (inputRef.current) inputRef.current.value = "";
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Photo saved.");
    router.refresh();
  }

  async function onRemove() {
    if (pending) return;
    setPending("remove");
    const result = await removeAvatar();
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Photo removed.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-heading-xs">Photo</h2>
      <div className="flex items-center gap-4">
        <PersonAvatar name={name} src={avatarUrl} size="lg" />
        <div className="flex flex-col items-start gap-2">
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              pending && "pointer-events-none opacity-50",
            )}
          >
            {pending === "upload" ? "Uploading" : "Upload Photo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={pending != null}
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>
          {avatarUrl ? (
            <Button type="button" variant="outline" size="sm" disabled={pending != null} onClick={onRemove}>
              {pending === "remove" ? "Removing" : "Remove Photo"}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-caption text-muted-foreground">JPG, PNG, or WebP. Up to 2 MB.</p>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
        <SubmitButton pending={form.formState.isSubmitting} variant="secondary">
          Change Password
        </SubmitButton>
      </div>
    </form>
  );
}
