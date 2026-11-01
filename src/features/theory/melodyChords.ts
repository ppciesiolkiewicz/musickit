/**
 * Chords under a sung tune, worked out from its notes: one a bar, the scale's own triad on degree 1, 4 or 5, whichever
 * covers the bar best, its strong beats most. Realised on the ladder the tune is placed on (so its name is spelled the
 * way the notes are) and voiced as a close triad in the middle of the keyboard, under the tune where there is room.
 * Pure data, no React, no sound (tested).
 */
import { BEATS_PER_BAR, type MelodyNote } from "./singingMelody";
import { RANGE_MIN, type Ladder, type Range } from "./singing";
import { placeTune, type PlacedNote } from "./singingMelodies";

export interface MelodyChord {
  /** beat it starts on, from the tune's beat 0 */
  at: number;
  beats: number;
  /** "C", "Dm", "D♭" */
  name: string;
  /** a close triad, low to high */
  midis: number[];
}

/** how hard a chord is struck: well under the melody's 0.8, so the tune stays on top */
export const CHORD_VELOCITY = 0.45;

/** the degrees a bar may take, in the order a tie goes */
const DEGREES = [0, 4, 3] as const;
/** the lowest a chord's root goes while it can still sit under the tune; under that it moves up into the middle */
const ROOT_FLOOR = 43;
const MIDDLE_ROOT = 48;

const deg = (step: number) => ((step % 7) + 7) % 7;

/** The degree (0 home, 3 the 4 chord, 4 the 5 chord) whose triad best covers a bar's notes: beat 1 counts double, beat 3 half again. */
export function barChordDegree(bar: MelodyNote[], barStart: number): 0 | 3 | 4 {
  const score = (d: number) => {
    const triad = [d, d + 2, d + 4].map(deg);
    return bar.reduce((s, n) => {
      if (!triad.includes(deg(n.step))) return s;
      const weight = n.at === barStart ? 2 : n.at === barStart + 2 ? 1.5 : 1;
      return s + n.beats * weight;
    }, 0);
  };
  return DEGREES.reduce((best, d) => (score(d) > score(best) ? d : best));
}

/** The ladder's note `i` rungs up, past either end by octaves. */
function rung(ladder: Ladder, i: number): { midi: number; name: string } {
  const per = ladder.pcs.size;
  const top = ladder.notes.length - 1;
  const shift = i < 0 ? Math.ceil(-i / per) : i > top ? -Math.ceil((i - top) / per) : 0;
  const n = ladder.notes[i + shift * per];
  return { midi: n.midi - 12 * shift, name: n.spelled.name };
}

/** The ladder index of the Do a placed tune sits on. */
export function doIndex(ladder: Ladder, tune: MelodyNote[], notes: PlacedNote[]): number {
  return ladder.notes.findIndex((n) => n.midi === notes[0].midi) - tune[0].step;
}

/** The triad on `degree` above the Do at `root`, named, voiced under `below` where it fits. */
export function triadOn(ladder: Ladder, root: number, degree: number, below: number): { name: string; midis: number[] } {
  const [r, t, f] = [0, 2, 4].map((k) => rung(ladder, root + degree + k));
  const third = t.midi - r.midi;
  const fifth = f.midi - r.midi;
  const name = r.name + (fifth === 6 ? "°" : third === 3 ? "m" : "");
  const pc = ((r.midi % 12) + 12) % 12;
  // the highest root (C3 and down) whose top stays under the tune, else one in the middle (C3 to B3)
  const middle = MIDDLE_ROOT + (((pc - MIDDLE_ROOT) % 12) + 12) % 12;
  let lo = middle;
  while (lo + fifth >= below && lo - 12 >= ROOT_FLOOR) lo -= 12;
  if (lo + fifth >= below) lo = middle;
  return { name, midis: [lo, lo + third, lo + fifth].map((m) => Math.max(RANGE_MIN, m)) };
}

/** One chord a bar for a tune placed on `ladder` (`notes` is `tune` as placed). */
export function tuneChords(tune: MelodyNote[], ladder: Ladder, notes: PlacedNote[]): MelodyChord[] {
  const root = doIndex(ladder, tune, notes);
  const end = tune.at(-1)!.at + tune.at(-1)!.beats;
  const chords: MelodyChord[] = [];
  for (let at = 0; at < end; at += BEATS_PER_BAR) {
    const inBar = (n: { at: number }) => n.at >= at && n.at < at + BEATS_PER_BAR;
    const degree = barChordDegree(tune.filter(inBar), at);
    const sounding = notes.filter((n) => n.at < at + BEATS_PER_BAR && n.at + n.beats > at);
    const below = Math.min(...sounding.map((n) => n.midi));
    chords.push({ at, beats: Math.min(BEATS_PER_BAR, end - at), ...triadOn(ladder, root, degree, below) });
  }
  return chords;
}

/** A tune placed in a voice (as placeTune places it) with its chords. */
export function harmoniseTune(tune: MelodyNote[], ladder: Ladder, range: Range): { notes: PlacedNote[]; chords: MelodyChord[] } {
  const notes = placeTune(tune, ladder, range);
  return { notes, chords: tuneChords(tune, ladder, notes) };
}

/**
 * The chords as piano notes, `at` in ms from beat `from`: each struck on its beat and held most of its length, the one
 * already sounding at `from` struck at once for what is left of it. Shaped like the sound feature's `Step`.
 */
export function chordSteps(chords: MelodyChord[], beatMs: number, from = 0): { note: number; at: number; hold: number; velocity: number }[] {
  return chords.flatMap((c) => {
    const end = c.at + c.beats;
    if (end <= from) return [];
    const start = Math.max(c.at, from);
    return c.midis.map((note) => ({ note, at: (start - from) * beatMs, hold: (end - start) * beatMs * 0.9, velocity: CHORD_VELOCITY }));
  });
}
