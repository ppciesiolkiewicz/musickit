/**
 * The video library: practice videos made ahead (rendered from `videos/<id>.json` by `npm run video`), which a note and the AI
 * plan pick by id. Pure: no React, no browser.
 *
 * A video's files are served from `VIDEO_BASE` as `<id>-<format>.mp4`. `published` lists the formats that are uploaded there; a video
 * with none is kept here (its words are written) but is offered nowhere until one is.
 */

export type VideoFormat = "16x9" | "9x16";
export const VIDEO_FORMATS: VideoFormat[] = ["16x9", "9x16"];

export interface LibraryVideo {
  /** the config's name (`videos/<id>.json`): lower-case letters, digits and dashes */
  id: string;
  /** what the video practises, as a heading */
  title: string;
  /** one line on what to do with it */
  about: string;
  area: "voice" | "guitar";
  /** its length in whole seconds (a test checks it against the config) */
  seconds: number;
  /** the formats uploaded to `VIDEO_BASE`, the one to show first first; none: not offered yet */
  published: VideoFormat[];
}

/** Where the video files are: `NEXT_PUBLIC_VIDEO_BASE` (a storage URL), else the site's own `/videos`. */
export const VIDEO_BASE = (process.env.NEXT_PUBLIC_VIDEO_BASE || "/videos").replace(/\/+$/, "");

export const VIDEO_LIBRARY: LibraryVideo[] = [
  {
    id: "c-major-first-steps",
    title: "First steps: Do and Re",
    about: "Three short tunes on Do and Re in C major. Sing each one along with the piano until the step from Do to Re feels easy.",
    area: "voice",
    seconds: 88,
    published: [],
  },
  {
    id: "c-major-do-re-mi-long",
    title: "Do Re Mi Fa Sol",
    about: "Twelve tunes in C major, from Do and Re up to Sol, each a little harder than the last. Sing each one along with the piano on the note names.",
    area: "voice",
    seconds: 448,
    published: ["9x16"],
  },
];

/** The library's video with this id, published or not; null for an unknown id. */
export const libraryVideo = (id: string): LibraryVideo | null => VIDEO_LIBRARY.find((v) => v.id === id) ?? null;

/** The videos that can be watched now: at least one format uploaded. */
export const publishedVideos = (): LibraryVideo[] => VIDEO_LIBRARY.filter((v) => v.published.length > 0);

/** The file of a video in a format (its first published one when none is asked for or the one asked for isn't uploaded); null when none is. */
export function videoUrl(v: LibraryVideo, format?: VideoFormat): string | null {
  const f = format && v.published.includes(format) ? format : v.published[0];
  return f ? `${VIDEO_BASE}/${v.id}-${f}.mp4` : null;
}

/** "7 min", "1 min", "45 s": a video's length as a list shows it. */
export function lengthLabel(seconds: number): string {
  return seconds < 60 ? `${Math.max(1, Math.round(seconds))} s` : `${Math.round(seconds / 60)} min`;
}

/** Width over height of a format. */
export const aspectOf = (f: VideoFormat): number => (f === "16x9" ? 16 / 9 : 9 / 16);
