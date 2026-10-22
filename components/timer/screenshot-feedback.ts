"use client";

import { toast } from "sonner";
import {
  SCREENSHOT_NOTICE_MS,
  screenshotNoticeChannel,
  shouldOfferScreenshotNotices,
  type ScreenshotNoticeChannel,
} from "@/lib/time/screenshot-notice";

const OFFERED_KEY = "olifant:screenshot-notices-offered";

let audio: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/**
 * Creates or resumes the shared audio context. Call it synchronously from the click that
 * starts the timer, before any await: Safari and Firefox let a context play from a
 * background tab only if it was started by a user gesture.
 */
export function unlockShutterSound(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audio) {
      const Context =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      audio = new Context();
    }
    if (audio.state !== "running") void audio.resume().catch(() => undefined);
  } catch {
    audio = null;
  }
}

/** A short two-click camera shutter made from filtered noise. Silent if the context never started. */
export function playShutter(): void {
  const context = audio;
  if (!context || context.state !== "running") return;
  try {
    if (!noise || noise.sampleRate !== context.sampleRate) {
      const length = Math.ceil(context.sampleRate * 0.08);
      noise = context.createBuffer(1, length, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;
    }
    const start = context.currentTime + 0.01;
    click(context, noise, start, 3200, 0.05);
    click(context, noise, start + 0.07, 2200, 0.07);
  } catch {
    // A sound that fails to play is not worth interrupting the timer for.
  }
}

function click(context: AudioContext, buffer: AudioBuffer, at: number, frequency: number, length: number) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.9;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(at);
  source.stop(at + length + 0.01);
}

function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Card while Olifant is the window in front, the browser's notification otherwise. */
export function currentScreenshotChannel(): ScreenshotNoticeChannel {
  return screenshotNoticeChannel({
    visible: document.visibilityState === "visible",
    focused: document.hasFocus(),
    permission: notificationPermission(),
  });
}

/**
 * The browser's own notification with the screenshot as its image (Chrome and Edge), a
 * small icon (Firefox), or text only (Safari). It is closed again so the picture of the
 * screen does not stay in the system's notification list.
 */
export async function notifyScreenshot(blob: Blob): Promise<void> {
  if (notificationPermission() !== "granted") return;
  try {
    const dataUrl = await readAsDataUrl(blob);
    const notification = new Notification("Screenshot saved", {
      body: "Olifant Workboard",
      icon: dataUrl,
      image: dataUrl,
      tag: "olifant-screenshot",
      silent: true,
    } as NotificationOptions & { image?: string });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    window.setTimeout(() => notification.close(), SCREENSHOT_NOTICE_MS);
  } catch {
    // Some browsers refuse page notifications outright; the sound already played.
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No data.")));
    reader.onerror = () => reject(reader.error ?? new Error("No data."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Offers browser notifications once per browser, after the timer has started. It is a
 * separate click because the start click is spent on sharing the screen, and Firefox and
 * Safari ask for this permission only from a click.
 */
export function offerScreenshotNotices(): void {
  let offeredBefore = true;
  try {
    offeredBefore = window.localStorage.getItem(OFFERED_KEY) != null;
  } catch {
    return;
  }
  if (!shouldOfferScreenshotNotices({ permission: notificationPermission(), offeredBefore })) return;
  try {
    window.localStorage.setItem(OFFERED_KEY, new Date().toISOString());
  } catch {
    return;
  }
  toast.info("Get a notice when a screenshot is saved", {
    description: "While you work in another window, your browser shows each screenshot for a few seconds.",
    duration: 15_000,
    action: {
      label: "Turn On",
      onClick: () => {
        void Promise.resolve(Notification.requestPermission()).catch(() => undefined);
      },
    },
  });
}
