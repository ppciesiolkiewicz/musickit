import { libraryVideo } from "./library";

/**
 * Which video a widget plays: one from the library (by its id), one the teacher recorded, kept in this browser (`store.ts`) by its
 * id, with the name it was saved under so a page without the file can still say which it was, or a placeholder for a video still to
 * come (the creator opens the recorder from it; a reader sees "Video coming soon", and under it the placeholder's `text` when it has
 * one: the creator adds it without, a note written in code may say what goes there). Plain JSON. Pure.
 */
export type VideoRef = { source: "library"; id: string } | { source: "recording"; id: string; title: string } | { source: "placeholder"; text?: string };

/** The longest name a recording keeps. */
export const TITLE_MAX = 80;
/** The longest line a placeholder keeps. */
export const PLACEHOLDER_TEXT_MAX = 200;
const RECORDING_ID = /^[A-Za-z0-9-]{1,64}$/;

/** A saved or shared ref, or null when it is not one: a library id must be in the library (published or not), a recording id plain. */
export function sanitiseVideoRef(raw: unknown): VideoRef | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.source === "placeholder") {
    const text = typeof o.text === "string" ? o.text.replace(/\s+/g, " ").trim().slice(0, PLACEHOLDER_TEXT_MAX) : "";
    return text ? { source: "placeholder", text } : { source: "placeholder" };
  }
  if (typeof o.id !== "string") return null;
  if (o.source === "library") return libraryVideo(o.id) ? { source: "library", id: o.id } : null;
  if (o.source === "recording" && RECORDING_ID.test(o.id)) return { source: "recording", id: o.id, title: cleanTitle(o.title) };
  return null;
}

/** A recording's name: trimmed, one line, cut at `TITLE_MAX`; "My video" when empty. */
export function cleanTitle(v: unknown): string {
  const t = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX) : "";
  return t || "My video";
}

/** The video's name as a list or a title shows it. */
export const refTitle = (r: VideoRef): string => (r.source === "library" ? libraryVideo(r.id)?.title ?? "Video" : r.source === "recording" ? r.title : "Placeholder");
