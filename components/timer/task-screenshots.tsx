"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/format";
import { deleteTimerScreenshot } from "@/lib/time/actions";
import type { TaskScreenshot } from "@/lib/time/screenshots";
import {
  type PeriodUnit,
  type ScreenshotPeriod,
  inPeriod,
  initialScreenshotPeriod,
  pageSlice,
  periodLabel,
  periodStepLabel,
  shiftPeriod,
  withUnit,
} from "@/lib/time/screenshot-periods";

const UNITS: { value: PeriodUnit; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** The screen captures for one task. A freelancer can hide their own; an Admin still sees it. */
export function TaskScreenshots({
  shots,
  timeZone,
  today,
  canDelete,
}: {
  shots: TaskScreenshot[];
  timeZone: string;
  /** `yyyy-MM-dd` in the organization time zone. */
  today: string;
  canDelete: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [period, setPeriod] = useState<ScreenshotPeriod>(() => {
    const newest = shots.reduce<TaskScreenshot | null>((best, shot) => {
      if (!best || new Date(shot.capturedAt).getTime() > new Date(best.capturedAt).getTime()) return shot;
      return best;
    }, null);
    return newest ? initialScreenshotPeriod(newest.capturedAt, timeZone) : { unit: "week", anchor: today };
  });
  const [page, setPage] = useState(1);

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

  const filtered = shots
    .filter((shot) => inPeriod(period, shot.capturedAt, timeZone))
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  const view = pageSlice(filtered, page);
  const label = periodLabel(period, today);

  function chooseUnit(value: unknown) {
    if (value !== "day" && value !== "week" && value !== "month") return;
    setPeriod((current) => withUnit(current, value));
    setPage(1);
  }

  function step(direction: -1 | 1) {
    setPeriod((current) => shiftPeriod(current, direction));
    setPage(1);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-heading-xs">Screenshots</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Field className="w-full sm:w-44">
          <FieldLabel htmlFor="screenshot-period">Period</FieldLabel>
          <Select
            items={Object.fromEntries(UNITS.map((unit) => [unit.value, unit.label]))}
            value={period.unit}
            onValueChange={chooseUnit}
          >
            <SelectTrigger id="screenshot-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center gap-2">
          <PeriodStep label={periodStepLabel(period.unit, "previous")} direction="previous" onStep={() => step(-1)} />
          <p className="min-w-0 text-body-sm">{label}</p>
          <PeriodStep label={periodStepLabel(period.unit, "next")} direction="next" onStep={() => step(1)} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No screenshots in this period.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {view.items.map((shot) => (
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
      )}
      {filtered.length > view.items.length || view.page > 1 ? (
        <nav aria-label="Screenshot pages" className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={view.page <= 1}
            onClick={() => setPage(view.page - 1)}
          >
            Previous
          </Button>
          <p className="numeric text-body-sm text-muted-foreground">
            Page {view.page} of {view.pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={view.page >= view.pageCount}
            onClick={() => setPage(view.page + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
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

function PeriodStep({
  label,
  direction,
  onStep,
}: {
  label: string;
  direction: "previous" | "next";
  onStep: () => void;
}) {
  const icon = direction === "previous" ? <ChevronLeftIcon /> : <ChevronRightIcon />;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button type="button" variant="outline" size="icon" aria-label={label} onClick={onStep}>
            {icon}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
