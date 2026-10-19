"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { TimerReviewDialog } from "@/components/timer/timer-review-dialog";
import { isComputer, requestEntireScreen, stopStream, uploadScreenshot } from "@/components/timer/screen-share";
import { useServerClock } from "@/components/timer/use-server-clock";
import { pauseTimer, resumeTimer, startTimer, touchTimerShare } from "@/lib/time/actions";
import { SCREENSHOT_INTERVAL_MS, SHARE_HEARTBEAT_MS, SHARE_STALE_MS, activeMilliseconds } from "@/lib/time/active-time";
import type { RunningTimer } from "@/lib/time/queries";

export type TimerTask = { id: string; title: string; projectName: string };

type Review = { stoppedAt: number; then: TimerTask | null; nextStep: string | null };

type StopNext = { after: () => void; nextStep: string };

type TimerContextValue = {
  timer: RunningTimer | null;
  /** The server's clock in milliseconds, ticking while a segment is open. */
  now: number;
  /** The task a start or resume is in flight for. */
  startingTaskId: string | null;
  start: (task: TimerTask) => void;
  /** Opens the review. `next` runs only after the run is saved, discarded, or already stopped. */
  stop: (next?: StopNext) => void;
  /** Active milliseconds, pauses excluded. */
  activeMs: number;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer(): TimerContextValue {
  const value = useContext(TimerContext);
  if (!value) throw new Error("useTimer must be used inside TimerProvider.");
  return value;
}

type TimersRow = {
  id: string;
  stopped_at: string | null;
  outcome: string | null;
  auto_reason: string | null;
  paused_at: string | null;
  share_seen_at: string | null;
};

/**
 * Holds the viewer's running timer for every screen. The `timers` row is the source of
 * truth; the server passes it in, and Realtime keeps every device in step (Tech.md §7.3, §8).
 * The clock runs only while this browser is sharing the entire screen.
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
  const [stoppedId, setStoppedId] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [shareSeenAt, setShareSeenAt] = useState<string | null>(serverTimer?.shareSeenAt ?? null);
  const timer = serverTimer && serverTimer.id !== stoppedId ? serverTimer : null;
  const ticking = timer?.segmentStartedAt != null;
  const { now, read: readClock } = useServerClock(serverNow, ticking);

  const timerRef = useRef(timer);
  const sharingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const loopsRef = useRef<number[]>([]);
  const afterStopRef = useRef<(() => void) | null>(null);
  const shareSeenRef = useRef(shareSeenAt);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    shareSeenRef.current = shareSeenAt;
  }, [shareSeenAt]);

  useEffect(() => {
    setShareSeenAt(serverTimer?.shareSeenAt ?? null);
  }, [serverTimer?.id, serverTimer?.shareSeenAt]);

  const clearLoops = useCallback(() => {
    for (const id of loopsRef.current) window.clearInterval(id);
    loopsRef.current = [];
  }, []);

  const releaseShare = useCallback(() => {
    sharingRef.current = false;
    clearLoops();
    stopStream(streamRef.current);
    streamRef.current = null;
  }, [clearLoops]);

  const beginSampling = useCallback(
    (stream: MediaStream, timerId: string) => {
      clearLoops();
      streamRef.current = stream;
      sharingRef.current = true;
      const shoot = () => {
        if (!sharingRef.current || streamRef.current !== stream) return;
        void uploadScreenshot(timerId, stream).then((saved) => {
          if (saved) router.refresh();
        });
      };
      void shoot();
      loopsRef.current.push(window.setInterval(shoot, SCREENSHOT_INTERVAL_MS));
      loopsRef.current.push(
        window.setInterval(() => {
          if (!sharingRef.current) return;
          void touchTimerShare();
          setShareSeenAt(new Date(readClock()).toISOString());
        }, SHARE_HEARTBEAT_MS),
      );
      const track = stream.getVideoTracks()[0];
      track?.addEventListener("ended", () => {
        if (!sharingRef.current || streamRef.current !== stream) return;
        releaseShare();
        void pauseTimer();
      });
    },
    [clearLoops, readClock, releaseShare, router],
  );

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let subscribedOnce = false;

    function onChange(payload: { eventType: string; new: Partial<TimersRow> }) {
      const row = payload.new;
      if (payload.eventType === "UPDATE" && row.id && row.stopped_at) {
        setStoppedId(row.id);
        releaseShare();
        if (timerRef.current?.id === row.id) {
          afterStopRef.current = null;
          setReview(null);
          if (row.outcome === "auto_saved") {
            toast.info("The timer stopped automatically", {
              description: `${capitalize(row.auto_reason ?? "the task stopped accepting time")}. Your time was saved; you can correct the description on the task.`,
            });
          }
        }
        router.refresh();
        return;
      }
      if (row.paused_at && sharingRef.current) releaseShare();
      if (row.share_seen_at) setShareSeenAt(row.share_seen_at);
      if (row.paused_at !== timerRef.current?.pausedAt) router.refresh();
    }

    const channel = supabase
      .channel(`timer:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "timers", filter: `user_id=eq.${userId}` }, onChange)
      .subscribe((status: string) => {
        if (status !== "SUBSCRIBED") return;
        if (subscribedOnce) router.refresh();
        subscribedOnce = true;
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router, releaseShare]);

  useEffect(() => {
    const onHide = () => {
      if (!sharingRef.current) return;
      releaseShare();
      void fetch("/api/timer/pause", { method: "POST", keepalive: true, credentials: "same-origin" });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [releaseShare]);

  useEffect(() => {
    if (!timer?.segmentStartedAt) return;
    const id = window.setInterval(() => {
      if (sharingRef.current) return;
      const seen = Date.parse(shareSeenRef.current ?? "");
      if (!Number.isFinite(seen)) return;
      if (readClock() - seen > SHARE_STALE_MS) void pauseTimer();
    }, SHARE_HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [timer?.id, timer?.segmentStartedAt, readClock]);

  const shareThen = useCallback(
    async (task: TimerTask, mode: "start" | "resume") => {
      if (!isComputer()) {
        toast.error("Track time from a computer. A phone can't share the whole screen.");
        return;
      }
      setStartingTaskId(task.id);
      const stream = await requestEntireScreen();
      if (stream === "cancelled" || stream === "unsupported") {
        setStartingTaskId(null);
        toast.error("Share your entire screen to start the timer.");
        return;
      }
      if (stream === "partial") {
        setStartingTaskId(null);
        toast.error("Choose Entire screen. A window or a tab can't start the timer.");
        return;
      }

      let timerId: string | undefined;
      if (mode === "start") {
        const started = await startTimer({ taskId: task.id });
        setStartingTaskId(null);
        if (!started.ok) {
          stopStream(stream);
          toast.error(started.error);
          router.refresh();
          return;
        }
        timerId = started.data.timerId;
      } else {
        const resumed = await resumeTimer();
        setStartingTaskId(null);
        if (!resumed.ok) {
          stopStream(stream);
          toast.error(resumed.error);
          router.refresh();
          return;
        }
        timerId = timerRef.current?.id;
      }
      if (!timerId) {
        stopStream(stream);
        return;
      }
      beginSampling(stream, timerId);
      setAnnouncement(mode === "start" ? `Timer started on ${task.title}.` : `Timer continued on ${task.title}.`);
      router.refresh();
    },
    [beginSampling, router],
  );

  const start = useCallback(
    (task: TimerTask) => {
      const running = timerRef.current;
      if (running?.taskId === task.id) {
        if (running.segmentStartedAt == null) void shareThen(task, "resume");
        return;
      }
      if (running) {
        afterStopRef.current = null;
        void (async () => {
          const paused = await pauseTimer();
          releaseShare();
          setReview({
            stoppedAt: paused.ok ? Date.parse(paused.data.pausedAt) : readClock(),
            then: task,
            nextStep: null,
          });
        })();
        return;
      }
      void shareThen(task, "start");
    },
    [readClock, releaseShare, shareThen],
  );

  const stop = useCallback(
    (next?: StopNext) => {
      if (!timerRef.current) {
        next?.after();
        return;
      }
      afterStopRef.current = next?.after ?? null;
      void (async () => {
        const paused = await pauseTimer();
        releaseShare();
        setReview({
          stoppedAt: paused.ok ? Date.parse(paused.data.pausedAt) : readClock(),
          then: null,
          nextStep: next?.nextStep ?? null,
        });
      })();
    },
    [readClock, releaseShare],
  );

  const activeMs = timer
    ? activeMilliseconds({
        accumulatedMs: timer.accumulatedMs,
        segmentStartedAt: timer.segmentStartedAt,
        now,
      })
    : 0;

  const value = useMemo<TimerContextValue>(
    () => ({ timer, now, startingTaskId, start, stop, activeMs }),
    [timer, now, startingTaskId, start, stop, activeMs],
  );

  return (
    <TimerContext.Provider value={value}>
      {children}
      {timer && review ? (
        <TimerReviewDialog
          key={`${timer.id}-${review.stoppedAt}`}
          timer={timer}
          stoppedAt={review.stoppedAt}
          activeMs={timer.segmentCount > 1 ? activeMs : null}
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
            if (next) void shareThen(next, "start");
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
