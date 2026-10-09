import { SHAPES, type RootString, type Shape } from "./shapes";
import { FAMILIES, MODE_LIST, type KeyContext, degreeLabel, shortModeName } from "@/features/theory/theory";

export type Difficulty = "easy" | "medium" | "hard";

/** A shape plus the things we derive from its fingering. */
export interface RichShape extends Shape {
  id: number;
  diff: Difficulty;
  fit: string[];
}

/** Difficulty from the fingering: fret span, full barres, muted gaps and number of different frets. */
export function shapeDifficulty(sh: Pick<Shape, "f">): Difficulty {
  const f = sh.f;
  const fretted = f.filter((v): v is number => v !== null);
  const mn = Math.min(...fretted);
  const mx = Math.max(...fretted);
  const span = mx - mn;
  const atMin = f.filter((v) => v === mn).length;
  const barre = atMin >= 3 && span >= 1;
  const first = f.findIndex((v) => v !== null);
  const last = f.length - 1 - [...f].reverse().findIndex((v) => v !== null);
  const gap = f.slice(first, last + 1).some((v) => v === null);
  const score = span + (barre ? 1.5 : 0) + (gap ? 0.5 : 0) + (new Set(fretted).size >= 4 ? 0.5 : 0);
  return score <= 1.5 ? "easy" : score <= 3 ? "medium" : "hard";
}

/** Names of the modes (started on the chord root) that contain every note of the chord. */
export function modesFitting(exp: number[]): string[] {
  return MODE_LIST.filter((m) => exp.every((v) => m.rel.has(v))).map((m) => m.name);
}

export const RICH_SHAPES: RichShape[] = SHAPES.map((s, id) => ({ ...s, id, diff: shapeDifficulty(s), fit: modesFitting(s.exp) }));

/* ---------------------------------------------------------------- geometry */

export const OPEN_PITCH = [0, 5, 10, 15, 19, 24]; // semitones above the low E string
export const OPEN_NOTE = [4, 9, 2, 7, 11, 4]; // open-string pitch classes (C = 0)
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
export const ROOT_INDEX: Record<RootString, number> = { 6: 0, 5: 1, 4: 2, 3: 3, 1: 5 };
export const STRING_ORDER: RootString[] = [6, 5, 4, 3, 1];
export const STRING_NAMES: Record<RootString, string> = {
  6: "6th string (low E)",
  5: "5th string (A)",
  4: "4th string (D)",
  3: "3rd string (G)",
  1: "1st string (high e)",
};
export const STRING_SHORT: Record<RootString, string> = { 6: "6th", 5: "5th", 4: "4th", 3: "3rd", 1: "1st" };

/** Fret where the root note sits, shifted up an octave until the whole shape is playable (frets >= 1). */
export function rootFretFor(sh: Shape, rootPc: number): number {
  const ri = ROOT_INDEX[sh.rs];
  let r = (rootPc - OPEN_NOTE[ri] + 12) % 12;
  const minOff = Math.min(...sh.f.filter((v): v is number => v !== null));
  while (r + minOff < 1) r += 12;
  return r;
}

/** Semitones above the root for every sounding string. */
export function shapeSemitones(sh: Shape): (number | null)[] {
  const ri = ROOT_INDEX[sh.rs];
  return sh.f.map((v, i) => (v === null ? null : (((OPEN_PITCH[i] + v - OPEN_PITCH[ri]) % 12) + 12) % 12));
}

export const BASE_LABEL: Record<number, string> = { 1: "♭2", 2: "2", 3: "♭3", 4: "3", 5: "4", 6: "♭5", 7: "5", 8: "♯5", 9: "6", 10: "♭7", 11: "7" };

export function intervalLabel(sh: Shape, semi: number): string {
  if (semi === 0) return "R";
  return sh.n && sh.n[semi] !== undefined ? sh.n[semi] : BASE_LABEL[semi];
}

export function shapeFormula(sh: Shape): string {
  const set = [...new Set(shapeSemitones(sh).filter((v): v is number => v !== null))].sort((a, b) => a - b);
  return set.map((s) => intervalLabel(sh, s)).join(" · ");
}

/** The absolute MIDI notes a shape sounds when its root fret is `rootFret`, low string first. */
export function shapeMidi(sh: Shape, rootFret: number): number[] {
  const out: number[] = [];
  sh.f.forEach((v, i) => {
    if (v !== null) out.push(OPEN_MIDI[i] + rootFret + v);
  });
  return out;
}

/* ---------------------------------------------------------------- names */

export const FULL_NAME: Record<string, string> = {
  "": "Major triad", m: "Minor triad", "7": "Dominant 7", maj7: "Major 7", m7: "Minor 7", "9": "Dominant 9", maj9: "Major 9", m9: "Minor 9",
  m11: "Minor 11", "13": "Dominant 13", "7sus4": "Dominant 7sus4", "9sus4": "Dominant 9sus4", "7♯5": "Dominant 7♯5 (augmented 7th)",
  "7♯9": "Dominant 7♯9", "7♭9": "Dominant 7♭9", "7♯11": "Dominant 7♯11", "13♭9": "Dominant 13♭9", "m7♭5": "Minor 7♭5 (half-diminished)",
  dim: "Diminished triad", dim7: "Diminished 7", aug: "Augmented triad", "6": "Major 6", m6: "Minor 6", "6/9": "Major 6/9",
  sus4: "Suspended 4", sus2: "Suspended 2", "m(maj7)": "Minor-major 7", "maj7♯11": "Major 7♯11",
};
export const shapeName = (suf: string) => FULL_NAME[suf] ?? suf;

export const VARIANT: Record<string, string> = {
  "m7♭5": 'm7 with a lowered 5th (♭5), "half-diminished"', dim7: "m7♭5 with the 7th lowered once more (♭♭7)", dim: "minor triad with a ♭5",
  aug: "major triad with a raised 5th (♯5)", "7♯5": "7 with a raised 5th (♯5)", "7♯9": "7 with a raised 9th (♯9)", "7♭9": "7 with a lowered 9th (♭9)",
  "7♯11": "7 with a raised 11th (♯11)", "maj7♯11": "maj7 with a raised 11th (♯11), the Lydian sound", "13♭9": "13 with a lowered 9th (♭9)",
  "m(maj7)": "minor chord with a major 7th", "7sus4": "7 with the 3rd replaced by the 4th", "9sus4": "9 with the 3rd replaced by the 4th",
  sus4: "triad with the 3rd replaced by the 4th", sus2: "triad with the 3rd replaced by the 2nd", "6/9": "major 6 with an added 9th",
  m6: "minor triad plus a major 6th", "6": "major triad plus a major 6th",
};

export const FAMILY_ORDER = ["major", "minor", "dominant", "altered", "sus"] as const;
export const FAMILY_LABEL: Record<(typeof FAMILY_ORDER)[number], string> = {
  major: "Major", minor: "Minor", dominant: "Dominant", altered: "Diminished and augmented", sus: "Suspended",
};

/* ---------------------------------------------------------------- tags and filtering */

export const STYLE_TAGS = ["jazz", "funk", "soul", "rock", "pop", "blues", "bossa", "gospel"];

export type TagRow = "Difficulty" | "Style" | "Shape" | "Mode" | "Degree";
export const TAG_ROWS: TagRow[] = ["Difficulty", "Style", "Shape", "Mode", "Degree"];

export function tagRow(tag: string): TagRow {
  if (tag.startsWith("x:")) return "Difficulty";
  if (tag.startsWith("m:")) return "Mode";
  if (tag.startsWith("d:")) return "Degree";
  return STYLE_TAGS.includes(tag) ? "Style" : "Shape";
}
export const tagText = (tag: string) => tag.replace(/^[mdx]:/, "");

/** One shape as it appears in a list: optionally placed in a key (roman numeral, mode, root). */
export interface Entry {
  shape: RichShape;
  roman?: string;
  mode?: string;
  degree?: number;
  rootPc?: number;
}

export function entryTags(e: Entry): string[] {
  const modes = [...new Set([e.mode, ...e.shape.fit].filter((m): m is string => !!m))].map((m) => "m:" + m);
  return [...e.shape.tags, "x:" + e.shape.diff, ...(e.roman ? ["d:" + e.roman] : []), ...modes];
}

function selectedByRow(selected: string[]): Record<TagRow, string[]> {
  const rows: Record<TagRow, string[]> = { Difficulty: [], Style: [], Shape: [], Mode: [], Degree: [] };
  selected.forEach((t) => rows[tagRow(t)].push(t));
  return rows;
}

function matchesRows(e: Entry, rows: Record<TagRow, string[]>): boolean {
  const tags = entryTags(e);
  return TAG_ROWS.every((r) => rows[r].length === 0 || rows[r].some((t) => tags.includes(t)));
}

/** OR within a row, AND between rows. */
export const matchesTags = (e: Entry, selected: string[]) => matchesRows(e, selectedByRow(selected));

/** How many distinct shapes you would get by choosing `tag`, given what is selected in the other rows. */
export function tagCount(entries: Entry[], tag: string, selected: string[]): number {
  const rows = selectedByRow(selected);
  rows[tagRow(tag)] = [tag];
  return new Set(entries.filter((e) => matchesRows(e, rows)).map((e) => e.shape.id)).size;
}

/** Every shape-level entry with no key applied (for the key-free explorer). */
export const plainEntries = (): Entry[] => RICH_SHAPES.map((shape) => ({ shape }));

/** Shapes that play a diatonic chord of the key, one entry per (shape, degree). */
export function keyEntries(ctx: KeyContext, opts: { rs?: RootString | "all"; degree?: number | "all" } = {}): Entry[] {
  const out: Entry[] = [];
  const degrees = opts.degree === undefined || opts.degree === "all" ? [0, 1, 2, 3, 4, 5, 6] : [opts.degree];
  degrees.forEach((d) => {
    const ch = ctx.chords[d];
    const rel = new Set(ctx.steps.map((_, i) => (ctx.steps[(d + i) % 7] - ctx.steps[d] + 12) % 12));
    const rootPc = (ctx.tonic.pc + ctx.steps[d]) % 12;
    RICH_SHAPES.forEach((shape) => {
      if (opts.rs && opts.rs !== "all" && shape.rs !== opts.rs) return;
      if (!shape.exp.every((v) => rel.has(v))) return;
      out.push({ shape, roman: ch.roman, mode: modeNameAt(ctx, d), degree: d, rootPc });
    });
  });
  return out;
}

function modeNameAt(ctx: KeyContext, d: number): string {
  return shortModeName(FAMILIES[ctx.familyIndex].names[(ctx.modeIndex + d) % 7]);
}

/** Group an entry list by shape id, keeping every placement. */
export function groupByShape(entries: Entry[]): { shape: RichShape; entries: Entry[]; firstDegree: number }[] {
  const map = new Map<number, { shape: RichShape; entries: Entry[]; firstDegree: number }>();
  entries.forEach((e) => {
    const g = map.get(e.shape.id) ?? { shape: e.shape, entries: [], firstDegree: 99 };
    g.entries.push(e);
    g.firstDegree = Math.min(g.firstDegree, e.degree ?? 0);
    map.set(e.shape.id, g);
  });
  return [...map.values()];
}

/** Degrees of each chord tone of a placed shape, e.g. "1 · 3 · 5 · 7". */
export function placedDegrees(sh: Shape, rootPc: number, ctx: KeyContext): string {
  const set = [...new Set(shapeSemitones(sh).filter((v): v is number => v !== null))].sort((a, b) => a - b);
  return set.map((s) => degreeLabel((rootPc + s) % 12, ctx)).join(" · ");
}
