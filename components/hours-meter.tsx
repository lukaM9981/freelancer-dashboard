import type { ReactNode } from "react";
import Link from "next/link";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";

type HoursMeterProps = {
  countedMinutes: number;
  limitMinutes: number;
  ceilingMinutes: number;
  /** Where "Request Extra Hours" goes once time is past the ceiling. */
  requestHref?: string;
  /** Opens the request in place. Used instead of `requestHref` on the task. */
  requestAction?: ReactNode;
  /** Past the ceiling, when a new request is not offered. */
  overLimitNote?: string;
  className?: string;
};

type MeterState = "ok" | "risk" | "tolerance" | "over";

export function HoursMeter({
  countedMinutes,
  limitMinutes,
  ceilingMinutes,
  requestHref,
  requestAction,
  overLimitNote,
  className,
}: HoursMeterProps) {
  const limit = Math.max(0, limitMinutes);
  const ceiling = Math.max(limit, ceilingMinutes);
  const counted = Math.max(0, countedMinutes);
  const state = meterState(counted, limit, ceiling);
  const text = meterText(state, counted, limit, ceiling);

  const total = Math.max(ceiling, counted, 1);
  const upToLimit = Math.min(counted, limit);
  const tolerance = Math.min(Math.max(counted - limit, 0), ceiling - limit);
  const over = Math.max(counted - ceiling, 0);
  const rest = Math.max(total - upToLimit - tolerance - over, 0);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-meter-track" aria-hidden="true">
          {upToLimit > 0 ? (
            <div className="h-full rounded-full bg-meter-counted" style={{ flex: upToLimit }} />
          ) : null}
          {tolerance > 0 ? (
            <div className="h-full rounded-full bg-meter-tolerance" style={{ flex: tolerance }} />
          ) : null}
          {over > 0 ? (
            <div className="h-full rounded-full bg-meter-over" style={{ flex: over }} />
          ) : null}
          {rest > 0 ? <div style={{ flex: rest }} /> : null}
        </div>
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-foreground"
          style={{ left: `${(limit / total) * 100}%` }}
        />
      </div>
      <p
        className={cn(
          "flex flex-wrap items-center gap-1 text-caption",
          state === "ok" && "text-muted-foreground",
          state === "risk" && "text-yellow-800",
          state === "over" && "text-error",
        )}
      >
        {state === "risk" || state === "tolerance" ? (
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        ) : null}
        {state === "over" ? <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        <span className="numeric">{text}</span>
        {state === "over" && (requestAction || requestHref) ? (
          <>
            <span aria-hidden="true">—</span>
            {requestAction ??
              (requestHref ? (
                <Link
                  href={requestHref}
                  className="rounded-sm font-medium text-link underline-offset-4 hover:underline focus-ring"
                >
                  Request Extra Hours
                </Link>
              ) : null)}
          </>
        ) : null}
        {state === "over" && !requestAction && !requestHref && overLimitNote ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{overLimitNote}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

function meterState(counted: number, limit: number, ceiling: number): MeterState {
  if (counted > ceiling) return "over";
  if (counted > limit) return "tolerance";
  if (limit > 0 && counted * 100 >= limit * 80) return "risk";
  return "ok";
}

function meterText(state: MeterState, counted: number, limit: number, ceiling: number): string {
  if (state === "over") {
    return `${formatDuration(counted - ceiling)} over limit`;
  }
  if (state === "tolerance") {
    return `${formatDuration(counted)} of ${formatDuration(limit)} · ${formatDuration(ceiling - counted)} tolerance left`;
  }
  return `${formatDuration(counted)} of ${formatDuration(limit)} · ${formatDuration(limit - counted)} left`;
}
