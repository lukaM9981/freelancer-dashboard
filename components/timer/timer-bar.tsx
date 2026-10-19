"use client";

import Link from "next/link";
import { PlayIcon, SquareIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTimer } from "@/components/timer/timer-provider";
import { formatTimer } from "@/lib/format";
import { LONG_RUN_MS } from "@/lib/time/run";
import { cn } from "@/lib/utils";

/**
 * The running timer, on every screen: in the top bar from `md`, fixed above the bottom
 * edge on phones (Design.md §5.4). The ticking clock is not announced.
 */
export function TimerBar() {
  const { timer, stop, start, activeMs, startingTaskId } = useTimer();
  if (!timer) return null;

  const seconds = Math.floor(activeMs / 1000);
  const paused = timer.segmentStartedAt == null;
  const longRun = activeMs > LONG_RUN_MS;

  return (
    <div
      role="region"
      aria-label={paused ? "Paused timer" : "Running timer"}
      className={cn(
        "flex h-14 min-w-0 items-center gap-3 rounded-full bg-secondary pr-1 pl-4 text-secondary-foreground shadow-md md:h-10",
        "max-md:fixed max-md:inset-x-4 max-md:bottom-4 max-md:z-40 md:w-full md:max-w-xl",
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", paused ? "bg-neutral-400" : "bg-primary")} aria-hidden="true" />
      <span className="eyebrow max-w-32 shrink-0 truncate text-neutral-300! max-sm:hidden">
        {paused ? "Paused" : timer.projectName}
      </span>
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
      {paused ? (
        // Default outline is ink on transparent, so it disappears on this bar.
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                variant="outline"
                className="size-11 border-secondary-foreground! bg-transparent! text-secondary-foreground! hover:border-neutral-50! hover:bg-neutral-50! hover:text-neutral-900! sm:size-8"
                aria-label="Continue timer"
                disabled={startingTaskId === timer.taskId}
                onClick={() => start({ id: timer.taskId, title: timer.taskTitle, projectName: timer.projectName })}
              >
                <PlayIcon />
              </Button>
            }
          />
          <TooltipContent>Share your screen to continue</TooltipContent>
        </Tooltip>
      ) : null}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="icon-sm"
              className="size-11 hover:bg-yellow-200! hover:text-neutral-900! sm:size-8"
              aria-label="Stop timer"
              onClick={() => stop()}
            >
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
  return timer ? <div className="h-20 md:hidden" aria-hidden="true" /> : null;
}
