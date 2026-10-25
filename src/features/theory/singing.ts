/**
 * The singing staff: a scale's notes laid out low to high from the root, one slot apart, and where a sung pitch falls among them.
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

export type Voice = "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";

/** A singing range, lowest and highest MIDI note. */
export interface Range {
  low: number;
  high: number;
}

/** Each voice type's comfortable range, two octaves. */
export const VOICES: Record<Voice, Range & { label: string }> = {
  soprano: { low: 60, high: 84, label: "Soprano" },
  mezzo: { low: 57, high: 81, label: "Mezzo" },
  alto: { low: 53, high: 77, label: "Alto" },
  tenor: { low: 48, high: 72, label: "Tenor" },
  baritone: { low: 43, high: 67, label: "Baritone" },
  bass: { low: 40, high: 64, label: "Bass" },
};

/** The notes a ladder can run between, C2 to C7. */
export const RANGE_MIN = 36;
export const RANGE_MAX = 96;

/** The voice type whose range this is exactly, or null for any other. */
export const voiceOf = (r: Range): Voice | null => (Object.keys(VOICES) as Voice[]).find((v) => VOICES[v].low === r.low && VOICES[v].high === r.high) ?? null;

/** A stored voice: its name, or (as the page once kept it) its exact range; anything else is null. */
export function savedVoice(v: unknown): Voice | null {
  if (typeof v === "string") return Object.hasOwn(VOICES, v) ? (v as Voice) : null;
  if (!v || typeof v !== "object") return null;
  const { low, high } = v as Record<string, unknown>;
  return typeof low === "number" && typeof high === "number" ? voiceOf({ low, high }) : null;
}

/**
 * The clef singers read in for a range, by its middle: treble for the higher voices (alto and up), the tenor's treble
 * with an 8 under it for one centred around middle C, bass for baritone and bass.
 */
export function clefFor(r: Range): Clef {
  const mid = (r.low + r.high) / 2;
  return mid >= 63 ? "treble" : mid >= 57 ? "treble8" : "bass";
}

export interface LadderNote {
  midi: number;
  spelled: Spelled;
  /** 0-based degree of the scale (for its colour), the blue ♯4 counts as a 4th */
  degree: number;
  /** "R", "♭3" */
  label: string;
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

/**
 * The notes of the scale in a range, low to high, always starting on the root: the lowest root in the range (the one just
 * under it when none fits), up to the highest scale note in the range, and at least the note after the root.
 * `null` for an unknown scale.
 */
export function buildLadder(slug: string, tonicPc: number, range: Range): Ladder | null {
  const s = tonesOf(slug, tonicPc);
  if (!s) return null;
  let tonic = range.low + ((((tonicPc - range.low) % 12) + 12) % 12);
  if (tonic > range.high) tonic -= 12;
  const notes: LadderNote[] = [];
  for (let o = 0; o <= (RANGE_MAX - RANGE_MIN) / 12; o++)
    for (const t of s.tones) {
      const midi = tonic + 12 * o + t.semis;
      if (midi > range.high && notes.length >= 2) break;
      notes.push({ midi, spelled: spellName(t.name, midi, t.label), degree: t.degree, label: t.label });
    }
  return { notes, signature: scaleSignature(s.ctx).count, pcs: new Set(s.tones.map((t) => (tonicPc + t.semis) % 12)), title: s.title };
}

/** The ladder with the scale's notes under its lowest root added, down to the bottom of the range, so a tune can dip under Do. */
export function withNotesUnder(l: Ladder, range: Range): Ladder {
  const under = l.notes
    .slice(0, l.pcs.size)
    .map((n) => ({ ...n, midi: n.midi - 12, spelled: { ...n.spelled, midi: n.midi - 12, octave: n.spelled.octave - 1 } }))
    .filter((n) => n.midi >= range.low);
  return { ...l, notes: [...under, ...l.notes] };
}

/**
 * A run of the ladder on the beat, one entry per beat: up from the root to the top, `rest` beats of silence (null) to
 * take a breath, then down from the top to the root. With no rest the top is sung once.
 */
export function scaleRun(n: number, rest: number): (number | null)[] {
  const up = Array.from({ length: n }, (_, i) => i);
  const down = up.slice().reverse().slice(rest > 0 ? 0 : 1);
  return [...up, ...Array<null>(Math.max(0, rest)).fill(null), ...down];
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
