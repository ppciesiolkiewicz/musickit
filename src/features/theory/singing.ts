/**
 * The singing staff: a scale's notes laid out low to high, one slot apart, and where a sung pitch falls among them.
 * The dot's height and its place along the staff are both read off the two scale notes the pitch sits between, so a
 * pitch exactly on a scale note lands on its notehead and one halfway to the next lands halfway on both axes.
 * Pure maths, no React (tested).
 */
import { makeKeyContext, modeAlias, type KeyContext } from "./theory";
import { MODE_PAGES, degreeLabels } from "./scales";
import { findPentatonic, pentatonicContext } from "./pentatonics";
import { scaleSignature } from "./signature";
import type { Spelled } from "./piano/key";
import type { Clef } from "./piano/staff";

export type Voice = "high" | "low";

/** Where each voice's tonic sits (the tonic's MIDI note is base + key) and the clef it is written in. */
export const VOICES: Record<Voice, { base: number; clef: Clef; label: string }> = {
  high: { base: 60, clef: "treble", label: "High (treble)" },
  low: { base: 48, clef: "bass", label: "Low (bass)" },
};

export interface LadderNote {
  midi: number;
  spelled: Spelled;
  /** 0-based degree of the scale (for its colour), the blue ♯4 counts as a 4th */
  degree: number;
  /** "R", "♭3" */
  label: string;
  /** in the octave from the tonic up to the next tonic (the one to sing); the rest is dimmed */
  home: boolean;
}

export interface Ladder {
  notes: LadderNote[];
  /** sharps (+) or flats (-) of the key signature */
  signature: number;
  /** pitch classes of the scale */
  pcs: Set<number>;
  /** "E Dorian", "A minor pentatonic" */
  title: string;
}

const LETTER_PC: Record<Spelled["letter"], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ALTER: Record<string, number> = { "♯": 1, "♭": -1, "𝄪": 2, "𝄫": -2 };

/** A note name from the theory spelling ("F♯", "B♭♭") at a given pitch, in the piano's `Spelled` shape for the staff. */
export function spellName(name: string, midi: number, label = ""): Spelled {
  const letter = name[0] as Spelled["letter"];
  const alter = [...name.slice(1)].reduce<number>((a, c) => a + (ALTER[c] ?? 0), 0) as Spelled["alter"];
  return { midi, letter, alter, octave: (midi - alter - LETTER_PC[letter]) / 12 - 1, name, degree: label };
}

/** The scale's tones in one octave: semitones above the tonic, spelled name, degree and label. */
function tonesOf(slug: string, tonicPc: number): { tones: { semis: number; name: string; degree: number; label: string }[]; ctx: KeyContext; title: string } | null {
  const mode = MODE_PAGES.find((m) => m.slug === slug);
  if (mode) {
    const ctx = makeKeyContext(tonicPc, mode.familyIndex, mode.modeIndex);
    const labels = degreeLabels(ctx.steps);
    const alias = modeAlias(mode.familyIndex, mode.modeIndex);
    return { ctx, title: `${ctx.names[0]} ${alias ? alias.toLowerCase() : ctx.modeName}`, tones: ctx.steps.map((semis, d) => ({ semis, name: ctx.names[d], degree: d, label: labels[d] })) };
  }
  const pent = findPentatonic(slug);
  if (!pent) return null;
  const p = pentatonicContext(tonicPc, pent);
  return { ctx: p.host, title: p.title, tones: p.tones.map((t) => ({ semis: t.semis, name: t.name, degree: t.degree, label: t.label })) };
}

/** Every note of the scale from an octave under the tonic to an octave over it, low to high. `null` for an unknown scale. */
export function buildLadder(slug: string, tonicPc: number, voice: Voice): Ladder | null {
  const s = tonesOf(slug, tonicPc);
  if (!s) return null;
  const tonic = VOICES[voice].base + tonicPc;
  const notes: LadderNote[] = [];
  for (let o = -1; o <= 1; o++)
    for (const t of s.tones) {
      const midi = tonic + 12 * o + t.semis;
      if (midi > tonic + 12) continue;
      notes.push({ midi, spelled: spellName(t.name, midi, t.label), degree: t.degree, label: t.label, home: midi >= tonic && midi <= tonic + 12 });
    }
  return { notes, signature: scaleSignature(s.ctx).count, pcs: new Set(s.tones.map((t) => (tonicPc + t.semis) % 12)), title: s.title };
}

export interface Located {
  /** fractional index into the ladder: 2 = on the third note, 2.5 = halfway to the fourth */
  x: number;
  /** fractional staff step (as `place` counts them), between the two neighbours' steps */
  step: number;
  /** the ladder note nearest in pitch */
  nearest: number;
  /** cents from that note, + sharp */
  cents: number;
}

/**
 * Where a pitch (fractional MIDI) falls on the ladder, given each note's staff step. Between two notes it is
 * interpolated by pitch on both axes; past either end it carries on at the last gap's spacing, up to one slot out.
 */
export function locate(midis: number[], steps: number[], m: number): Located {
  const n = midis.length;
  let i = 0;
  while (i < n - 2 && m >= midis[i + 1]) i++;
  const t = Math.max(-1, Math.min(2, (m - midis[i]) / (midis[i + 1] - midis[i])));
  const nearest = m - midis[i] <= midis[i + 1] - m ? i : i + 1;
  const reach = Math.max(-1, Math.min(n, i + t));
  // past an end the step keeps the last gap's slope, so the dot keeps climbing (or falling) with the pitch
  const step = steps[i] + (steps[i + 1] - steps[i]) * (reach - i);
  return { x: reach, step, nearest: Math.max(0, Math.min(n - 1, nearest)), cents: (m - midis[Math.max(0, Math.min(n - 1, nearest))]) * 100 };
}

/** Fractional MIDI note of a frequency. */
export const hzToMidi = (hz: number, a4 = 440): number => 69 + 12 * Math.log2(hz / a4);

/** How the sung pitch reads against the scale: on a scale note, on a note outside it, or between notes. */
export type Fit = "in" | "out" | "between";

/** Within this many cents of a note counts as singing it. */
export const IN_TUNE_CENTS = 25;

export function fitOf(m: number, pcs: Set<number>): Fit {
  const r = Math.round(m);
  if (Math.abs(m - r) * 100 > IN_TUNE_CENTS) return "between";
  return pcs.has(((r % 12) + 12) % 12) ? "in" : "out";
}
