import { useLayoutEffect, useRef, useState } from "react";
import type { LabelRoot } from "@/features/theory/labels";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { ScaleCell } from "@/lib/chordKit/scalePositions";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import type { Cue, Marks } from "../../cues/cues";
import { BEATS_PER_BAR } from "../../timeline/timeline";

export interface ViewProps {
  /** cues to draw (backing left out, hidden ones already removed) */
  cues: Cue[];
  /** beat within the loop, -1 when stopped */
  pos: number;
  /** loop length in beats */
  length: number;
  /** the key's pitch class, when the timeline has one */
  keyPc?: number;
  /** the notes enabled and highlighted, semitones above the chord root (the key for a melody) */
  marks?: Marks;
}

export const isNow = (c: Cue, pos: number) => pos >= 0 && pos >= c.at && pos < c.at + c.beats;
export const shade = (c: Cue, now: boolean) => (now ? "var(--color-sky-300)" : c.enabled ? "var(--color-slate-100)" : "var(--color-slate-600)");

/** The cue sounding at `pos`, the last one started before it, or (stopped) the first: whose chord the views show as current. */
export const currentCue = (cues: Cue[], pos: number): Cue | undefined => (pos < 0 ? cues[0] : [...cues].reverse().find((c) => c.at <= pos) ?? cues[0]);

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
/** roots spelled with flats: F, B♭, E♭, A♭, D♭ */
const FLAT_ROOTS = new Set([5, 10, 3, 8, 1]);
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
/** semitones above the root to the 0-based degree whose colour the dot takes */
const SEMI_DEGREE = [0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * What a cue's labels and colours count from, by the "count from" setting: the key when it says scale root and the
 * timeline has one, else the chord root. A melody note (no chord) always counts from the key.
 */
export function rootOf(c: Cue, keyPc: number | undefined, from: LabelRoot): number {
  const chord = c.chord ? parseChordQuery(c.chord)?.rootPc : undefined;
  if (chord === undefined) return keyPc ?? 0;
  return from === "scale" && keyPc !== undefined ? keyPc : chord;
}

/** A note as the shared neck and staff label it: its name (spelled for the root), semitones and degree above the root. */
export function noteOf(midi: number, root: number): { pc: number; name: string; semi: number; degree: number; degreeText: string } {
  const pc = mod12(midi), semi = mod12(pc - root);
  return { pc, name: (FLAT_ROOTS.has(root) ? FLAT : SHARP)[pc], semi, degree: SEMI_DEGREE[semi], degreeText: SEMI_TEXT[semi] };
}

/** A place on the neck as a `ScaleCell`, labelled from `root`. */
export function cellOf(string: number, fret: number, root: number): ScaleCell {
  const midi = OPEN_MIDI[string] + fret;
  return { string, fret, midi, ...noteOf(midi, root) };
}

/** A ref and the width of the element it is on, kept up to date (`fallback` until measured). */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Drawing scale for a view `width` px wide: a little larger where there is room. */
export const zoomFor = (width: number) => (width >= 720 ? 1.3 : width >= 480 ? 1.15 : 1);

/**
 * The loop cut into rows of whole bars to fill `width` (after the `lead` each row starts with): as many bars a row as
 * fit at `minUnit` a beat, spread evenly over the rows, then each beat stretched to fill (at most `maxUnit`).
 */
export function rowsOf(length: number, width: number, lead: number, minUnit: number, maxUnit: number): { rows: [number, number][]; unit: number } {
  const bars = Math.max(1, Math.ceil(length / BEATS_PER_BAR));
  const room = Math.max(1, width - lead);
  const fit = Math.min(bars, Math.max(1, Math.floor(room / (minUnit * BEATS_PER_BAR))));
  const perRow = Math.ceil(bars / Math.ceil(bars / fit));
  const unit = Math.min(maxUnit, room / (perRow * BEATS_PER_BAR));
  const rows: [number, number][] = [];
  for (let b = 0; b < bars; b += perRow) rows.push([b * BEATS_PER_BAR, Math.min(length, (b + perRow) * BEATS_PER_BAR)]);
  return { rows, unit };
}
