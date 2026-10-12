"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { TimerReviewDialog } from "@/components/timer/timer-review-dialog";
import { useServerClock } from "@/components/timer/use-server-clock";
import { startTimer } from "@/lib/time/actions";
import type { RunningTimer } from "@/lib/time/queries";

export type TimerTask = { id: string; title: string; projectName: string };

type Review = { stoppedAt: number; then: TimerTask | null; nextStep: string | null };

type StopNext = { after: () => void; nextStep: string };

type TimerContextValue = {
  timer: RunningTimer | null;
  /** The server's clock in milliseconds, ticking while a timer runs. */
  now: number;
  /** The task a start is in flight for. */
  startingTaskId: string | null;
  start: (task: TimerTask) => void;
  /** Opens the review. `next` runs only after the run is saved, discarded, or already stopped. */
  stop: (next?: StopNext) => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer(): TimerContextValue {
  const value = useContext(TimerContext);
  if (!value) throw new Error("useTimer must be used inside TimerProvider.");
  return value;
}

type TimersRow = { id: string; stopped_at: string | null; outcome: string | null; auto_reason: string | null };

/**
 * Holds the viewer's running timer for every screen. The `timers` row is the source of
 * truth; the server passes it in, and Realtime keeps every device in step (Tech.md §7.3, §8).
 */
export function TimerProvider({
  userId,
  timer: serverTimer,
  serverNow,
  timeZone,
  children,
}: {
  /** Null for Admins, who never track time. */
  userId: string | null;
  timer: RunningTimer | null;
  serverNow: string;
  timeZone: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  // A timer stopped here or on another device disappears at once, before the refresh lands.
  const [stoppedId, setStoppedId] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const timer = serverTimer && serverTimer.id !== stoppedId ? serverTimer : null;
  const { now, read: readClock } = useServerClock(serverNow, timer != null);

  const timerRef = useRef(timer);
  const afterStopRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let subscribedOnce = false;

    function onChange(payload: { eventType: string; new: Partial<TimersRow> }) {
      const row = payload.new;
      if (payload.eventType === "UPDATE" && row.id && row.stopped_at) {
        setStoppedId(row.id);
        if (timerRef.current?.id === row.id) {
          afterStopRef.current = null;
          setReview(null);
          if (row.outcome === "auto_saved") {
            toast.info("The timer stopped automatically", {
              description: `${capitalize(row.auto_reason ?? "the task stopped accepting time")}. Your time was saved; you can correct the description on the task.`,
            });
          }
        }
      }
      router.refresh();
    }

    const channel = supabase
      .channel(`timer:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "timers", filter: `user_id=eq.${userId}` }, onChange)
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // Changes made while the connection was down are not replayed.
        if (subscribedOnce) router.refresh();
        subscribedOnce = true;
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const startNow = useCallback(
    async (task: TimerTask) => {
      setStartingTaskId(task.id);
      const result = await startTimer({ taskId: task.id });
      setStartingTaskId(null);
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      setAnnouncement(`Timer started on ${task.title}.`);
    },
    [router],
  );

  const start = useCallback(
    (task: TimerTask) => {
      const running = timerRef.current;
      if (running?.taskId === task.id) return;
      if (running) {
        // One running timer per person: review the current one, then start the new one.
        afterStopRef.current = null;
        setReview({ stoppedAt: readClock(), then: task, nextStep: null });
        return;
      }
      void startNow(task);
    },
    [readClock, startNow],
  );

  const stop = useCallback(
    (next?: StopNext) => {
      if (!timerRef.current) {
        next?.after();
        return;
      }
      afterStopRef.current = next?.after ?? null;
      setReview({ stoppedAt: readClock(), then: null, nextStep: next?.nextStep ?? null });
    },
    [readClock],
  );

  const value = useMemo<TimerContextValue>(
    () => ({ timer, now, startingTaskId, start, stop }),
    [timer, now, startingTaskId, start, stop],
  );

  return (
    <TimerContext.Provider value={value}>
      {children}
      {timer && review ? (
        <TimerReviewDialog
          key={`${timer.id}-${review.stoppedAt}`}
          timer={timer}
          stoppedAt={review.stoppedAt}
          then={review.then}
          nextStep={review.nextStep}
          timeZone={timeZone}
          onCancel={() => {
            afterStopRef.current = null;
            setReview(null);
          }}
          onFinished={(message) => {
            const next = review.then;
            const after = afterStopRef.current;
            afterStopRef.current = null;
            setStoppedId(timer.id);
            setReview(null);
            setAnnouncement(message);
            if (next) void startNow(next);
            after?.();
          }}
        />
      ) : null}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </TimerContext.Provider>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
