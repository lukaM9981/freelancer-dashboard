"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { TextareaField } from "@/components/textarea-field";
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
import { FieldError, FieldLabel } from "@/components/ui/field";
import type { TimerTask } from "@/components/timer/timer-provider";
import { applyFieldErrors } from "@/lib/forms";
import { formatCalendarDate, formatDuration } from "@/lib/format";
import { discardTimer, stopTimer } from "@/lib/time/actions";
import type { RunningTimer } from "@/lib/time/queries";
import { LONG_RUN_MS, localParts, resolveRun, splitRun, stopRange } from "@/lib/time/run";
import { type TimerReviewValues, timerReviewSchema } from "@/lib/time/schemas";

type TimerReviewDialogProps = {
  timer: RunningTimer;
  /** When Stop was pressed, on the server's clock. The run can't end later. */
  stoppedAt: number;
  /** The task to start once this run is saved or discarded. */
  then: TimerTask | null;
  timeZone: string;
  onCancel: () => void;
  onFinished: (announcement: string) => void;
};

/** The review shown when a timer stops (PRD §5.5, §6.8; Design.md §5.4). */
export function TimerReviewDialog({ timer, stoppedAt, then, timeZone, onCancel, onFinished }: TimerReviewDialogProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const run = useMemo(
    () => ({ startedAt: new Date(timer.startedAt), stoppedAt: new Date(stoppedAt), timeZone }),
    [timer.startedAt, stoppedAt, timeZone],
  );
  const initialStart = localParts(run.startedAt, timeZone);
  const initialEnd = localParts(run.stoppedAt, timeZone);
  const spansDays = initialStart.date !== initialEnd.date;
  const longRun = run.stoppedAt.getTime() - run.startedAt.getTime() > LONG_RUN_MS;

  const form = useForm<TimerReviewValues>({
    resolver: zodResolver(timerReviewSchema),
    defaultValues: {
      startDate: initialStart.date,
      startTime: initialStart.time,
      endDate: initialEnd.date,
      endTime: initialEnd.time,
      description: "",
      confirmEnd: false,
    },
  });
  const [startDate, startTime, endDate, endTime] = useWatch({
    control: form.control,
    name: ["startDate", "startTime", "endDate", "endTime"],
  });
  const resolved = resolveRun({ startDate, startTime, endDate, endTime }, run);
  const segments = resolved.ok ? splitRun(resolved.start, resolved.end, timeZone) : [];
  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);

  async function onSubmit(values: TimerReviewValues) {
    const range = resolveRun(values, run);
    if (!range.ok) {
      form.setError(range.field, { type: "validate", message: range.message });
      return;
    }
    if (longRun && !values.confirmEnd) {
      form.setError("confirmEnd", { type: "validate", message: "Confirm the end time, or correct it first." });
      return;
    }

    const result = await stopTimer({ ...stopRange(range, timer.startedAt), description: values.description });
    if (!result.ok) {
      if (result.code === "timer_not_running") {
        toast.info(result.error);
        onCancel();
        return;
      }
      applyFieldErrors(form.setError, result.fieldErrors);
      if (!result.fieldErrors) toast.error(result.error);
      return;
    }

    const saved = result.data.minutes;
    const message = saved > 0 ? `Saved ${formatDuration(saved)}.` : "Under a minute, so nothing was saved.";
    toast.success(message);
    onFinished(`Timer stopped. ${message}`);
  }

  async function discard() {
    setDiscarding(true);
    const result = await discardTimer();
    setDiscarding(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.code === "timer_not_running") onCancel();
      return;
    }
    toast.success("Timer discarded. Nothing was saved.");
    onFinished("Timer discarded.");
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onCancel())}>
      <DialogContent className="max-w-[min(560px,calc(100%-2rem))]">
        {confirmingDiscard ? (
          <>
            <DialogHeader>
              <DialogTitle>Discard this run?</DialogTitle>
              <DialogDescription>
                The timer stops and nothing is saved. The task history records that it was discarded.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
              <Button type="button" variant="outline" onClick={() => setConfirmingDiscard(false)}>
                Back
              </Button>
              <SubmitButton type="button" variant="destructive" pending={discarding} onClick={discard}>
                Discard
              </SubmitButton>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
            <DialogHeader>
              <DialogTitle>Save your time</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{timer.taskTitle}</span> · {timer.projectName}
                {then ? (
                  <>
                    . Then the timer starts on{" "}
                    <span className="font-medium text-foreground">{then.title}</span>.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            {longRun ? (
              <div className="flex items-start gap-2 rounded-sm border border-yellow-300 bg-yellow-50 p-3 text-body-xs">
                <TriangleAlertIcon aria-hidden className="mt-px size-4 shrink-0 text-yellow-800" />
                <p>
                  This timer ran for more than 10 hours. Check when you actually stopped working and
                  correct the end time if needed.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                {spansDays ? (
                  <TextField
                    control={form.control}
                    name="startDate"
                    id="timer-start-date"
                    label="Start date"
                    type="date"
                    min={initialStart.date}
                    max={initialEnd.date}
                  />
                ) : null}
                <TextField
                  control={form.control}
                  name="startTime"
                  id="timer-start-time"
                  label="Start"
                  type="time"
                  step={60}
                  className="font-mono numeric"
                  description={spansDays ? undefined : formatCalendarDate(initialStart.date)}
                />
              </div>
              <div className="flex flex-col gap-3">
                {spansDays ? (
                  <TextField
                    control={form.control}
                    name="endDate"
                    id="timer-end-date"
                    label="End date"
                    type="date"
                    min={initialStart.date}
                    max={initialEnd.date}
                  />
                ) : null}
                <TextField
                  control={form.control}
                  name="endTime"
                  id="timer-end-time"
                  label="End"
                  type="time"
                  step={60}
                  className="font-mono numeric"
                  description={spansDays ? undefined : formatCalendarDate(initialEnd.date)}
                />
              </div>
            </div>

            <div className="space-y-1.5 rounded-sm bg-muted px-4 py-3">
              <p className="flex items-baseline justify-between gap-3 text-body-sm">
                <span className="font-medium">Duration</span>
                <span className="numeric">{resolved.ok ? formatDuration(totalMinutes) : "\u2014"}</span>
              </p>
              {resolved.ok && segments.length > 1 ? (
                <ul className="space-y-0.5 text-caption text-muted-foreground">
                  {segments.map((segment) => (
                    <li key={segment.workDate} className="flex justify-between gap-3">
                      <span>{formatCalendarDate(segment.workDate)}</span>
                      <span className="numeric">{formatDuration(segment.minutes)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {resolved.ok && segments.length > 1 ? (
                <p className="text-caption text-muted-foreground">Saved as one entry per day.</p>
              ) : null}
              {resolved.ok && totalMinutes === 0 ? (
                <p className="text-caption text-muted-foreground">Under a minute, so nothing will be saved.</p>
              ) : null}
              <p className="text-caption text-muted-foreground">
                You can shorten the run but not extend it. Add earlier work as a manual entry.
              </p>
            </div>

            <TextareaField
              control={form.control}
              name="description"
              id="timer-description"
              label="What did you work on?"
              autoFocus
            />

            {longRun ? (
              <Controller
                control={form.control}
                name="confirmEnd"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="timer-confirm-end"
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked === true);
                          if (checked) form.clearErrors("confirmEnd");
                        }}
                        aria-invalid={fieldState.invalid}
                        aria-describedby={fieldState.invalid ? "timer-confirm-end-error" : undefined}
                      />
                      <FieldLabel htmlFor="timer-confirm-end">The end time is correct</FieldLabel>
                    </div>
                    {fieldState.invalid ? (
                      <FieldError id="timer-confirm-end-error" errors={[fieldState.error]} />
                    ) : null}
                  </div>
                )}
              />
            ) : null}

            <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setConfirmingDiscard(true)}>
                Discard
              </Button>
              <SubmitButton pending={form.formState.isSubmitting}>Save Time</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
