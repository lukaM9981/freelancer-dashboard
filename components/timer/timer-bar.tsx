"use client";

import Link from "next/link";
import { SquareIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTimer } from "@/components/timer/timer-provider";
import { elapsedSeconds } from "@/components/timer/use-server-clock";
import { formatTimer } from "@/lib/format";
import { LONG_RUN_MS } from "@/lib/time/run";
import { cn } from "@/lib/utils";

/**
 * The running timer, on every screen: in the top bar from `md`, fixed above the bottom
 * edge on phones (Design.md §5.4). The ticking clock is not announced.
 */
export function TimerBar() {
  const { timer, now, stop } = useTimer();
  if (!timer) return null;

  const seconds = elapsedSeconds(timer.startedAt, now);
  const longRun = seconds * 1000 > LONG_RUN_MS;

  return (
    <div
      role="region"
      aria-label="Running timer"
      className={cn(
        "flex h-10 min-w-0 items-center gap-3 rounded-full bg-secondary pr-1 pl-4 text-secondary-foreground shadow-md",
        "max-md:fixed max-md:inset-x-4 max-md:bottom-4 max-md:z-40 md:w-full md:max-w-xl",
      )}
    >
      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      <span className="eyebrow max-w-32 shrink-0 truncate text-neutral-300! max-sm:hidden">{timer.projectName}</span>
      <Link
        href={`/tasks/${timer.taskId}`}
        className="min-w-0 flex-1 truncate rounded-sm text-body-xs underline-offset-4 hover:underline focus-ring"
      >
        {timer.taskTitle}
      </Link>
      {longRun ? (
        <span className="flex shrink-0 items-center gap-1 text-caption text-primary">
          <TriangleAlertIcon aria-hidden className="size-4" />
          <span className="max-sm:sr-only">Running over 10h</span>
        </span>
      ) : null}
      <span className="shrink-0 font-mono text-body-sm numeric">{formatTimer(seconds)}</span>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button size="icon-sm" aria-label="Stop timer" onClick={() => stop()}>
              <SquareIcon />
            </Button>
          }
        />
        <TooltipContent>Stop timer</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Keeps the fixed phone bar from covering the end of the page. */
export function TimerBarSpacer() {
  const { timer } = useTimer();
  return timer ? <div className="h-16 md:hidden" aria-hidden="true" /> : null;
}
