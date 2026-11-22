import { makeKeyContext } from "@/features/theory/theory";
import { DYAD_MAX_FRET, intervalFits, intervalPairs, intervalWalk, type Dyad, type IntervalSize } from "@/lib/chordKit/scaleChords";
import { melodyTonic } from "../timeline/degrees";
import { BEATS_PER_BAR, clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { arr, isObj, keyPc, num, repeatsOf } from "./common";

/*
 * The interval shape: one interval (or a few, one after the other) as a shape on the neck, its two notes played one
 * after the other, on one string, the next string or two strings over. Every fret is chordKit's (`intervalPairs`, the
 * code the double stops come from): this file only puts the pairs in playing order. Pure.
 */

/** The intervals, as the `intervals` prop names them, and the size chordKit knows each by. */
export const INTERVAL_NAMES = ["2nd", "3rd", "4th", "5th", "6th", "7th", "octave"] as const;
export type IntervalName = (typeof INTERVAL_NAMES)[number];
export const INTERVAL_SIZE: Record<IntervalName, IntervalSize> = { "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6, "7th": 7, octave: 8 };
export const isIntervalName = (v: unknown): v is IntervalName => INTERVAL_NAMES.includes(v as IntervalName);

export const INTERVAL_DIRECTIONS = ["up", "down", "both"] as const;
export type IntervalDirection = (typeof INTERVAL_DIRECTIONS)[number];
export const INTERVAL_WALKS = ["scale", "note"] as const;
export type IntervalWalk = (typeof INTERVAL_WALKS)[number];

/** The frets the lower note may walk between, the frets it walks when the shape names none, and the longest line. */
export const INTERVAL_LIMITS = { minFret: 0, maxFret: DYAD_MAX_FRET, from: 0, to: 12, maxBars: 32 };

/** One note of the line: its pitch, the string it is played on (an index, 0 the low E) and a cue shown from it on. */
export interface IntervalNote { midi: number; string: number; cue?: string }

/** "5ths", "octaves". */
const plural = (name: IntervalName) => `${name}s`;
/** "A 5th", "An octave". */
const single = (name: IntervalName) => `${name === "octave" ? "An" : "A"} ${name}`;

/** `strings` as two string indices, the lower note's first ("64": the low E and the D string; "66": along the low E); null when unreadable. */
export function intervalStrings(v: unknown): [number, number] | null {
  const m = typeof v === "string" || typeof v === "number" ? /^([1-6])([1-6])$/.exec(String(v)) : null;
  if (!m) return null;
  const pair: [number, number] = [6 - Number(m[1]), 6 - Number(m[2])];
  return pair[1] >= pair[0] ? pair : null;
}

const note = (d: Dyad, i: 0 | 1, cue?: string): IntervalNote => ({ midi: d.midi[i], string: d.strings[i], ...(cue ? { cue } : {}) });

/**
 * The shape's notes in playing order, one list per interval, or `error`: why it can't be played, in words for the
 * writer. `walk` "scale": the interval from every note of the scale whose lower note sits from fret `from` to fret
 * `to`, climbing the strings low note first ("up"), coming back down them high note first ("down"), or there and back
 * ("both"). `walk` "note": from the key note on the first string, the note the interval above it on the second string
 * ("up"), the note the interval below it the same number of strings the other way ("down"), or both in turn.
 */
export function intervalLine(raw: unknown): { runs: IntervalNote[][] } | { error: string } {
  if (!isObj(raw)) return { error: "no shape" };
  const key = keyPc(raw.key);
  if (key === null) return { error: `key ${JSON.stringify(raw.key) ?? "(none)"} is not a note` };
  const names = arr(raw.intervals).filter(isIntervalName).filter((n, i, all) => all.indexOf(n) === i);
  if (!names.length || names.length !== arr(raw.intervals).length) return { error: `"intervals" is a list of ${INTERVAL_NAMES.join(", ")}, each once` };
  const strings = intervalStrings(raw.strings);
  if (!strings) return { error: `"strings" is two guitar numbers, the lower note's string first and the upper note's second ("64", "65", "66" for one string)` };
  const direction: IntervalDirection = raw.direction === undefined ? "both" : (raw.direction as IntervalDirection);
  if (!INTERVAL_DIRECTIONS.includes(direction)) return { error: `"direction" is ${INTERVAL_DIRECTIONS.join(", ")}` };
  const walk: IntervalWalk = raw.walk === undefined ? "scale" : (raw.walk as IntervalWalk);
  if (!INTERVAL_WALKS.includes(walk)) return { error: `"walk" is ${INTERVAL_WALKS.join(" or ")}` };
  const { minFret, maxFret } = INTERVAL_LIMITS;
  const from = num(raw.from, INTERVAL_LIMITS.from), to = num(raw.to, INTERVAL_LIMITS.to);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < minFret || to > maxFret || from > to) return { error: `"from" and "to" are frets ${minFret} to ${maxFret}, "from" the lower` };
  const ctx = makeKeyContext(key, 0, 0);
  const id = `${6 - strings[0]}${6 - strings[1]}`;
  for (const n of names) if (!intervalFits(ctx, INTERVAL_SIZE[n], strings)) return { error: `strings ${id} don't hold ${plural(n)} within 4 frets` };

  if (walk === "scale") {
    const runs: IntervalNote[][] = [];
    for (const n of names) {
      const pairs = intervalWalk(ctx, INTERVAL_SIZE[n], strings, from, to);
      if (!pairs.length) return { error: `no ${n} on strings ${id} has its lower note from fret ${from} to fret ${to}` };
      const up = pairs.flatMap((d, i) => [note(d, 0, i ? undefined : `${plural(n)} up`), note(d, 1)]);
      const down = [...pairs].reverse().flatMap((d, i) => [note(d, 1, i ? undefined : `${plural(n)} down`), note(d, 0)]);
      runs.push(direction === "up" ? up : direction === "down" ? down : [...up, ...down]);
    }
    return { runs };
  }

  // from one note: the key note on the first string, the other note a string shape away on either side of it
  const gap = strings[1] - strings[0];
  const home = strings[0];
  const wantUp = direction !== "down", wantDown = direction !== "up";
  if (wantDown && home - gap < 0) return { error: `from string ${6 - home} there is no string ${gap === 1 ? "one string" : "two strings"} lower for the note below` };
  const above = (n: IntervalName, fret: number) => intervalPairs(ctx, INTERVAL_SIZE[n], [home, home + gap]).find((d) => d.degree === 0 && d.frets[0] === fret);
  const below = (n: IntervalName, fret: number) => (intervalFits(ctx, INTERVAL_SIZE[n], [home - gap, home]) ? intervalPairs(ctx, INTERVAL_SIZE[n], [home - gap, home]).find((d) => d.upper === 0 && d.frets[1] === fret) : undefined);
  const places = Array.from({ length: maxFret + 1 }, (_, f) => f).filter((f) => names.every((n) => (!wantUp || above(n, f)) && (!wantDown || below(n, f))));
  const fret = places.find((f) => f >= from && f <= to) ?? places[0];
  if (fret === undefined) return { error: `no place on string ${6 - home} lets the key note reach ${names.join(", ")} ${direction === "both" ? "above and below" : direction === "up" ? "above" : "below"} on these strings` };
  return {
    runs: names.map((n) => {
      const a = above(n, fret), b = below(n, fret);
      return [
        ...(wantUp && a ? [note(a, 0, `${single(n)} up`), note(a, 1)] : []),
        ...(wantDown && b ? [note(b, 1, `${single(n)} down`), note(b, 0)] : []),
      ];
    }),
  };
}

/** One interval as a shape on the neck, played one note a beat; each interval of the list starts on a new bar. */
export function interval(raw: unknown): Timeline | null {
  const line = intervalLine(raw);
  if ("error" in line || !isObj(raw)) return null;
  const key = keyPc(raw.key)!;
  const tonic = melodyTonic(key);
  const events: TimelineEvent[] = [{ type: "scale", at: 0, key, scale: "major-ionian" }];
  let at = 0;
  for (const run of line.runs) {
    at = Math.ceil(at / BEATS_PER_BAR) * BEATS_PER_BAR;
    for (const n of run) events.push({ type: "step", at: at++, beats: 1, chord: "", step: { kind: "note", semis: n.midi - tonic, from: "key", string: 6 - n.string }, ...(n.cue ? { cue: n.cue } : {}) });
  }
  const bars = Math.ceil(at / BEATS_PER_BAR);
  if (bars > INTERVAL_LIMITS.maxBars) return null;
  return clampTimeline({ bpm: num(raw.bpm, 80), bars, events, ...repeatsOf(raw) });
}

/** The steps of the intervals-on-neck track an interval shape can stand for (the `intervals-on-neck` ladder). */
export const INTERVAL_STEPS_HELD = [
  { key: "octaves", name: "Octaves", holds: "only octaves, two strings over (\"64\", \"53\", \"42\", \"31\"), through the scale, up and down (direction \"both\")" },
  { key: "fifths-fourths", name: "5ths and 4ths", holds: "5ths, 4ths or both, along one string or on the next string, through the scale" },
  { key: "thirds-sixths", name: "3rds and 6ths", holds: "3rds, 6ths or both, on any strings that hold them, through the scale" },
  { key: "one-note", name: "From one note", holds: "any intervals from the key note, above it and below it (walk \"note\", direction \"both\")" },
  { key: "every", name: "Every interval", holds: "a 2nd or a 7th among the intervals, on any strings that hold them, through the scale, up and down (direction \"both\")" },
] as const;
export type IntervalStepKey = (typeof INTERVAL_STEPS_HELD)[number]["key"];

/** The step an interval shape stands for, read from the shape itself; null for a set-up that is no step's own (5ths with 3rds, octaves along one string). */
export function intervalStep(raw: unknown): IntervalStepKey | null {
  if (!isObj(raw) || raw.shape !== "interval" || "error" in intervalLine(raw)) return null;
  const names = arr(raw.intervals) as IntervalName[];
  const [lo, hi] = intervalStrings(raw.strings)!;
  const both = raw.direction === undefined || raw.direction === "both";
  const only = (...set: IntervalName[]) => names.every((n) => set.includes(n));
  if (raw.walk === "note") return both ? "one-note" : null;
  if (names.includes("2nd") || names.includes("7th")) return both ? "every" : null;
  if (only("octave")) return hi - lo === 2 && both ? "octaves" : null;
  if (only("5th", "4th")) return hi - lo <= 1 ? "fifths-fourths" : null;
  if (only("3rd", "6th")) return "thirds-sixths";
  return null;
}
