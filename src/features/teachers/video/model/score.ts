/**
 * The video's score: an optional silent intro, then each tune behind a four-beat countdown, sung `times` times straight on.
 * Pure functions of the config and a time in ms, so the render page can ask for any frame and the soundtrack comes from the
 * same numbers.
 */
import type { Step } from "@/features/sound";
import { VOICES, buildLadder, clefFor, tuneLadderFor, type Ladder } from "@/features/theory/singing";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import { barsOf, parseTune, type PlacedNote } from "@/features/theory/singingMelodies";
import { chordSteps, harmoniseTune, type MelodyChord } from "@/features/theory/melodyChords";
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
  /** the chords under one pass, a bar each */
  chords: MelodyChord[];
  /** one pass, in whole bars */
  tuneBeats: number;
  times: number;
  /** its countdown's first beat */
  startBeat: number;
}

export interface Score {
  intro: VideoIntro | null;
  /** the tune the piano plays under the intro, from the video's start, with no countdown; null for a silent intro */
  introMusic: Segment | null;
  /** the intro's length (its music's, when it has some); every beat comes this much later */
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
  const beatMs = 60000 / c.bpm;
  const place = (t: { tune: string; label?: string; times: number }, caption: string, startBeat: number): Segment => {
    const tune = parseTune(t.tune);
    const { notes, chords } = harmoniseTune(tune, tuneLadder, range);
    return { caption, label: t.label, notes, chords, tuneBeats: barsOf(tune) * BEATS_PER_BAR, times: t.times, startBeat };
  };
  const music = c.intro?.music;
  const introMusic = music ? place(music, "", 0) : null;
  const introMs = introMusic ? introMusic.tuneBeats * introMusic.times * beatMs : c.intro ? c.intro.seconds * 1000 : 0;
  let startBeat = 0;
  const segments = c.timeline.map((t): Segment => {
    const seg = place(t, t.caption, startBeat);
    startBeat += COUNTDOWN_BEATS + seg.tuneBeats * seg.times;
    return seg;
  });
  return { intro: c.intro ?? null, introMusic, introMs, beatMs, ladder, clef: clefFor(range), segments, totalBeats: startBeat, durationMs: introMs + startBeat * beatMs + TAIL_MS };
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

/** A tune's chords for every pass, the way passesOf writes its notes. */
export function chordPassesOf(g: Segment): MelodyChord[] {
  return Array.from({ length: g.times }, (_, pass) => g.chords.map((c) => ({ ...c, at: c.at + pass * g.tuneBeats }))).flat();
}

/** A segment's notes and chords as piano steps, every pass, from `start` ms. */
const pianoOf = (g: Segment, start: number, beatMs: number) => [
  ...passesOf(g).map((n) => ({ note: n.midi, at: start + n.at * beatMs, hold: n.beats * beatMs * 0.9 })),
  ...chordSteps(chordPassesOf(g), beatMs).map((c) => ({ ...c, at: start + c.at })),
];

/** The piano (the intro's music, then every pass of every tune, the chords under it softer) and the click (every beat, accented on beat 1), in ms. */
export function soundOf(s: Score): { piano: Step[]; clicks: Click[] } {
  const piano = [
    ...(s.introMusic ? pianoOf(s.introMusic, 0, s.beatMs) : []),
    ...s.segments.flatMap((g) => pianoOf(g, s.introMs + (g.startBeat + COUNTDOWN_BEATS) * s.beatMs, s.beatMs)),
  ];
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
