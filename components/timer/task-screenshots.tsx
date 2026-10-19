"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { deleteTimerScreenshot } from "@/lib/time/actions";
import type { TaskScreenshot } from "@/lib/time/screenshots";
import { formatDateTime } from "@/lib/format";

/** The screen captures for one task. A freelancer can hide their own; an Admin still sees it. */
export function TaskScreenshots({
  shots,
  timeZone,
  canDelete,
}: {
  shots: TaskScreenshot[];
  timeZone: string;
  canDelete: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function remove(id: string) {
    setPendingId(id);
    const result = await deleteTimerScreenshot({ id });
    setPendingId(null);
    setConfirmId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Screenshot deleted. Olifant has been notified.");
  }

  if (shots.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-heading-xs">Screenshots</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shots.map((shot) => (
          <li key={shot.id} className="overflow-hidden rounded-lg border border-border bg-card">
            {shot.url ? (
              // Signed URL of a private screenshot. next/image would need the storage host configured.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shot.url}
                alt={`Screenshot from ${formatDateTime(shot.capturedAt, timeZone)}`}
                className="aspect-video w-full bg-muted object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted text-caption text-muted-foreground">
                Screenshot unavailable
              </div>
            )}
            <div className="flex items-center justify-between gap-3 p-3">
              <p className="text-caption text-muted-foreground">{formatDateTime(shot.capturedAt, timeZone)}</p>
              {shot.deletedAt ? (
                <p className="text-caption text-muted-foreground">Deleted by the freelancer</p>
              ) : canDelete ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmId(shot.id)}>
                  Delete
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={confirmId != null} onOpenChange={(open) => (open ? null : setConfirmId(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this screenshot?</DialogTitle>
            <DialogDescription>
              It disappears from your view. Olifant keeps the image and is notified that you deleted it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <SubmitButton
              type="button"
              variant="destructive"
              pending={pendingId != null}
              onClick={() => confirmId && void remove(confirmId)}
            >
              Delete
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
