"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { InviteLinkDialog, useInvitationDelivery } from "@/components/people/invite-link-dialog";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { applyFieldErrors } from "@/lib/forms";
import { invitePerson } from "@/lib/people/actions";
import { type InviteInput, inviteSchema } from "@/lib/people/schemas";

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const link = useInvitationDelivery();
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { fullName: "", email: "", role: "freelancer" },
  });

  function close() {
    setOpen(false);
    form.reset();
  }

  async function onSubmit(values: InviteInput) {
    const result = await invitePerson(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    close();
    link.show(result.data);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogTrigger render={<Button type="button">Invite Person</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a person</DialogTitle>
            <DialogDescription>
              They get a link that works for 7 days, where they set a password and sign in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
            <FieldGroup>
              <TextField control={form.control} name="fullName" label="Name" autoComplete="name" autoFocus />
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="off"
                inputMode="email"
              />
              <SelectField
                control={form.control}
                name="role"
                label="Role"
                options={[
                  { value: "freelancer", label: "Freelancer" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </FieldGroup>
            <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <SubmitButton pending={form.formState.isSubmitting}>Send Invite</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <InviteLinkDialog delivery={link.delivery} onClose={link.clear} />
    </>
  );
}
