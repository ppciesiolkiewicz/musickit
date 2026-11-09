import { isStars, type Stars } from "@/features/progress/stars";

/**
 * What a student notes about a section: how well they can do it (1–5 stars, the same scale as plan exercises) and a
 * free note. Lives in the browser only; this file is the pure part (shapes, parsing, display).
 */

export interface SectionNotes {
  stars?: Stars;
  /** when the stars were given, ISO datetime */
  at?: string;
  note: string;
}
export const EMPTY_NOTES: SectionNotes = { note: "" };

/** The old "how well do I know it" labels, read once from notes saved before stars. */
const KNOW_TO_STARS: Record<string, Stars> = { new: 1, getting: 2, solid: 4, own: 5 };

export const noteKey = (stage: string, section: string) => `${stage}/${section}`;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const parse = (raw: string | null): unknown => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

function cleanNotes(v: unknown): SectionNotes | null {
  if (!isObj(v)) return null;
  const out: SectionNotes = { note: typeof v.note === "string" ? v.note : "" };
  const stars = isStars(v.stars) ? v.stars : typeof v.know === "string" ? KNOW_TO_STARS[v.know] : undefined;
  if (stars) out.stars = stars;
  if (stars && typeof v.at === "string") out.at = v.at;
  return hasNotes(out) ? out : null;
}

/** The stored notes, keyed by `noteKey`. Anything unreadable, or a section with nothing left noted, is dropped; never throws. */
export function parseNotesStore(raw: string | null): Record<string, SectionNotes> {
  const v = parse(raw);
  if (!isObj(v)) return {};
  const out: Record<string, SectionNotes> = {};
  for (const [k, n] of Object.entries(v)) {
    const c = cleanNotes(n);
    if (c) out[k] = c;
  }
  return out;
}

export function hasNotes(n: SectionNotes): boolean {
  return !!(n.stars || n.note.trim());
}

/** The short signs shown next to a section in lists: one ★ per star, then 📝 for a note. */
export function marksText(n: SectionNotes): string {
  return [n.stars ? "★".repeat(n.stars) : "", n.note.trim() ? "📝" : ""].filter(Boolean).join(" ");
}
