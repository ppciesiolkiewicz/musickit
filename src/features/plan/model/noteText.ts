import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { parseKeySlug } from "@/features/theory/keySlug";
import { degreeSemis } from "@/features/exercises/timeline/degrees";
import type { Section } from "./tools";

/**
 * Notes written in an exercise's text as `{{3}}` (a degree) or `{{c-sharp}}` (a note name), drawn as the fretboard's dot
 * inline. Pure: which parts of a text are notes, what root they count from, and what each one is.
 */

export type TextPart = string | { note: string };

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
const TOKEN = /\{\{([^{}]{1,12})\}\}/g;

const readable = (token: string) => degreeSemis(token) !== null || parseKeySlug(token) !== null;

/** A text as plain runs and note tokens; a token that is neither a degree nor a note name stays in the text. */
export function splitNotes(text: string): TextPart[] {
  const out: TextPart[] = [];
  let last = 0;
  const push = (s: string) => {
    if (!s) return;
    if (typeof out[out.length - 1] === "string") out[out.length - 1] += s;
    else out.push(s);
  };
  for (const m of text.matchAll(TOKEN)) {
    const token = m[1].trim();
    if (!readable(token)) continue;
    push(text.slice(last, m.index));
    out.push({ note: token });
    last = m.index! + m[0].length;
  }
  push(text.slice(last));
  return out.length ? out : [text];
}

/** The pitch class the degrees in a text count from. */
export interface NoteRoot { root: number }

const keyRoot = (k: unknown) => (typeof k === "string" || typeof k === "number" ? parseKeySlug(String(k)) : null);
const chordRoot = (c: unknown) => (typeof c === "string" ? parseChordQuery(c)?.rootPc ?? null : null);

function rootOf(s: Section): number | null {
  if (s.type !== "tool") return null;
  const t = s.tool;
  switch (t.type) {
    case "scale-neck":
    case "staff":
      return t.key;
    case "arpeggio-neck":
      return chordRoot(t.chord);
    case "chord-shapes":
      return chordRoot(t.chords[0]);
    case "play-along": {
      const sh = t.shape as { key?: unknown; chords?: (string | { chord?: string })[] };
      const first = sh.chords?.[0];
      return keyRoot(sh.key) ?? chordRoot(typeof first === "string" ? first : first?.chord);
    }
  }
  return null;
}

/** The root from the first tool after `index` that has one, else the last one before it; none: null. */
export function noteRootFor(sections: Section[], index: number): NoteRoot | null {
  for (let i = index + 1; i < sections.length; i++) {
    const r = rootOf(sections[i]);
    if (r !== null) return { root: r };
  }
  for (let i = index - 1; i >= 0; i--) {
    const r = rootOf(sections[i]);
    if (r !== null) return { root: r };
  }
  return null;
}

/** One inline note: semitones above the root, its name, degree text, 0-based degree (for the colour) and a midi to play. */
export interface InlineNoteInfo { semi: number; name: string; degreeText: string; degree: number; midi: number }

/** A token read against the root: a degree works without one (named by its degree), a note name needs it. */
export function inlineNote(token: string, ctx: NoteRoot | null): InlineNoteInfo | null {
  const asDegree = degreeSemis(token);
  let semi: number;
  let degree: number;
  if (asDegree !== null) {
    semi = asDegree % 12;
    degree = (Number(token.match(/\d+/)?.[0] ?? 1) - 1) % 7;
  } else {
    const pc = parseKeySlug(token);
    if (pc === null || !ctx) return null;
    semi = (pc - ctx.root + 12) % 12;
    // the degree it is named as ("♭3" for C over A), so it takes that degree's colour
    degree = Number(SEMI_TEXT[semi].match(/\d/)![0]) - 1;
  }
  const root = ctx?.root ?? 0;
  return { semi, name: ctx ? SHARP[(root + semi) % 12] : SEMI_TEXT[semi], degreeText: SEMI_TEXT[semi], degree, midi: 48 + root + semi };
}
