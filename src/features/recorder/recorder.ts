/**
 * The quick recorder's pure parts: which format the browser records in, the clock it shows and the name a take downloads as.
 * No React and no browser calls, so they are tested.
 */

/** Formats in order of preference: Opus in WebM (Chrome, Firefox), then MP4/AAC (Safari). */
export const RECORD_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"] as const;

/** The first format the browser can record, or "" to let it choose. */
export function pickMimeType(supported: (type: string) => boolean): string {
  return RECORD_TYPES.find((t) => supported(t)) ?? "";
}

/** The file extension for a recorded type: "webm", "m4a" or "ogg". */
export function extensionFor(type: string): string {
  if (type.startsWith("audio/mp4")) return "m4a";
  if (type.startsWith("audio/ogg")) return "ogg";
  return "webm";
}

/** Seconds as m:ss ("0:07", "12:30"); negatives and NaN are 0:00. */
export function clockTime(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "attunr-take-3-2026-10-27-1405.webm": the take's number and when it was recorded, local time. */
export function takeFileName(n: number, at: Date, type: string): string {
  const p = (v: number) => String(v).padStart(2, "0");
  const stamp = `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}`;
  return `attunr-take-${n}-${stamp}.${extensionFor(type)}`;
}

/** A take's waveform as `bars` heights 0..1: each bar the loudest sample in its slice, scaled so the loudest bar is 1. */
export function waveformBars(samples: ArrayLike<number>, bars: number): number[] {
  if (bars <= 0) return [];
  const out = Array.from({ length: bars }, (_, b) => {
    const from = Math.floor((b * samples.length) / bars), to = Math.floor(((b + 1) * samples.length) / bars);
    let peak = 0;
    for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(samples[i]));
    return peak;
  });
  const top = Math.max(...out);
  return top > 0 ? out.map((v) => v / top) : out;
}

/** The input's level 0..1 from an analyser's time-domain bytes (128 = silence): the peak, so a pluck shows. */
export function peakLevel(bytes: ArrayLike<number>): number {
  let peak = 0;
  for (let i = 0; i < bytes.length; i++) peak = Math.max(peak, Math.abs(bytes[i] - 128));
  return Math.min(1, peak / 128);
}
