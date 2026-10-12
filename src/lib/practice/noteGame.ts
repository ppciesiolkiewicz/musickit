import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";

/**
 * The fretboard note game, as pure functions: settings from the URL, the next question, answer checking,
 * the "held long enough" check for a played note, and a per-position heatmap. Strings: 0 = low E … 5 = high e.
 */
export type NoteMode = "find" | "every" | "name";

export interface NoteSettings {
  mode: NoteMode;
  strings: number[];
  from: number;
  to: number;
  naturals: boolean;
  flats: boolean;
}

export const DEFAULT_NOTE_SETTINGS: NoteSettings = { mode: "find", strings: [0, 1], from: 0, to: 12, naturals: true, flats: false };

const MAX_FRET = 15;
const STRING_LETTERS = ["E", "A", "D", "G", "B", "e"];
const NATURAL = new Set([0, 2, 4, 5, 7, 9, 11]);
const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

export const pcName = (pc: number, flats: boolean): string => (flats ? FLAT_NAMES : SHARP_NAMES)[((pc % 12) + 12) % 12];

function parseStrings(v: string | null): number[] | null {
  if (!v) return null;
  const out: number[] = [];
  for (const part of v.split(",").map((x) => x.trim()).filter(Boolean)) {
    const byLetter = STRING_LETTERS.indexOf(part);
    const n = byLetter >= 0 ? byLetter : /^\d$/.test(part) ? Number(part) : -1;
    if (n < 0 || n > 5) return null;
    if (!out.includes(n)) out.push(n);
  }
  return out.length ? out : null;
}

const int = (v: string | null): number | null => (v !== null && /^-?\d+$/.test(v) ? Number(v) : null);
const clampFret = (n: number) => Math.max(0, Math.min(MAX_FRET, n));

/** Settings from a query string; anything missing or bad falls back to the default, field by field. */
export function parseNoteSettings(q: URLSearchParams): NoteSettings {
  const d = DEFAULT_NOTE_SETTINGS;
  const mode = q.get("mode");
  let from = clampFret(int(q.get("from")) ?? d.from);
  let to = clampFret(int(q.get("to")) ?? d.to);
  if (from > to) [from, to] = [to, from];
  return {
    mode: mode === "find" || mode === "every" || mode === "name" ? mode : d.mode,
    strings: parseStrings(q.get("strings")) ?? d.strings,
    from,
    to,
    naturals: q.get("naturals") === "0" ? false : q.get("naturals") === "1" ? true : d.naturals,
    flats: q.get("flats") === "1" ? true : q.get("flats") === "0" ? false : d.flats,
  };
}

/** The query string that reproduces these settings (for a teacher to share). */
export function noteSettingsQuery(s: NoteSettings): string {
  return new URLSearchParams({ mode: s.mode, strings: s.strings.map((i) => STRING_LETTERS[i]).join(","), from: String(s.from), to: String(s.to), naturals: s.naturals ? "1" : "0", flats: s.flats ? "1" : "0" }).toString();
}

/** Every place a pitch class sits on the chosen strings inside the fret range. */
export function positionsOf(pc: number, s: NoteSettings): { string: number; fret: number }[] {
  const out: { string: number; fret: number }[] = [];
  for (const string of s.strings) for (let fret = s.from; fret <= s.to; fret++) if ((OPEN_MIDI[string] + fret) % 12 === pc) out.push({ string, fret });
  return out;
}

export interface NoteQuestion {
  pc: number;
  string: number;
  /** set in "name" mode: the lit position to name */
  fret?: number;
}

/** A random next question that is always answerable and differs from `prev` whenever another question exists. */
export function nextNoteQuestion(s: NoteSettings, rand: () => number, prev?: NoteQuestion): NoteQuestion {
  const all: NoteQuestion[] = [];
  for (const string of s.strings)
    for (let fret = s.from; fret <= s.to; fret++) {
      const pc = (OPEN_MIDI[string] + fret) % 12;
      if (s.naturals && !NATURAL.has(pc)) continue;
      if (s.mode === "name") all.push({ pc, string, fret });
      else if (!all.some((x) => x.pc === pc && x.string === string)) all.push({ pc, string });
    }
  if (!all.length) {
    // nothing natural in range: fall back to any note so the game still runs
    const string = s.strings[0] ?? 0;
    return { pc: (OPEN_MIDI[string] + s.from) % 12, string, ...(s.mode === "name" ? { fret: s.from } : {}) };
  }
  const same = (a: NoteQuestion, b?: NoteQuestion) => !!b && a.pc === b.pc && a.string === b.string && a.fret === b.fret;
  const pool = all.length > 1 ? all.filter((x) => !same(x, prev)) : all;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/** Is a tapped (string, fret) right? "find" wants the note on the asked string; "every" accepts any chosen string. */
export function isCorrect(q: NoteQuestion, s: NoteSettings, string: number, fret: number): boolean {
  if ((OPEN_MIDI[string] + fret) % 12 !== q.pc) return false;
  return s.mode === "every" ? s.strings.includes(string) : string === q.string;
}

/** The pitch class held without change for at least `holdMs` at the end of the readings (any octave), else null. */
export function stablePitch(readings: { midi: number; t: number }[], holdMs = 150): number | null {
  if (!readings.length) return null;
  const last = readings[readings.length - 1];
  const pc = ((last.midi % 12) + 12) % 12;
  let start = last.t;
  for (let i = readings.length - 1; i >= 0 && ((readings[i].midi % 12) + 12) % 12 === pc; i--) start = readings[i].t;
  return last.t - start >= holdMs ? pc : null;
}

export interface Heat {
  [key: string]: { tries: number; misses: number; ms: number };
}

/** Add one attempt at a position to the heatmap (key "string:fret"). */
export function recordHeat(h: Heat, string: number, fret: number, ok: boolean, ms: number): Heat {
  const key = `${string}:${fret}`;
  const cur = h[key] ?? { tries: 0, misses: 0, ms: 0 };
  return { ...h, [key]: { tries: cur.tries + 1, misses: cur.misses + (ok ? 0 : 1), ms: cur.ms + ms } };
}
