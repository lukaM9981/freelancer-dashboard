"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The server's clock, ticking every second. The offset to the browser's clock is measured
 * once per server render, so elapsed time is the same on every device (Tech.md §7.3).
 */
export function useServerClock(serverNow: string, ticking: boolean) {
  const [now, setNow] = useState(() => Date.parse(serverNow));
  const offset = useRef(0);

  useEffect(() => {
    offset.current = Date.parse(serverNow) - Date.now();
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => window.clearInterval(id);
  }, [serverNow, ticking]);

  const read = useCallback(() => Date.now() + offset.current, []);
  return { now, read };
}

export function elapsedSeconds(startedAt: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
}
