"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCalendarDate, formatDuration } from "@/lib/format";
import { deleteTimeEntry } from "@/lib/time/actions";

export function DeleteTimeButton({
  entryId,
  workDate,
  durationMinutes,
}: {
  entryId: string;
  workDate: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const dateLabel = formatCalendarDate(workDate);

  async function remove() {
    setPending(true);
    const result = await deleteTimeEntry({ entryId });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Time deleted.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete the entry on ${dateLabel}`}
              onClick={() => setOpen(true)}
            >
              <Trash2Icon />
            </Button>
          }
        />
        <TooltipContent>Delete entry</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this time entry?</DialogTitle>
            <DialogDescription>
              {formatDuration(durationMinutes)} on {dateLabel} is removed. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
