/**
 * The video's score: an optional silent intro, then each tune behind a four-beat countdown, sung `times` times straight on.
 * Pure functions of the config and a time in ms, so the render page can ask for any frame and the soundtrack comes from the
 * same numbers.
 */
import type { Step } from "@/features/sound";
import { VOICES, buildLadder, clefFor, tuneLadderFor, type Ladder } from "@/features/theory/singing";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import { barsOf, parseTune, placeTune, type PlacedNote } from "@/features/theory/singingMelodies";
import { solfege } from "@/features/theory/labels";
import type { Clef } from "@/features/theory/piano/staff";
import { FPS, type VideoConfig, type VideoIntro } from "./config";

export const COUNTDOWN_BEATS = 4;

/** the soundtrack runs this long past the last beat so the final note rings out */
export const TAIL_MS = 1000;

export interface Segment {
  caption: string;
  label?: string;
  notes: PlacedNote[];
  /** one pass, in whole bars */
  tuneBeats: number;
  times: number;
  /** its countdown's first beat */
  startBeat: number;
}

export interface Score {
  intro: VideoIntro | null;
  /** the intro's length; every beat comes this much later */
  introMs: number;
  beatMs: number;
  ladder: Ladder;
  clef: Clef;
  segments: Segment[];
  totalBeats: number;
  durationMs: number;
}

export type Moment =
  /** the intro's text, the first tune already on the staff */
  | { phase: "intro"; segment: 0 }
  | { phase: "countdown"; segment: number; left: number }
  /** `beats` since this tune's first beat 1, counted on across its passes; `pass` from 1 */
  | { phase: "play"; segment: number; beats: number; pass: number }
  | { phase: "end"; segment: number };

/** A metronome click, `at` ms from the start. */
export interface Click {
  at: number;
  accent: boolean;
}

/** The score for a config: tunes placed the way the Melodies page places them. */
export function buildScore(c: VideoConfig): Score {
  const range = VOICES[c.voice];
  const ladder = buildLadder(c.scale, c.tonicPc, range)!;
  const tuneLadder = tuneLadderFor(ladder, c.tonicPc, range);
  const introMs = c.intro ? c.intro.seconds * 1000 : 0;
  let startBeat = 0;
  const segments = c.timeline.map((t): Segment => {
    const tune = parseTune(t.tune);
    const seg = { caption: t.caption, label: t.label, notes: placeTune(tune, tuneLadder, range), tuneBeats: barsOf(tune) * BEATS_PER_BAR, times: t.times, startBeat };
    startBeat += COUNTDOWN_BEATS + seg.tuneBeats * seg.times;
    return seg;
  });
  return { intro: c.intro ?? null, introMs, beatMs: 60000 / c.bpm, ladder, clef: clefFor(range), segments, totalBeats: startBeat, durationMs: introMs + startBeat * (60000 / c.bpm) + TAIL_MS };
}

/** What is on screen at `ms`: the intro, a countdown number, the tune playing, or the end. */
export function momentAt(s: Score, ms: number): Moment {
  if (s.introMs > 0 && ms < s.introMs) return { phase: "intro", segment: 0 };
  const beat = (ms - s.introMs) / s.beatMs;
  if (beat < 0) return { phase: "countdown", segment: 0, left: COUNTDOWN_BEATS };
  if (beat >= s.totalBeats) return { phase: "end", segment: s.segments.length - 1 };
  const i = s.segments.findLastIndex((g) => g.startBeat <= beat);
  const into = beat - s.segments[i].startBeat;
  if (into < COUNTDOWN_BEATS) return { phase: "countdown", segment: i, left: COUNTDOWN_BEATS - Math.floor(into) };
  const g = s.segments[i];
  const beats = into - COUNTDOWN_BEATS;
  return { phase: "play", segment: i, beats, pass: Math.min(g.times, Math.floor(beats / g.tuneBeats) + 1) };
}

/** A tune's every pass written out end to end, the way it is sung: one line the bar runs along without coming back. */
export function passesOf(g: Segment): PlacedNote[] {
  return Array.from({ length: g.times }, (_, pass) => g.notes.map((n) => ({ ...n, at: n.at + pass * g.tuneBeats }))).flat();
}

/** The piano (every pass of every tune) and the click (every beat, accented on beat 1), in ms. */
export function soundOf(s: Score): { piano: Step[]; clicks: Click[] } {
  const piano = s.segments.flatMap((g) =>
    passesOf(g).map((n) => ({ note: n.midi, at: s.introMs + (g.startBeat + COUNTDOWN_BEATS + n.at) * s.beatMs, hold: n.beats * s.beatMs * 0.9 })),
  );
  const clicks = Array.from({ length: s.totalBeats }, (_, b) => ({ at: s.introMs + b * s.beatMs, accent: b % BEATS_PER_BAR === 0 }));
  return { piano, clicks };
}

/** A tune in solfège, bar by bar: [["Do", "Re", "Mi", "Re"], ["Do"]]. */
export function solfegeBars(notes: PlacedNote[]): string[][] {
  const bars: string[][] = [];
  for (const n of notes) (bars[Math.floor(n.at / BEATS_PER_BAR)] ??= []).push(solfege(n.label));
  return bars.filter(Boolean);
}

export const frameCount = (s: Score): number => Math.ceil((s.durationMs / 1000) * FPS);
