"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextareaField } from "@/components/textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { closeMonth, reopenMonth } from "@/lib/months/actions";
import { type ReopenReasonValues, reopenReasonSchema } from "@/lib/months/schemas";
import { applyFieldErrors } from "@/lib/forms";

export function MonthActions({
  month,
  label,
  canClose,
  canReopen,
  warnings,
}: {
  month: string;
  label: string;
  canClose: boolean;
  canReopen: boolean;
  warnings: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"close" | "reopen" | null>(null);
  const [pending, setPending] = useState(false);
  const form = useForm<ReopenReasonValues>({
    resolver: zodResolver(reopenReasonSchema),
    defaultValues: { reason: "" },
  });

  function dismiss(next: boolean) {
    if (next) return;
    setOpen(null);
    form.reset();
  }

  async function confirmClose() {
    setPending(true);
    const result = await closeMonth({ month });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(null);
    toast.success(`${label} is closed.`);
    router.refresh();
  }

  async function confirmReopen(values: ReopenReasonValues) {
    setPending(true);
    const result = await reopenMonth({ month, reason: values.reason });
    setPending(false);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    setOpen(null);
    form.reset();
    toast.success(`${label} is open again.`);
    router.refresh();
  }

  return (
    <>
      {canClose ? (
        <Button type="button" disabled={pending} onClick={() => setOpen("close")}>
          Close Month
        </Button>
      ) : null}
      {canReopen ? (
        <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen("reopen")}>
          Reopen Month
        </Button>
      ) : null}

      <Dialog open={open === "close"} onOpenChange={dismiss}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close {label}?</DialogTitle>
            <DialogDescription>
              Time in this month locks, and the amounts freeze. Later changes to rates or limits won&apos;t change
              them.
            </DialogDescription>
          </DialogHeader>
          {warnings.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-body-sm">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" disabled={pending} onClick={() => dismiss(false)}>
              Cancel
            </Button>
            <SubmitButton type="button" pending={pending} onClick={confirmClose}>
              Close Month
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "reopen"} onOpenChange={dismiss}>
        <DialogContent>
          <form onSubmit={form.handleSubmit(confirmReopen)} noValidate className="flex flex-col gap-6">
            <DialogHeader>
              <DialogTitle>Reopen {label}?</DialogTitle>
              <DialogDescription>
                Frozen amounts are discarded until the month is closed again. Only the most recently closed month can
                be reopened.
              </DialogDescription>
            </DialogHeader>
            <TextareaField control={form.control} name="reason" label="Reason" rows={3} />
            <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
              <Button type="button" variant="outline" disabled={pending} onClick={() => dismiss(false)}>
                Cancel
              </Button>
              <SubmitButton pending={pending}>Reopen Month</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
