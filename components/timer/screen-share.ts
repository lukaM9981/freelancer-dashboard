"use client";

import { createClient } from "@/utils/supabase/client";
import {
  createTimerScreenshot,
  discardUnstoredScreenshot,
} from "@/lib/time/actions";
import { SCREENSHOT_BUCKET, SCREENSHOT_MAX_BYTES } from "@/lib/time/screenshot-bucket";

export type ScreenShareResult = MediaStream | "cancelled" | "partial" | "unsupported";

/** Asks for the whole screen. A window or a tab is refused and the tracks are stopped. */
export async function requestEntireScreen(): Promise<ScreenShareResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) return "unsupported";

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "monitor" },
      audio: false,
      monitorTypeSurfaces: "include",
      selfBrowserSurface: "exclude",
      preferCurrentTab: false,
    } as DisplayMediaStreamOptions);
  } catch {
    return "cancelled";
  }

  const track = stream.getVideoTracks()[0];
  const surface = track ? (track.getSettings() as MediaTrackSettings & { displaySurface?: string }).displaySurface : undefined;
  if (!track || surface !== "monitor") {
    stopStream(stream);
    return "partial";
  }
  return stream;
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** One JPEG of the shared screen, scaled down so it stays under the bucket limit. */
export async function captureScreenshot(stream: MediaStream): Promise<Blob | null> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
  } catch {
    return null;
  }
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
    });
  }
  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 720;
  const width = Math.min(sourceWidth, 1280);
  const height = Math.max(1, Math.round((sourceHeight * width) / sourceWidth));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  video.srcObject = null;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
  if (!blob || blob.size > SCREENSHOT_MAX_BYTES) return null;
  return blob;
}

/** Stores one frame for the running timer and returns it. A failed upload removes the empty row. */
export async function uploadScreenshot(timerId: string, stream: MediaStream): Promise<Blob | null> {
  const blob = await captureScreenshot(stream);
  if (!blob) return null;

  const created = await createTimerScreenshot({ timerId });
  if (!created.ok) return null;

  const shotId = created.data.path.split("/").pop()?.replace(/\.jpg$/, "");
  const supabase = createClient();
  const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).upload(created.data.path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) {
    if (shotId) await discardUnstoredScreenshot({ id: shotId });
    return null;
  }
  return blob;
}

/** A desktop has a fine pointer and can hover. Phones and tablets do not. */
export function isComputer(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
