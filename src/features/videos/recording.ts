/**
 * The video recorder's pure parts: which format the browser records in, the file name a take downloads as, and the default name of a
 * take. No React and no browser calls, so they are tested.
 */

/** Formats in order of preference: VP9 or VP8 with Opus in WebM (Chrome, Firefox), then MP4 (Safari). */
export const VIDEO_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"] as const;

/** The first format the browser can record, or "" to let it choose. */
export const pickVideoType = (supported: (type: string) => boolean): string => VIDEO_TYPES.find((t) => supported(t)) ?? "";

/** "mp4" or "webm", from a recorded type. */
export const videoExtension = (type: string): string => (type.startsWith("video/mp4") ? "mp4" : "webm");

/** "Video 12 Nov, 14:05": a new take's name, from when it was recorded (local time). */
export function takeTitle(at: Date): string {
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][at.getMonth()];
  const p = (v: number) => String(v).padStart(2, "0");
  return `Video ${at.getDate()} ${month}, ${p(at.getHours())}:${p(at.getMinutes())}`;
}

/** "my-scales-video.webm": a name made safe for a file, with the type's extension. */
export function videoFileName(title: string, type: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "video";
  return `${base}.${videoExtension(type)}`;
}

/** The longest take the recorder keeps going for: ten minutes, so a forgotten take doesn't fill the disk. */
export const MAX_TAKE_SECONDS = 600;
