"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { PersonAvatar } from "@/components/person-avatar";
import { elapsedSeconds, useServerClock } from "@/components/timer/use-server-clock";
import { formatTimer } from "@/lib/format";
import type { TrackingTimer } from "@/lib/dashboard/queries";
import { LONG_RUN_MS } from "@/lib/time/run";

/**
 * Who has a timer running, live (PRD §6.11). Any change to `timers` refreshes the page;
 * RLS lets only Admins receive other people's rows (Tech.md §8).
 */
export function TrackingNow({ timers, serverNow }: { timers: TrackingTimer[]; serverNow: string }) {
  const router = useRouter();
  const { now } = useServerClock(serverNow, timers.length > 0);

  useEffect(() => {
    const supabase = createClient();
    let subscribedOnce = false;
    const channel = supabase
      .channel("tracking-now")
      .on("postgres_changes", { event: "*", schema: "public", table: "timers" }, () => router.refresh())
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // Changes made while the connection was down are not replayed.
        if (subscribedOnce) router.refresh();
        subscribedOnce = true;
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  if (timers.length === 0) {
    return <p className="text-body-sm text-muted-foreground">Nobody is tracking time right now.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {timers.map((timer) => {
        const seconds = elapsedSeconds(timer.startedAt, now);
        return (
          <li key={timer.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <PersonAvatar name={timer.personName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-bold">{timer.personName}</p>
              <p className="truncate text-body-xs text-muted-foreground">
                <Link
                  href={`/tasks/${timer.taskId}`}
                  className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
                >
                  {timer.taskTitle}
                </Link>
                {" \u00b7 "}
                {timer.projectName}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-mono text-body-sm numeric">{formatTimer(seconds)}</span>
              {seconds * 1000 > LONG_RUN_MS ? (
                <span className="flex items-center gap-1 text-caption text-yellow-800">
                  <TriangleAlertIcon aria-hidden className="size-3.5" />
                  Over 10h
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
