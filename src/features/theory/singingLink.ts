/**
 * The singing pages' address: the key and the scale, and on the melodies or runs page the tune being sung (and `full` while it
 * is open full screen), so a link opens the same tune in the same key: /theory/singing/melodies?melody=12&full=1&key=d&scale=major-ionian.
 * (/theory/singing with a melody redirects to the tune's page, for links from when they were tabs there.)
 * The voice and accuracy stay the singer's own.
 * Pure functions, no React (tested).
 */
import { DEFAULT_KEY_PC } from "./theory";
import { keySlug, parseKeySlug } from "./keySlug";
import { VOICES, buildLadder } from "./singing";
import { BOOK, RUNS } from "./singingMelodies";

export const DEFAULT_SINGING_SCALE = "major-ionian";

export interface SingingLink {
  tonicPc: number;
  scale: string;
  /** the tune, by number in the book; null on the scale page */
  melody: number | null;
  /** the tune opens full screen (only with a tune) */
  full: boolean;
}

/** The page's settings from its query; anything unreadable falls back to the defaults (C major, no tune). */
export function parseSingingLink(q: URLSearchParams): SingingLink {
  const scale = q.get("scale") ?? "";
  const n = Number(q.get("melody"));
  const melody = [...BOOK, ...RUNS].some((t) => t.n === n) ? n : null;
  return {
    tonicPc: parseKeySlug(q.get("key")) ?? DEFAULT_KEY_PC,
    scale: scale && buildLadder(scale, 0, VOICES.soprano) ? scale : DEFAULT_SINGING_SCALE,
    melody,
    full: melody !== null && q.get("full") === "1",
  };
}

/** The query for a link, melody first so it reads as what is shared. */
export const singingQuery = (l: SingingLink): string =>
  new URLSearchParams({
    ...(l.melody !== null ? { melody: String(l.melody), ...(l.full ? { full: "1" } : {}) } : {}),
    key: keySlug(l.tonicPc),
    scale: l.scale,
  }).toString();
