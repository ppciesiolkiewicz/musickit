import { REST, numeralOfChord } from "@/features/backing/model";

/**
 * The song chart's pure model: the form laid out bar by bar, and the same bars as the band's numerals. No React, no
 * sound. A bar is written as the plan stores it: one chord ("G"), or two with a space between ("C G"), each half a bar.
 */

/** What a chart may hold (the plan's parser keeps to these). */
export const LIMITS = {
  /** different sections */
  sections: 8,
  /** bars in one section */
  bars: 16,
  /** sections in the form, in playing order */
  form: 24,
  /** bars in the whole form */
  total: 96,
  /** chords in a bar */
  chords: 2,
  /** times through the form */
  repeat: [1, 8],
  /** letters in a section's name */
  name: 24,
} as const;

export interface ChartSection {
  name: string;
  bars: string[];
}

/** The chords of a bar as written ("C G" → ["C", "G"]). */
export const barChords = (bar: string): string[] => bar.trim().split(/\s+/).filter(Boolean);

/** One bar of the laid-out form. */
export interface ChartBar {
  /** its place in the whole form, from 0 */
  index: number;
  /** its place in its section, from 0 */
  inPart: number;
  chords: string[];
}

/** One section as it comes in the form: a section played twice is two parts. */
export interface ChartPart {
  name: string;
  /** the index of its section in `sections` */
  section: number;
  bars: ChartBar[];
}

/**
 * The form in playing order. `form` names the sections in the order they are played (a name stands for the first
 * section so named; a name no section has is passed over); absent or empty: the sections as written, once each.
 */
export function layChart(sections: readonly ChartSection[], form?: readonly string[]): { parts: ChartPart[]; bars: number } {
  const named = (form ?? []).map((n) => sections.findIndex((s) => s.name === n)).filter((i) => i >= 0);
  const order = named.length ? named : sections.map((_, i) => i);
  let index = 0;
  const parts = order.map((section) => ({
    name: sections[section].name,
    section,
    bars: sections[section].bars.map((bar, inPart) => ({ index: index++, inPart, chords: barChords(bar) })),
  }));
  return { parts, bars: index };
}

/**
 * A chord as the band's numeral in `tonic`, or null when the band has no voicing for it. A chord over another bass note
 * ("G/B") is voiced as the chord itself, and a major 7th in brackets ("Am(maj7)") is read without them.
 */
export function chordNumeral(chord: string, tonic: string): string | null {
  const plain = chord.replace(/\/[A-Ga-g][#b♯♭]?\s*$/, "");
  const open = plain.replace(/\((maj7|Maj7|M7)\)/, "Maj7");
  for (const c of [chord, plain, open]) {
    const n = numeralOfChord(c, tonic);
    if (n) return n;
  }
  return null;
}

/** Where one of the band's chords sits on the chart: the bar, and which of the bar's chords. */
export interface ChartSlot {
  bar: number;
  chord: number;
}

/**
 * The laid-out form as the band's numerals in `tonic` ("G", "Bb"), one entry per chord: a bar of one chord is one bar
 * long, a bar of two is two halves (`chordNumeral`). A chord the band has no voicing for becomes a rest of the same length, so every bar
 * after it stays on its bar line, and is named in `unplayed` (each such chord once, in order of first showing).
 * `slots[i]` says where the band's `i`th chord sits on the chart.
 */
export function chartNumerals(parts: readonly ChartPart[], tonic: string): { numerals: string[]; slots: ChartSlot[]; unplayed: string[] } {
  const numerals: string[] = [];
  const slots: ChartSlot[] = [];
  const unplayed: string[] = [];
  for (const part of parts)
    for (const bar of part.bars)
      bar.chords.forEach((chord, i) => {
        const numeral = chordNumeral(chord, tonic);
        if (!numeral && !unplayed.includes(chord)) unplayed.push(chord);
        numerals.push(`${numeral ?? REST}${bar.chords.length > 1 ? `:${1 / bar.chords.length}` : ""}`);
        slots.push({ bar: bar.index, chord: i });
      });
  return { numerals, slots, unplayed };
}

/** Every different chord of the form, in order of first showing. */
export const chartChords = (parts: readonly ChartPart[]): string[] => [...new Set(parts.flatMap((p) => p.bars.flatMap((b) => b.chords)))];

/** The seven open chords of the path's open-chords track ("all seven open chords"). */
export const OPEN_CHORDS = ["Em", "Am", "E", "A", "D", "G", "C"];

/**
 * The step a chart stands for on the path's ladder (`ladders.ts`), or null:
 * "by-ear" when the chord names start hidden (the student works the chords out by ear, then shows them);
 * "four-chords" for a song to play with open chords: two different sections or more in the form, one chord in every
 * bar, four different chords at most, each one of the seven open chords.
 */
export function chartStep(sections: readonly ChartSection[], form: readonly string[] | undefined, hide: boolean): "by-ear" | "four-chords" | null {
  if (hide) return "by-ear";
  const { parts } = layChart(sections, form);
  const chords = chartChords(parts);
  const song = new Set(parts.map((p) => p.section)).size >= 2 && parts.every((p) => p.bars.every((b) => b.chords.length === 1));
  return song && chords.length <= 4 && chords.every((c) => OPEN_CHORDS.includes(c)) ? "four-chords" : null;
}
