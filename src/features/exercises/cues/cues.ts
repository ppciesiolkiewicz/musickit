import { makeKeyContext } from "@/features/theory/theory";
import { arpPositions, buildArpeggio, neckCells, type ArpPosition } from "@/lib/chordKit/arpeggios";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { compEvents } from "@/lib/practice/comping";
import type { Place, Timeline, TimelineEvent } from "../timeline/types";
import { chordShapeFor, type VoicedShape } from "./voicing";

export interface Fret { string: number; fret: number }

/** One thing to play or draw: a strum, a single note, or a backing hit. String 0 is the low E. */
export interface Cue {
  at: number;
  beats: number;
  chord: string;
  kind: "strum" | "note" | "backing";
  midi: number[];
  frets: Fret[];
  highlighted: boolean;
  cue?: string;
}

type ChordEv = Extract<TimelineEvent, { type: "chord" }>;
type StepEv = Extract<TimelineEvent, { type: "step" }>;
interface Cell extends Fret { midi: number }

const MAX_FRET = 17;
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const samePlace = (a?: Place, b?: Place) => a?.box === b?.box && a?.part === b?.part;

/** The sounding strings of a voiced shape. */
function shapeCells(v: VoicedShape): Cell[] {
  const out: Cell[] = [];
  v.shape.f.forEach((off, s) => {
    if (off !== null) out.push({ string: s, fret: v.fret + off, midi: OPEN_MIDI[s] + v.fret + off });
  });
  return out;
}

/** Every cell of the neck with pitch class `pc`, frets `lo..hi`. */
function neckOf(pc: number, lo = 0, hi = MAX_FRET): Cell[] {
  const out: Cell[] = [];
  for (let s = 0; s < 6; s++) for (let f = Math.max(0, lo); f <= Math.min(MAX_FRET, hi); f++) if (mod12(OPEN_MIDI[s] + f) === pc) out.push({ string: s, fret: f, midi: OPEN_MIDI[s] + f });
  return out;
}

/** Closest to the previous cue (by pitch, then by string), or the lowest when there is none. */
function nearest(cells: Cell[], prev: Cell | null): Cell | undefined {
  if (!prev) return [...cells].sort((a, b) => a.midi - b.midi)[0];
  return [...cells].sort((a, b) => Math.abs(a.midi - prev.midi) - Math.abs(b.midi - prev.midi) || Math.abs(a.string - prev.string) - Math.abs(b.string - prev.string) || a.midi - b.midi)[0];
}

const boxCache = new Map<string, ArpPosition[]>();
/** The arpeggio positions of a chord, in `arpPositions` order (box N is entry N - 1). */
function boxesOf(name: string): ArpPosition[] {
  const hit = boxCache.get(name);
  if (hit) return hit;
  const q = parseChordQuery(name);
  let out: ArpPosition[] = [];
  if (q) {
    const ctx = makeKeyContext(q.rootPc, 0, 0);
    const arp = buildArpeggio(ctx, 0, "maj");
    // the chord's own tones, spelled loosely: only pitch classes matter for positions
    arp.notes = q.semis.map((s, i) => ({ pc: mod12(q.rootPc + s), name: "", role: i === 0 && s === 0 ? "R" : String(s), outside: false }));
    if (!q.semis.includes(0)) arp.notes.unshift({ pc: q.rootPc, name: "", role: "R", outside: false });
    out = arpPositions(neckCells(ctx, arp));
  }
  boxCache.set(name, out);
  return out;
}

/** Notes of a box limited to its part: strings 0-2 for `lower`, 3-5 for `upper`. */
function partNotes(name: string, place: Place): Cell[] {
  const box = boxesOf(name)[place.box - 1];
  if (!box) return [];
  return box.notes
    .filter((n) => (place.part === "lower" ? n.string <= 2 : place.part === "upper" ? n.string >= 3 : true))
    .map((n) => ({ string: n.string, fret: n.fret, midi: n.midi }));
}

/**
 * A crossing path over pitch classes `pcs`: up through `from`, then down through `to` below the top note, so a note
 * both parts share at the top is played once, at the turn.
 */
function crossingPath(name: string, from: Place, to: Place, pcs: Set<number>): Cell[] {
  const up = partNotes(name, from).filter((n) => pcs.has(mod12(n.midi))).sort((a, b) => a.midi - b.midi);
  if (!up.length) return [];
  const top = up[up.length - 1].midi;
  const down = partNotes(name, to).filter((n) => pcs.has(mod12(n.midi)) && n.midi < top).sort((a, b) => b.midi - a.midi);
  return [...up, ...down];
}

/**
 * Turn a timeline into cues, sorted by `at`.
 * - A note step's pitch class is its root (the chord root, or the current scale's key for `from: "key"`) plus `semis`.
 *   It goes on the voiced shape when the shape has it (nearest the previous cue), else within the shape's fret span
 *   plus or minus 2. With `place` it comes from that box (and part) of the chord's arpeggio positions instead
 *   (box N is `arpPositions` entry N - 1); a pitch outside the arpeggio takes any fret in the box span on the part's strings.
 * - Consecutive placed note steps over the same chord whose place changes form a crossing: they walk up the first
 *   place and down the second (see `crossingPath`), one note per step, wrapping.
 * - A melody step (chord "") is the tonic (the key nearest midi 60) plus `semis` exactly (semis carry the octave);
 *   it sits on the neck near the previous fret.
 * - `highlighted` is whether opts/chord `highlight` holds the note's semitones above the root (any note, for chords).
 * - A chord with `backing` adds `backing` cues from `compEvents`.
 */
export function cuesOf(t: Timeline, opts: { highlight?: number[] } = {}): Cue[] {
  const events = [...t.events].sort((a, b) => a.at - b.at);
  const chords = events.filter((e): e is ChordEv => e.type === "chord");
  const scales = events.filter((e): e is Extract<TimelineEvent, { type: "scale" }> => e.type === "scale");
  const keyAt = (at: number) => [...scales].reverse().find((s) => s.at <= at)?.key ?? 0;
  const chordAt = (name: string, at: number) => [...chords].reverse().find((c) => c.name === name && c.at <= at) ?? chords.find((c) => c.name === name);
  const voiced = new Map<string, VoicedShape | null>();
  const voice = (c: ChordEv | undefined, name: string) => {
    const k = `${name}|${c?.voicing ?? "open"}`;
    if (!voiced.has(k)) voiced.set(k, chordShapeFor(name, c?.voicing ?? "open"));
    return voiced.get(k) ?? null;
  };
  const lit = (semis: number[], c?: ChordEv) => {
    const h = opts.highlight ?? c?.highlight;
    return !h || semis.some((s) => h.map(mod12).includes(mod12(s)));
  };
  const out: Cue[] = [];

  for (const c of chords) {
    const v = voice(c, c.name);
    if (!c.backing || !v) continue;
    const cells = shapeCells(v);
    const rootPc = parseChordQuery(c.name)?.rootPc ?? 0;
    for (const e of compEvents(v.midi, c.backing, c.beats)) {
      out.push({ at: c.at + e.beat, beats: e.len, chord: c.name, kind: "backing", midi: e.midi, frets: e.midi.flatMap((m) => cells.filter((x) => x.midi === m).slice(0, 1).map(({ string, fret }) => ({ string, fret }))), highlighted: lit(e.midi.map((m) => m - rootPc), c) });
    }
  }

  // crossings: runs of placed note steps over one chord whose place changes
  const steps = events.filter((e): e is StepEv => e.type === "step");
  const crossing = new Map<StepEv, Cell>();
  for (let i = 0; i < steps.length; ) {
    let j = i;
    const s0 = steps[i];
    while (j < steps.length && steps[j].step.kind === "note" && steps[j].place && steps[j].chord === s0.chord && s0.chord) j++;
    const run = steps.slice(i, j);
    const to = run.find((s) => !samePlace(s.place, s0.place))?.place;
    if (to && s0.place) {
      const rootPc = parseChordQuery(s0.chord)?.rootPc ?? 0;
      const pcs = new Set(run.map((s) => mod12((s.step.kind === "note" && s.step.from === "key" ? keyAt(s.at) : rootPc) + (s.step.kind === "note" ? s.step.semis : 0))));
      const path = crossingPath(s0.chord, s0.place, to, pcs);
      if (path.length) run.forEach((s, k) => crossing.set(s, path[k % path.length]));
    }
    i = Math.max(j, i + 1);
  }

  let prev: Cell | null = null;
  for (const e of steps) {
    const c = chordAt(e.chord, e.at);
    const base = { at: e.at, beats: e.beats, chord: e.chord, ...(e.cue ? { cue: e.cue } : {}) };
    if (e.step.kind === "strum") {
      const v = e.chord ? voice(c, e.chord) : null;
      if (!v) continue;
      const rootPc = parseChordQuery(e.chord)?.rootPc ?? 0;
      const cells = shapeCells(v);
      out.push({ ...base, kind: "strum", midi: v.midi, frets: cells.map(({ string, fret }) => ({ string, fret })), highlighted: lit(v.midi.map((m) => m - rootPc), c) });
      continue;
    }
    const q = e.chord ? parseChordQuery(e.chord) : null;
    const key = keyAt(e.at);
    const rootPc = e.step.from === "key" || !q ? key : q.rootPc;
    const pc = mod12(rootPc + e.step.semis);
    let cell: Cell | undefined = crossing.get(e);
    if (!cell && !e.chord) {
      const tonic = 60 + mod12(key - 60 + 6) - 6;
      const midi = tonic + e.step.semis; // semis already carry the octave
      const refFret: number = prev?.fret ?? 5;
      cell = [...neckOf(pc)].filter((x) => x.midi === midi).sort((a, b) => Math.abs(a.fret - refFret) - Math.abs(b.fret - refFret) || a.fret - b.fret)[0] ?? { string: -1, fret: -1, midi };
    }
    if (!cell && e.place) {
      const part = partNotes(e.chord, e.place);
      const box = boxesOf(e.chord)[e.place.box - 1];
      // a pitch outside the arpeggio: any fret inside the box span, on the part's strings
      const inSpan = box ? neckOf(pc, box.from, box.to).filter((x) => (e.place?.part === "lower" ? x.string <= 2 : e.place?.part === "upper" ? x.string >= 3 : true)) : [];
      cell = nearest(part.filter((x) => mod12(x.midi) === pc), prev) ?? nearest(inSpan, prev);
    }
    if (!cell) {
      const v = voice(c, e.chord);
      if (v) {
        const cells = shapeCells(v);
        const frets = cells.map((x) => x.fret);
        cell = nearest(cells.filter((x) => mod12(x.midi) === pc), prev) ?? nearest(neckOf(pc, Math.min(...frets) - 2, Math.max(...frets) + 2), prev);
      }
    }
    if (!cell) continue;
    out.push({ ...base, kind: "note", midi: [cell.midi], frets: cell.string < 0 ? [] : [{ string: cell.string, fret: cell.fret }], highlighted: lit([cell.midi - (q && e.chord ? q.rootPc : key)], c) });
    prev = cell;
  }
  return out.sort((a, b) => a.at - b.at || (a.kind === "backing" ? 1 : 0) - (b.kind === "backing" ? 1 : 0));
}
