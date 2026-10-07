"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InvitationDelivery } from "@/lib/people/schemas";

type LinkDelivery = Extract<InvitationDelivery, { delivered: "link" }>;

export function InviteLinkDialog({
  delivery,
  onClose,
}: {
  delivery: LinkDelivery | null;
  onClose: () => void;
}) {
  const url = delivery?.inviteUrl ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link. Select it and copy it yourself.");
    }
  }

  return (
    <Dialog open={delivery != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy the invitation link</DialogTitle>
          <DialogDescription>
            {delivery?.reason === "failed"
              ? "The email could not be sent, so this link is shown once. It works for 7 days. Resend creates a new link."
              : "Email isn't set up, so this link is shown once. It works for 7 days. Resend creates a new link."}
          </DialogDescription>
        </DialogHeader>
        <p className="break-all rounded-sm bg-muted px-3 py-2 font-mono text-caption">{url}</p>
        <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={copy}>
            Copy Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useInvitationDelivery() {
  const [delivery, setDelivery] = useState<LinkDelivery | null>(null);

  function show(result: InvitationDelivery) {
    if (result.delivered === "link") setDelivery(result);
    else toast.success("Invitation sent.");
  }

  return { delivery, show, clear: () => setDelivery(null) };
}
