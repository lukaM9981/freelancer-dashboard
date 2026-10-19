"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyFieldErrors } from "@/lib/forms";
import { deactivatePerson, reactivatePerson, setPersonRole } from "@/lib/people/actions";
import { type SetRoleInput, setRoleSchema } from "@/lib/people/schemas";

const LAST_ADMIN =
  "There must always be at least one active Admin. Invite or promote another Admin first.";

export function RoleForm({
  userId,
  role,
  isLastAdmin,
}: {
  userId: string;
  role: "admin" | "freelancer";
  isLastAdmin: boolean;
}) {
  const router = useRouter();
  const form = useForm<SetRoleInput>({
    resolver: zodResolver(setRoleSchema),
    defaultValues: { userId, role },
  });

  async function onSubmit(values: SetRoleInput) {
    if (values.role === role) return;
    const result = await setPersonRole(values);
    if (result && !result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Role updated.");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <SelectField
        control={form.control}
        name="role"
        label="Role"
        description={isLastAdmin ? LAST_ADMIN : undefined}
        options={[
          { value: "admin", label: "Admin" },
          { value: "freelancer", label: "Freelancer", disabled: isLastAdmin },
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
        <SubmitButton pending={form.formState.isSubmitting} variant="outline">
          Save Role
        </SubmitButton>
      </div>
    </form>
  );
}

export function AccessActions({
  userId,
  fullName,
  status,
  isLastAdmin,
}: {
  userId: string;
  fullName: string;
  status: "active" | "deactivated";
  isLastAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const blocked = status === "active" && isLastAdmin;

  async function deactivate() {
    setPending(true);
    const result = await deactivatePerson({ userId });
    setPending(false);
    if (result && !result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success("Person deactivated.");
    router.refresh();
  }

  async function reactivate() {
    setPending(true);
    const result = await reactivatePerson({ userId });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Person reactivated.");
    router.refresh();
  }

  if (status === "deactivated") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
        <Button type="button" variant="secondary" disabled={pending} onClick={reactivate}>
          Reactivate
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
      <Button type="button" variant="destructive" disabled={blocked} onClick={() => setOpen(true)}>
        Deactivate
      </Button>
      {blocked ? <p className="max-w-sm text-right text-caption text-muted-foreground">{LAST_ADMIN}</p> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {fullName}?</DialogTitle>
            <DialogDescription>
              They can no longer sign in, and a running timer is stopped. Their history stays.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={deactivate}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
