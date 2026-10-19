/** How often a shared screen is sampled (PRD §5.5). */
export const SCREENSHOT_INTERVAL_MS = 10 * 60 * 1000;

/** The sharing tab tells the server it is still sharing, this often. */
export const SHARE_HEARTBEAT_MS = 15 * 1000;

/**
 * A running timer whose last heartbeat is older than this is paused.
 * The segment ends at that heartbeat, so the gap is not counted.
 */
export const SHARE_STALE_MS = 45 * 1000;

/** Active time only: closed segments, plus the open one up to `now`. */
export function activeMilliseconds(input: {
  accumulatedMs: number;
  segmentStartedAt: string | null;
  now: number;
}): number {
  if (!input.segmentStartedAt) return Math.max(0, input.accumulatedMs);
  const open = input.now - Date.parse(input.segmentStartedAt);
  return Math.max(0, input.accumulatedMs) + Math.max(0, open);
}
