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
