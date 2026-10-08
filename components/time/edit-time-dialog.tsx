"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { DurationField } from "@/components/time/duration-field";
import { SubmitButton } from "@/components/submit-button";
import { TextareaField } from "@/components/textarea-field";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCalendarDate, formatDuration } from "@/lib/format";
import { applyFieldErrors } from "@/lib/forms";
import { updateManualEntry, updateTimedEntry } from "@/lib/time/actions";
import { entryEditDefaults, resolveEntryEdit } from "@/lib/time/run";
import {
  type UpdateManualEntryInput,
  type UpdateTimedEntryInput,
  updateManualEntrySchema,
  updateTimedEntrySchema,
} from "@/lib/time/schemas";

export type EditableEntry = {
  id: string;
  description: string;
  workDate: string;
  source: "timer" | "manual";
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  dateMin: string;
  dateMax: string;
  timeZone: string;
};

export function EditTimeButton({
  entry,
  viewedMonth,
  currentMonth,
}: {
  entry: EditableEntry;
  /** `yyyy-MM`. Set on My time so an entry moved to another month opens there. */
  viewedMonth?: string;
  currentMonth?: string;
}) {
  const [open, setOpen] = useState(false);
  const dateLabel = formatCalendarDate(entry.workDate);
  const startedAt = entry.startedAt;
  const endedAt = entry.endedAt;
  const timed = entry.source === "timer" && startedAt != null && endedAt != null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit the entry on ${dateLabel}`}
              onClick={() => setOpen(true)}
            >
              <PencilIcon />
            </Button>
          }
        />
        <TooltipContent>Edit entry</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {open && timed ? (
            <TimedForm
              entry={{ ...entry, startedAt, endedAt }}
              viewedMonth={viewedMonth}
              currentMonth={currentMonth}
              onDone={() => setOpen(false)}
            />
          ) : null}
          {open && !timed ? (
            <ManualForm
              entry={entry}
              viewedMonth={viewedMonth}
              currentMonth={currentMonth}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function afterSave(
  router: { push: (href: string) => void; refresh: () => void },
  workDate: string,
  viewedMonth?: string,
  currentMonth?: string,
) {
  const saved = workDate.slice(0, 7);
  if (viewedMonth && currentMonth && saved !== viewedMonth) {
    router.push(saved === currentMonth ? "/time" : `/time?month=${saved}`);
    return;
  }
  router.refresh();
}

function ManualForm({
  entry,
  viewedMonth,
  currentMonth,
  onDone,
}: {
  entry: EditableEntry;
  viewedMonth?: string;
  currentMonth?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const dateMin = entry.workDate < entry.dateMin ? entry.workDate : entry.dateMin;
  const dateMax = entry.workDate > entry.dateMax ? entry.workDate : entry.dateMax;
  const form = useForm<UpdateManualEntryInput>({
    resolver: zodResolver(updateManualEntrySchema),
    defaultValues: {
      entryId: entry.id,
      workDate: entry.workDate,
      minutes: entry.durationMinutes,
      description: entry.description,
    },
  });

  async function onSubmit(values: UpdateManualEntryInput) {
    const result = await updateManualEntry(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Time saved.");
    onDone();
    afterSave(router, values.workDate, viewedMonth, currentMonth);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Edit time</DialogTitle>
        <DialogDescription>
          Change the date, duration, or description. The task stays the same.
        </DialogDescription>
      </DialogHeader>
      <TextField
        control={form.control}
        name="workDate"
        id={`edit-date-${entry.id}`}
        label="Date"
        type="date"
        min={dateMin}
        max={dateMax}
        description={`From ${formatCalendarDate(dateMin)} to today.`}
      />
      <DurationField
        control={form.control}
        name="minutes"
        id={`edit-duration-${entry.id}`}
        defaultText={formatDuration(entry.durationMinutes)}
      />
      <TextareaField
        control={form.control}
        name="description"
        id={`edit-description-${entry.id}`}
        label="What did you work on?"
      />
      <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pending={form.formState.isSubmitting}>Save Time</SubmitButton>
      </DialogFooter>
    </form>
  );
}

function TimedForm({
  entry,
  viewedMonth,
  currentMonth,
  onDone,
}: {
  entry: EditableEntry & { startedAt: string; endedAt: string };
  viewedMonth?: string;
  currentMonth?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const dateMin = entry.workDate < entry.dateMin ? entry.workDate : entry.dateMin;
  const dateMax = entry.workDate > entry.dateMax ? entry.workDate : entry.dateMax;
  const defaults = entryEditDefaults(entry.startedAt, entry.endedAt, entry.timeZone);
  const form = useForm<UpdateTimedEntryInput>({
    resolver: zodResolver(updateTimedEntrySchema),
    defaultValues: {
      entryId: entry.id,
      description: entry.description,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      ...defaults,
    },
  });
  const fields = useWatch({ control: form.control });
  const resolved = resolveEntryEdit(
    {
      workDate: fields.workDate ?? defaults.workDate,
      startTime: fields.startTime ?? defaults.startTime,
      endTime: fields.endTime ?? defaults.endTime,
      endsAtMidnight: fields.endsAtMidnight ?? defaults.endsAtMidnight,
    },
    entry,
    entry.timeZone,
  );

  async function onSubmit(values: UpdateTimedEntryInput) {
    const result = await updateTimedEntry(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Time saved.");
    onDone();
    afterSave(router, values.workDate, viewedMonth, currentMonth);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Edit time</DialogTitle>
        <DialogDescription>
          Change the start and end on one day, or the description. The entry stays marked as timed.
        </DialogDescription>
      </DialogHeader>
      <TextField
        control={form.control}
        name="workDate"
        id={`edit-date-${entry.id}`}
        label="Date"
        type="date"
        min={dateMin}
        max={dateMax}
        description={`From ${formatCalendarDate(dateMin)} to today.`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="startTime"
          id={`edit-start-${entry.id}`}
          label="Start"
          type="time"
          step={60}
          className="font-mono numeric"
        />
        <TextField
          control={form.control}
          name="endTime"
          id={`edit-end-${entry.id}`}
          label="End"
          type="time"
          step={60}
          className="font-mono numeric"
          disabled={fields.endsAtMidnight === true}
          description={fields.endsAtMidnight ? "Ends at midnight." : undefined}
        />
      </div>
      <div className="flex items-center gap-3">
        <Checkbox
          id={`edit-midnight-${entry.id}`}
          checked={fields.endsAtMidnight === true}
          onCheckedChange={(checked) => form.setValue("endsAtMidnight", checked === true)}
        />
        <FieldLabel htmlFor={`edit-midnight-${entry.id}`}>Ends at midnight</FieldLabel>
      </div>
      <p className="flex items-baseline justify-between gap-3 rounded-sm bg-muted px-4 py-3 text-body-sm">
        <span className="font-medium">Duration</span>
        <span className="numeric">{resolved.ok ? formatDuration(resolved.minutes) : "\u2014"}</span>
      </p>
      <TextareaField
        control={form.control}
        name="description"
        id={`edit-description-${entry.id}`}
        label="What did you work on?"
      />
      <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pending={form.formState.isSubmitting}>Save Time</SubmitButton>
      </DialogFooter>
    </form>
  );
}
