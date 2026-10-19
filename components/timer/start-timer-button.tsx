"use client";

import { useEffect, useState } from "react";
import { PlayIcon, SquareIcon } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { isComputer } from "@/components/timer/screen-share";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type TimerTask, useTimer } from "@/components/timer/timer-provider";

/**
 * Starts the timer on a task, or stops it when it runs there. `primary` is the task
 * detail's main action; `icon` is the tertiary button on task rows (Design.md §5.4).
 * A phone cannot share the whole screen, so the control stays disabled there.
 */
export function StartTimerButton({ task, variant }: { task: TimerTask; variant: "primary" | "icon" }) {
  const { timer, startingTaskId, start, stop } = useTimer();
  const [computer, setComputer] = useState(true);
  useEffect(() => {
    setComputer(isComputer());
  }, []);

  const onThisTask = timer?.taskId === task.id;
  const paused = onThisTask && timer?.segmentStartedAt == null;
  const running = onThisTask && !paused;
  const pending = startingTaskId === task.id;
  const label = !computer ? "Use a computer" : paused ? "Continue timer" : running ? "Stop timer" : "Start timer";
  const onClick = () => {
    if (!computer) return;
    if (running) stop();
    else start(task);
  };

  if (variant === "primary") {
    return (
      <SubmitButton type="button" pending={pending} disabled={!computer || pending} onClick={onClick}>
        {running ? <SquareIcon /> : <PlayIcon />}
        {!computer ? "Use a Computer" : paused ? "Continue" : running ? "Stop Timer" : "Start Timer"}
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
            className="size-11 sm:size-8"
            pending={pending}
            disabled={!computer || pending}
            aria-label={`${label}: ${task.title}`}
            onClick={onClick}
          >
            {running ? <SquareIcon /> : <PlayIcon />}
          </SubmitButton>
        }
      />
      <TooltipContent>{computer ? label : "Track time from a computer"}</TooltipContent>
    </Tooltip>
  );
}
