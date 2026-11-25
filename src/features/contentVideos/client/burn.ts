"use client";

import { pickVideoType } from "@/features/videos/recording";

/**
 * A take with its overlay burned in: the take played once from its start, the element holding it (the video and everything
 * drawn over it: the tool, the neck effects) captured off the screen with Chrome's Element Capture (Region Capture where that
 * is missing), and the take's own sound. Real time: it takes as long as the take.
 */
export interface Burned { blob: Blob; type: string; width: number; height: number; seconds: number }

type Track = MediaStreamTrack & { restrictTo?: (t: unknown) => Promise<void>; cropTo?: (t: unknown) => Promise<void> };
type Targets = { RestrictionTarget?: { fromElement: (el: Element) => Promise<unknown> }; CropTarget?: { fromElement: (el: Element) => Promise<unknown> } };

export const BURN_WORDS = {
  unsupported: "This browser can't export the overlay. Use Chrome 132 or newer.",
  otherTab: "The export needs this tab. Press Export with overlay again, then pick this tab in the share dialog.",
  stopped: "The export stopped before the take ended. Press Export with overlay to start it again.",
};

/** For `useSyncExternalStore(noChange, canBurn, () => false)`: what the browser can do never changes while the page is open. */
export const noChange = () => () => {};

/** Whether this browser can capture one element of the page. */
export function canBurn(): boolean {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getDisplayMedia) return false;
  const w = window as unknown as Targets;
  return Boolean(w.RestrictionTarget || w.CropTarget);
}

const once = (el: HTMLElement, event: string) => new Promise<void>((res) => el.addEventListener(event, () => res(), { once: true }));
const frames = (n: number) => new Promise<void>((res) => { const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : res()); step(n); });

/** The picture size of a recorded file (a recorder's WebM has no duration, but it has its size). */
async function sizeOf(blob: Blob): Promise<{ width: number; height: number }> {
  const probe = document.createElement("video");
  const url = URL.createObjectURL(blob);
  try {
    probe.muted = true;
    probe.preload = "metadata";
    probe.src = url;
    await Promise.race([once(probe, "loadedmetadata"), new Promise((res) => setTimeout(res, 5000))]);
    return { width: probe.videoWidth, height: probe.videoHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Play `video` from its start to its end and record `box` (which holds it and what is drawn over it) with the video's sound.
 * The browser asks which tab to share: it must be this one. The video's controls are hidden while it plays. `seconds` is the
 * take's length, for `onProgress` (0 to 1). `signal` stops it early, and the promise then rejects.
 */
export async function burnOverlay(box: HTMLElement, video: HTMLVideoElement, seconds: number, { onProgress, signal }: { onProgress?: (share: number) => void; signal?: AbortSignal } = {}): Promise<Burned> {
  if (!canBurn()) throw new Error(BURN_WORDS.unsupported);
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30, cursor: "never" },
    audio: false,
    preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude", monitorTypeSurfaces: "exclude",
  } as DisplayMediaStreamOptions);
  const track = display.getVideoTracks()[0] as Track;
  const was = { controls: video.controls, loop: video.loop, muted: video.muted };
  let audio: MediaStream | null = null;
  try {
    const w = window as unknown as Targets;
    try {
      if (w.RestrictionTarget && track.restrictTo) await track.restrictTo(await w.RestrictionTarget.fromElement(box));
      else if (w.CropTarget && track.cropTo) await track.cropTo(await w.CropTarget.fromElement(box));
      else throw new Error(BURN_WORDS.unsupported);
    } catch (e) {
      throw e instanceof Error && e.message === BURN_WORDS.unsupported ? e : new Error(BURN_WORDS.otherTab);
    }
    video.controls = false;
    video.loop = false;
    video.muted = false;
    video.pause();
    video.currentTime = 0;
    await once(video, "seeked");
    // the overlay redraws at the start and the controls leave the picture before the first frame is kept
    await frames(3);
    const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
    audio = capture ? capture.call(video) : null;
    const type = pickVideoType((t) => MediaRecorder.isTypeSupported(t));
    const tracks = [track, ...(audio?.getAudioTracks() ?? [])];
    const recorder = new MediaRecorder(new MediaStream(tracks), { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const finished = new Promise<boolean>((res) => {
      const end = (whole: boolean) => () => { if (recorder.state !== "inactive") { recorder.onstop = () => res(whole); recorder.stop(); } };
      video.addEventListener("ended", end(true), { once: true });
      // Stop sharing in the browser's bar, or the page stopping it
      track.addEventListener("ended", end(false), { once: true });
      signal?.addEventListener("abort", end(false), { once: true });
    });
    const tick = () => onProgress?.(seconds > 0 ? Math.min(1, video.currentTime / seconds) : 0);
    video.addEventListener("timeupdate", tick);
    recorder.start(1000);
    try {
      await video.play();
      if (!(await finished)) throw new Error(BURN_WORDS.stopped);
    } finally {
      video.removeEventListener("timeupdate", tick);
    }
    const recorded = recorder.mimeType || type || "video/webm";
    const blob = new Blob(chunks, { type: recorded });
    return { blob, type: recorded, seconds: Math.max(1, Math.round(seconds)), ...(await sizeOf(blob)) };
  } finally {
    display.getTracks().forEach((t) => t.stop());
    // the captured sound's tracks belong to this capture; stopping them leaves the video playing as it was
    audio?.getTracks().forEach((t) => t.stop());
    video.pause();
    video.controls = was.controls;
    video.loop = was.loop;
    video.muted = was.muted;
  }
}
