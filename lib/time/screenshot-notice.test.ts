import { describe, expect, it } from "vitest";
import { screenshotNoticeChannel, shouldOfferScreenshotNotices } from "@/lib/time/screenshot-notice";

describe("screenshotNoticeChannel", () => {
  it("shows the card while Olifant is visible and focused, whatever the permission", () => {
    for (const permission of ["granted", "denied", "default", "unsupported"] as const) {
      expect(screenshotNoticeChannel({ visible: true, focused: true, permission })).toBe("card");
    }
  });

  it("uses the browser notification when Olifant is hidden or another program has focus", () => {
    expect(screenshotNoticeChannel({ visible: false, focused: false, permission: "granted" })).toBe("notification");
    expect(screenshotNoticeChannel({ visible: true, focused: false, permission: "granted" })).toBe("notification");
  });

  it("shows nothing outside Olifant without permission", () => {
    expect(screenshotNoticeChannel({ visible: true, focused: false, permission: "denied" })).toBe("none");
    expect(screenshotNoticeChannel({ visible: false, focused: false, permission: "default" })).toBe("none");
    expect(screenshotNoticeChannel({ visible: false, focused: false, permission: "unsupported" })).toBe("none");
  });
});

describe("shouldOfferScreenshotNotices", () => {
  it("offers once, while the browser would still ask", () => {
    expect(shouldOfferScreenshotNotices({ permission: "default", offeredBefore: false })).toBe(true);
    expect(shouldOfferScreenshotNotices({ permission: "default", offeredBefore: true })).toBe(false);
  });

  it("never offers after a decision or without support", () => {
    expect(shouldOfferScreenshotNotices({ permission: "granted", offeredBefore: false })).toBe(false);
    expect(shouldOfferScreenshotNotices({ permission: "denied", offeredBefore: false })).toBe(false);
    expect(shouldOfferScreenshotNotices({ permission: "unsupported", offeredBefore: false })).toBe(false);
  });
});
