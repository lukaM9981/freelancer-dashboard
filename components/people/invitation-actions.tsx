"use client";

import { useState } from "react";
import { toast } from "sonner";
import { InviteLinkDialog, useInvitationDelivery } from "@/components/people/invite-link-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resendInvitation, revokeInvitation } from "@/lib/people/actions";

export function InvitationActions({
  invitationId,
  fullName,
}: {
  invitationId: string;
  fullName: string;
}) {
  const link = useInvitationDelivery();
  const [pending, setPending] = useState<"resend" | "revoke" | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  async function resend() {
    setPending("resend");
    const result = await resendInvitation({ invitationId });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    link.show(result.data);
  }

  async function revoke() {
    setPending("revoke");
    const result = await revokeInvitation({ invitationId });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setConfirmRevoke(false);
    toast.success("Invitation revoked.");
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending != null} onClick={resend}>
        {pending === "resend" ? "Sending" : "Resend"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending != null}
        onClick={() => setConfirmRevoke(true)}
      >
        Revoke
      </Button>
      <Dialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this invitation?</DialogTitle>
            <DialogDescription>
              The link for {fullName} will stop working. You can invite this email again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={() => setConfirmRevoke(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending === "revoke"} onClick={revoke}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InviteLinkDialog delivery={link.delivery} onClose={link.clear} />
    </div>
  );
}
