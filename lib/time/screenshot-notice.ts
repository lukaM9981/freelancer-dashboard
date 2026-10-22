/** How long the in-app card and the browser notification stay up after a screenshot is saved. */
export const SCREENSHOT_NOTICE_MS = 4_000;

export type ScreenshotNoticeChannel = "card" | "notification" | "none";

/**
 * Where a saved screenshot is shown. The card only when Olifant is the window being
 * looked at; otherwise the browser's notification, if the freelancer allowed it.
 */
export function screenshotNoticeChannel({
  visible,
  focused,
  permission,
}: {
  visible: boolean;
  focused: boolean;
  permission: NotificationPermission | "unsupported";
}): ScreenshotNoticeChannel {
  if (visible && focused) return "card";
  return permission === "granted" ? "notification" : "none";
}

/** The "turn on notices" offer is made once per browser, and only while the browser would still ask. */
export function shouldOfferScreenshotNotices({
  permission,
  offeredBefore,
}: {
  permission: NotificationPermission | "unsupported";
  offeredBefore: boolean;
}): boolean {
  return permission === "default" && !offeredBefore;
}
