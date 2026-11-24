import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { melodyTonic } from "../timeline/degrees";
import { BEATS_PER_BAR } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";

/** One riff note on the neck: string 0 is the low E. A rest has no string or fret. */
export interface RiffNote {
  string: number | null;
  fret: number | null;
  /** how long this note rings */
  beats: number;
  /** starts together with the note before it (a double stop or chord) */
  with?: boolean;
}

/** One time step: the indexes of its notes (first is the head), when it starts, and `beats` until the next step: its shortest note. */
export interface Column { idx: number[]; start: number; beats: number }

export function columnsOf(notes: RiffNote[]): Column[] {
  const cols: Column[] = [];
  notes.forEach((n, i) => {
    const last = cols[cols.length - 1];
    if (n.with && last) { last.idx.push(i); last.beats = Math.min(last.beats, n.beats); return; }
    cols.push({ idx: [i], start: 0, beats: n.beats });
  });
  let at = 0;
  for (const c of cols) { c.start = at; at += c.beats; }
  return cols;
}

/** The highest fret a riff note may sit on. */
export const MAX_FRET = 17;

export const midiOf = (n: RiffNote): number | null => (n.string === null || n.fret === null ? null : OPEN_MIDI[n.string] + n.fret);

/**
 * The riff as a play-along timeline, so the app's own guitar exercise player (tab, notes, neck) draws and plays it: a note is a
 * step on its string, notes played together a grip near their frets, a rest nothing. Semitones count from the key's Do as
 * `melodyTonic` places it.
 */
export function riffTimeline(notes: RiffNote[], key: number, bpm: number): Timeline | null {
  const tonic = melodyTonic(key);
  const events: TimelineEvent[] = [{ type: "scale", at: 0, key, scale: "major-ionian" }];
  let end = 0;
  for (const c of columnsOf(notes)) {
    end = c.start + c.beats;
    const ns = c.idx.map((i) => notes[i]).filter((n) => midiOf(n) !== null).sort((a, b) => a.string! - b.string!);
    if (!ns.length) continue;
    const beats = Math.max(...ns.map((n) => n.beats));
    const step = ns.length === 1
      ? { kind: "note" as const, semis: midiOf(ns[0])! - tonic, from: "key" as const, string: 6 - ns[0].string! }
      : { kind: "grip" as const, semis: ns.map((n) => midiOf(n)! - tonic), strings: ns.map((n) => 6 - n.string!), from: "key" as const, fret: Math.round(ns.reduce((a, n) => a + n.fret!, 0) / ns.length) };
    events.push({ type: "step", at: c.start, beats, chord: "", step });
  }
  if (events.length < 2) return null;
  return { bpm, bars: Math.max(1, Math.ceil(end / BEATS_PER_BAR)), events };
}

/** The note lengths a riff is written in, in beats: a sixteenth up to a whole note, plain or dotted. */
export const RIFF_LENGTHS = [0.25, 0.5, 1, 2, 4].flatMap((b) => [b, b * 1.5]);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const whole = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const isLength = (v: unknown): v is number => typeof v === "number" && RIFF_LENGTHS.includes(v);

/** One note of a written step: a guitar string (6 the low E) and a fret. */
function cellOf(raw: unknown, i: number): RiffNote | string {
  if (!isObj(raw) || !whole(raw.string, 1, 6) || !whole(raw.fret, 0, MAX_FRET)) return `step ${i + 1} is not a note on the neck (string 1-6, fret 0-${MAX_FRET})`;
  if (!isLength(raw.beats)) return `step ${i + 1} has length ${JSON.stringify(raw.beats)}`;
  return { string: 6 - raw.string, fret: raw.fret, beats: raw.beats };
}

/**
 * A riff as a block's tool writes it, read into notes: one entry a time step, in order. `{ "string": 6, "fret": 5,
 * "beats": 1 }` is a note (strings are guitar numbers, 6 the low E), `{ "frets": [note, note], "beats": 1 }` notes struck
 * together (`beats` the time to the next step) and `{ "rest": 1 }` a rest. An `error` names the first step that can't be read.
 */
export function readRiff(raw: unknown): { notes: RiffNote[] } | { error: string } {
  if (!Array.isArray(raw) || !raw.length) return { error: "no notes" };
  const notes: RiffNote[] = [];
  for (const [i, step] of raw.entries()) {
    if (isObj(step) && "rest" in step) {
      if (!isLength(step.rest)) return { error: `step ${i + 1} is a rest of length ${JSON.stringify(step.rest)}` };
      notes.push({ string: null, fret: null, beats: step.rest });
      continue;
    }
    const cells = (isObj(step) && Array.isArray(step.frets) ? (step.frets as unknown[]) : [step]).map((c) => cellOf(c, i));
    const bad = cells.find((c): c is string => typeof c === "string");
    if (bad) return { error: bad };
    const group = cells as RiffNote[];
    if (!group.length || new Set(group.map((n) => n.string)).size !== group.length) return { error: `step ${i + 1} needs one note a string` };
    group.sort((a, b) => a.string! - b.string!).forEach((n, k) => notes.push(k ? { ...n, with: true } : n));
  }
  return notes.some((n) => n.string !== null) ? { notes } : { error: "no notes" };
}

/** Notes as a block's tool writes them (`readRiff` reads them back): one entry a time step. */
export function writeRiff(notes: RiffNote[]): unknown[] {
  const cell = (n: RiffNote) => ({ string: 6 - n.string!, fret: n.fret!, beats: n.beats });
  return columnsOf(notes).map((c) => {
    const ns = c.idx.map((i) => notes[i]).filter((n) => n.string !== null);
    if (!ns.length) return { rest: c.beats };
    return ns.length === 1 ? cell(ns[0]) : { frets: ns.map(cell), beats: c.beats };
  });
}
