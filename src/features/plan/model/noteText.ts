import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { keyName, parseKeySlug } from "@/features/theory/keySlug";
import { spellAbove } from "@/features/theory/labels";
import { degreeSemis } from "@/features/exercises/timeline/degrees";
import type { PlainCell } from "./tools";

/**
 * Notes written in an exercise's text as `{{3}}` (a degree) or `{{c-sharp}}` (a note name), drawn as the fretboard's dot
 * inline. Pure: which parts of a text are notes, what root they count from, and what each one is. Also the underlined
 * line: `_Don't reach for high notes._`, a care line the page draws over a low band of colour.
 */

export type TextPart = string | { note: string };

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
const TOKEN = /\{\{([^{}]{1,12})\}\}/g;

/** A note name token as written: "e-flat" is E♭, never D♯. */
function writtenName(token: string): string | null {
  const m = /^([a-g])[-_ ]?(sharp|flat|#|♯|♭|b|s)?$/i.exec(token.trim());
  if (!m) return null;
  const acc = !m[2] ? "" : ["sharp", "#", "♯", "s"].includes(m[2].toLowerCase()) ? "♯" : "♭";
  return m[1].toUpperCase() + acc;
}

/** A note name as in `add` ("c-sharp", "b-flat") as a pitch class; a bare number ("9") is never a note. */
export const notePc = (s: string): number | null => (/^\s*\d+\s*$/.test(s) ? null : parseKeySlug(s));

const readable = (token: string) => degreeSemis(token) !== null || notePc(token) !== null;

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

function rootOf(s: PlainCell): number | null {
  if (s.type !== "tool") return null;
  const t = s.tool;
  switch (t.type) {
    case "scale-neck":
    case "position-neck":
    case "staff":
    case "backing-track":
      return keyRoot(t.key);
    case "arpeggio-neck":
      return chordRoot(t.chord);
    case "chord-shapes":
      return chordRoot(t.chords[0]);
    case "guitar-play-along": {
      const sh = t.shape as { key?: unknown; chords?: (string | { chord?: string })[] };
      const first = sh.chords?.[0];
      return keyRoot(sh.key) ?? chordRoot(typeof first === "string" ? first : first?.chord);
    }
  }
  return null;
}

/** The root from the first tool after `index` that has one, else the last one before it; none: null. */
export function noteRootFor(sections: PlainCell[], index: number): NoteRoot | null {
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
  let spelled: string | null = null;
  const root = ctx?.root ?? 0;
  if (asDegree !== null) {
    semi = asDegree % 12;
    degree = (Number(token.match(/\d+/)?.[0] ?? 1) - 1) % 7;
    // spelled from the key's tonic by letter, as the staff spells it: ♭3 of C is E♭, the 3 of E is G♯
    if (ctx) spelled = spellAbove(keyName(root), degree + 1, (root + semi) % 12);
  } else {
    const pc = notePc(token);
    if (pc === null || !ctx) return null;
    semi = (pc - ctx.root + 12) % 12;
    // the degree it is named as ("♭3" for C over A), so it takes that degree's colour
    degree = Number(SEMI_TEXT[semi].match(/\d/)![0]) - 1;
    spelled = writtenName(token);
  }
  const name = ctx ? spelled ?? SHARP[(root + semi) % 12] : SEMI_TEXT[semi];
  return { semi, name, degreeText: SEMI_TEXT[semi], degree, midi: 48 + root + semi };
}

/** A stretch of a text's parts: `marked` when it was written between underscores (`_…_`), to be drawn underlined. */
export interface MarkRun<T> { marked: boolean; parts: (string | T)[] }

/**
 * A text's parts (plain strings, and whatever stands between them: notes, explained words) as runs, the ones written
 * `_like this_` marked and their underscores dropped. The underscores pair up across the parts, so a marked line may
 * hold a note or an explained word. An odd number of them is not markup: the text stays as written, in one plain run.
 */
export function markRuns<T extends object>(parts: (string | T)[]): MarkRun<T>[] {
  const count = parts.reduce<number>((n, p) => n + (typeof p === "string" ? p.split("_").length - 1 : 0), 0);
  if (!count || count % 2) return parts.length ? [{ marked: false, parts }] : [];
  const runs: MarkRun<T>[] = [];
  let marked = false;
  const push = (part: string | T) => {
    if (part === "") return;
    const last = runs[runs.length - 1];
    if (last && last.marked === marked) last.parts.push(part);
    else runs.push({ marked, parts: [part] });
  };
  for (const p of parts) {
    if (typeof p !== "string") { push(p); continue; }
    p.split("_").forEach((piece, i) => {
      if (i > 0) marked = !marked;
      push(piece);
    });
  }
  return runs;
}
