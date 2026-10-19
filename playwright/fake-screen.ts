import type { BrowserContext, Page } from "@playwright/test";

/**
 * The timer refuses to start unless the browser reports an entire-screen share.
 * Tests have no picker, so they install a one-frame stream that says it is a monitor.
 */
export async function installFakeScreenShare(target: Page | BrowserContext) {
  await target.addInitScript(() => {
    const media = navigator.mediaDevices;
    if (!media) return;
    media.getDisplayMedia = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 8;
      canvas.height = 8;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#cccccc";
        context.fillRect(0, 0, 8, 8);
      }
      const stream = canvas.captureStream(1);
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings.bind(track);
        track.getSettings = () => ({ ...settings(), displaySurface: "monitor" });
      }
      return stream;
    };
  });
}
