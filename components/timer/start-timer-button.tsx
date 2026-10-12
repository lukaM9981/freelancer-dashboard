"use client";

import { PlayIcon, SquareIcon } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type TimerTask, useTimer } from "@/components/timer/timer-provider";

/**
 * Starts the timer on a task, or stops it when it runs there. `primary` is the task
 * detail's main action; `icon` is the tertiary button on task rows (Design.md §5.4).
 */
export function StartTimerButton({ task, variant }: { task: TimerTask; variant: "primary" | "icon" }) {
  const { timer, startingTaskId, start, stop } = useTimer();
  const running = timer?.taskId === task.id;
  const pending = startingTaskId === task.id;
  const label = running ? "Stop timer" : "Start timer";
  const onClick = () => (running ? stop() : start(task));

  if (variant === "primary") {
    return (
      <SubmitButton type="button" pending={pending} onClick={onClick}>
        {running ? <SquareIcon /> : <PlayIcon />}
        {running ? "Stop Timer" : "Start Timer"}
      </SubmitButton>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SubmitButton
            type="button"
            variant="outline"
            size="icon-sm"
            pending={pending}
            aria-label={`${label}: ${task.title}`}
            onClick={onClick}
          >
            {running ? <SquareIcon /> : <PlayIcon />}
          </SubmitButton>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
