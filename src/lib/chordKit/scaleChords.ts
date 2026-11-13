import type { KeyContext } from "@/features/theory/theory";
import type { ScalePosition } from "./scalePositions";
import { OPEN_MIDI } from "./shapeTools";
import { STRING_GROUPS, TRIAD_QUALITIES, triadVoicings, type StringGroup, type TriadQuality, type TriadVoicing } from "./triads";

/**
 * Chords inside a scale: the key's double stops (two scale notes a 3rd, 4th or 6th apart, struck together on two strings)
 * and the key's triads inside one scale position. Strings are indices, 0 = low E … 5 = high e. Pure.
 */

const MAX_FRET = 17;
const MAX_SPAN = 4;

/** A double stop's interval, as scale steps above its lower note: a 3rd is two steps up the scale, a 5th four. */
export const DYAD_STEPS = { 3: 2, 4: 3, 5: 4, 6: 5 } as const;
export type DyadInterval = keyof typeof DYAD_STEPS;

export interface Dyad {
  /** 0-based scale degree of the lower note */
  degree: number;
  /** 0-based scale degree of the upper note */
  upper: number;
  /** string indices, low then high */
  strings: [number, number];
  frets: [number, number];
  midi: [number, number];
  /** semitones between the two notes: 3 or 4 in a 3rd, 8 or 9 in a 6th */
  semis: number;
  lowestFret: number;
}

/** The string pairs a double stop of this interval sits on: neighbours for 3rds, 4ths and 5ths, one string skipped for 6ths. */
export function dyadPairs(interval: DyadInterval): [number, number][] {
  const gap = interval === 6 ? 2 : 1;
  return Array.from({ length: 6 - gap }, (_, lo) => [lo, lo + gap] as [number, number]);
}

/**
 * Every double stop of the key's scale on one pair of strings: for each degree, the degree `interval` up the scale above it
 * (a diatonic 3rd, 4th, 5th or 6th, so its size follows the scale), within 4 frets, frets 0-17. Sorted by degree, then fret.
 */
export function diatonicDyads(ctx: KeyContext, interval: DyadInterval, strings: [number, number]): Dyad[] {
  const steps = DYAD_STEPS[interval];
  const [lo, hi] = strings;
  const out: Dyad[] = [];
  for (let d = 0; d < 7; d++) {
    const upper = (d + steps) % 7;
    const pc = (ctx.tonic.pc + ctx.steps[d]) % 12;
    const semis = (ctx.steps[upper] - ctx.steps[d] + 12) % 12;
    for (let fa = 0; fa <= MAX_FRET; fa++) {
      const a = OPEN_MIDI[lo] + fa;
      if (a % 12 !== pc) continue;
      const fb = a + semis - OPEN_MIDI[hi];
      if (fb < 0 || fb > MAX_FRET || Math.abs(fb - fa) > MAX_SPAN) continue;
      out.push({ degree: d, upper, strings: [lo, hi], frets: [fa, fb], midi: [a, a + semis], semis, lowestFret: Math.min(fa, fb) });
    }
  }
  return out.sort((x, y) => x.degree - y.degree || x.lowestFret - y.lowestFret);
}

const ROMAN_INDEX: Record<string, number> = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };

/** A degree of the key from a numeral as written ("iv", "♭VII", "bVII", "ii°") or a number 1-7; null when it isn't one. Case and accidentals are ignored: the key decides the chord. */
export function degreeOfNumeral(s: string): number | null {
  const t = s.trim();
  if (/^[1-7]$/.test(t)) return Number(t) - 1;
  const r = ROMAN_INDEX[t.toLowerCase().replace(/[^iv]/g, "")];
  return r === undefined ? null : r;
}

export interface PositionTriad {
  /** 0-based degree of the chord's root */
  degree: number;
  roman: string;
  /** "Dm", "Bdim" */
  name: string;
  quality: TriadQuality;
  /** the voicings whose three notes are all in the position, low fret first */
  voicings: TriadVoicing[];
}

const cellKey = (s: number, f: number) => `${s}-${f}`;

/**
 * The key's triads on one string set inside one position: each of `degrees` (all seven when absent) with the closed
 * voicings that use only notes the position draws, so the chord is played without leaving it. A pentatonic position
 * lacks two notes of its key, so some of its chords have no voicing there.
 */
export function positionTriads(ctx: KeyContext, position: Pick<ScalePosition, "notes">, group: StringGroup, degrees?: number[]): PositionTriad[] {
  const have = new Set(position.notes.map((c) => cellKey(c.string, c.fret)));
  return (degrees ?? [0, 1, 2, 3, 4, 5, 6]).flatMap((d) => {
    const c = ctx.chords[d];
    if (!c || !TRIAD_QUALITIES.some((q) => q.id === c.tri)) return [];
    const quality = c.tri as TriadQuality;
    const root = (ctx.tonic.pc + ctx.steps[d]) % 12;
    const voicings = ([0, 1, 2] as const)
      .flatMap((inv) => triadVoicings(root, quality, inv, group))
      .filter((v) => v.frets.every((f, i) => have.has(cellKey(group.strings[i], f))))
      .sort((a, b) => a.lowestFret - b.lowestFret);
    return [{ degree: d, roman: c.roman, name: c.triadName, quality, voicings }];
  });
}

/** The places (`"string-fret"`, as ScaleNeck's `cellKey`) a voicing's notes sit on. */
export const voicingKeys = (v: TriadVoicing): string[] => v.frets.map((f, i) => cellKey(v.group.strings[i], f));

/** A string set by its guitar numbers ("321": the G, B and high e strings); null when it isn't one. */
export const stringGroupOf = (id: string): StringGroup | null => STRING_GROUPS.find((g) => g.id === id) ?? null;

