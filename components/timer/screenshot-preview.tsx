"use client";

import { useEffect, useState } from "react";
import { formatTimeOfDay } from "@/lib/format";
import { SCREENSHOT_NOTICE_MS } from "@/lib/time/screenshot-notice";
import { cn } from "@/lib/utils";

/** `url` is an object URL; whoever creates it revokes it once the card is gone. */
export type SavedScreenshot = { id: number; url: string; capturedAt: number };

const FADE_MS = 200;

/**
 * The screenshot that was just stored, in the bottom-right corner for a few seconds
 * (Design.md §4.3). Render it with `key={shot.id}` so a newer shot replaces it.
 */
export function ScreenshotPreview({
  shot,
  timeZone,
  onClosed,
}: {
  shot: SavedScreenshot;
  timeZone: string;
  onClosed: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), SCREENSHOT_NOTICE_MS);
    const close = window.setTimeout(onClosed, SCREENSHOT_NOTICE_MS + FADE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(close);
    };
  }, [onClosed]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed right-6 bottom-6 z-50 w-64 rounded-md border border-border bg-card p-2 shadow-md max-md:bottom-24",
        "animate-in fade-in-0 transition-opacity duration-200 ease-brand",
        leaving && "opacity-0",
      )}
    >
      {/* A local object URL of the shot; next/image cannot optimise it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.url} alt="Screenshot just saved" className="block h-auto w-full rounded-sm bg-muted" />
      <div className="flex items-baseline justify-between gap-3 px-1 pt-2">
        <p className="text-body-xs font-bold">Screenshot saved</p>
        <time dateTime={new Date(shot.capturedAt).toISOString()} className="font-mono numeric text-caption text-muted-foreground">
          {formatTimeOfDay(shot.capturedAt, timeZone)}
        </time>
      </div>
    </div>
  );
}
