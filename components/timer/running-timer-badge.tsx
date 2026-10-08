"use client";

import { elapsedSeconds, useServerClock } from "@/components/timer/use-server-clock";
import { formatTimer } from "@/lib/format";

/** Shows Admins that the assignee's timer is running on a task, and for how long. */
export function RunningTimerBadge({
  startedAt,
  serverNow,
  personName,
}: {
  startedAt: string;
  serverNow: string;
  personName: string | null;
}) {
  const { now } = useServerClock(serverNow, true);
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-full bg-secondary px-3 text-body-xs text-secondary-foreground">
      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      <span>Timer running{personName ? ` \u00b7 ${personName}` : ""}</span>
      <span className="font-mono numeric">{formatTimer(elapsedSeconds(startedAt, now))}</span>
    </span>
  );
}
