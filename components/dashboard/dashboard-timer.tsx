"use client";

import Link from "next/link";
import { SquareIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/components/timer/timer-provider";
import { elapsedSeconds } from "@/components/timer/use-server-clock";
import { formatTimer } from "@/lib/format";
import { LONG_RUN_MS } from "@/lib/time/run";

/**
 * The freelancer dashboard's timer card (PRD §6.11): the running timer on the Inverse
 * card, or where to start one. Starting lives on the rows of "My active tasks".
 */
export function DashboardTimer({ canStart }: { canStart: boolean }) {
  const { timer, now, stop } = useTimer();

  if (!timer) {
    return (
      <section aria-labelledby="timer-heading" className="space-y-2 rounded-lg border border-border bg-card p-4 md:p-6">
        <h2 id="timer-heading" className="text-heading-xs">
          Timer
        </h2>
        <p className="text-body-sm text-muted-foreground">
          {canStart
            ? "No timer running. Start one on any of your active tasks below."
            : "No timer running. None of your tasks can take time right now."}
        </p>
      </section>
    );
  }

  const seconds = elapsedSeconds(timer.startedAt, now);
  const longRun = seconds * 1000 > LONG_RUN_MS;

  return (
    <section
      aria-labelledby="timer-heading"
      className="flex flex-col gap-4 rounded-lg bg-secondary p-4 text-secondary-foreground md:p-6"
    >
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <h2 id="timer-heading" className="text-heading-xs">
          Timer running
        </h2>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="eyebrow truncate text-neutral-300!">{timer.projectName}</p>
        <Link
          href={`/tasks/${timer.taskId}`}
          className="block truncate rounded-sm text-body-md font-medium underline-offset-4 hover:underline focus-ring"
        >
          {timer.taskTitle}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-heading-md numeric">{formatTimer(seconds)}</span>
          {longRun ? (
            <span className="flex items-center gap-1 text-caption text-primary">
              <TriangleAlertIcon aria-hidden className="size-4" />
              Running over 10h
            </span>
          ) : null}
        </div>
        <Button
          onClick={() => stop()}
          className="text-primary-foreground! hover:border-white hover:bg-secondary hover:text-primary!"
        >
          <SquareIcon />
          Stop Timer
        </Button>
      </div>
    </section>
  );
}
