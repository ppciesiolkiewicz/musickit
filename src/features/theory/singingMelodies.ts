/**
 * The melody book for the singing page: written-out tunes in 4/4, easiest first, every one ending on a whole-note Do.
 * The order follows the notes and the jumps: Do and Re, then Mi, turns around Fa, Sol stepping down home, skips through
 * Do Mi Sol and climbing 3rds, then La, Ti up to the high Do, the home chord broken up to the high Do and the chords
 * next door (Fa La Do, Sol Ti Re), the notes under Do, then leaps of a 4th, 5th, 6th and the octave. Each stage mixes
 * its moves so no tune just rocks between two notes. Rhythm stays plain early and picks up eighths and dotted notes at
 * the end. Each tune also gets a difficulty from how it moves (effortOf), so one that starts on Do and keeps to the
 * chord can be Easy deep in the book.
 *
 * A tune is written bar by bar ("|"), one token a note: the degree of the scale 1 to 7 (1 = Do), `'` an octave up and
 * `,` an octave down (`1'` the high Do, `5,` the Sol under Do), then the length: none for a quarter, `s` a sixteenth (in runs of four), `e` an eighth,
 * `q.` a dotted quarter, `h` a half, `h.` a dotted half, `w` a whole. Pure data and parsing, no React (tested).
 *
 * The runs book (RUNS) is written the same way: the runs singers warm up and show off with, in eighths and sixteenths,
 * from the five-note scale to the full octave, numbered on after the melodies so a link names one or the other.
 */
import { BEATS_PER_BAR, type MelodyLength, type MelodyNote } from "./singingMelody";
import type { Ladder, LadderNote, Range } from "./singing";

export interface Stage {
  id: string;
  /** "Do Re Mi" */
  title: string;
  /** what this stage adds */
  hint: string;
  tunes: string[];
}

export const STAGES: Stage[] = [
  {
    id: "do-re",
    title: "Do and Re",
    hint: "Two notes a step apart",
    tunes: ["1 2 1 2 | 1w"],
  },
  {
    id: "mi",
    title: "Do Re Mi",
    hint: "Up to Mi and home again, by step and by skip",
    tunes: ["1 2 3 2 | 1w", "3h 2h | 1w", "2 3 1 2 | 1w", "3 3 2 2 | 1w", "3 1 2 3 | 2h 1h | 3 2 1 2 | 1w", "1 2 3h | 3 2 1h | 1 3 2 2 | 1w", "1 2 3 3 | 2 2 1h | 3 3 2 1 | 1w"],
  },
  {
    id: "fa",
    title: "Re Fa, Mi Re Do",
    hint: "Up to Fa, with little turns around it",
    tunes: ["2 4 2 3 | 1w", "3 4 2 3 | 1w", "4 3 2 3 | 1w", "1 2 3 4 | 3h 2h | 2 4 2 3 | 1w", "4h 2h | 3 1 2h | 4 3 2 2 | 1w", "1 3 2 4 | 3h 2h | 4 2 3 2 | 1w", "3 4 3 2 | 1 2 3 4 | 2h 3 2 | 1w"],
  },
  {
    id: "sol",
    title: "Sol Fa Mi Re Do",
    hint: "Five notes, stepping down home from Sol",
    tunes: ["5 4 3 2 | 1w", "4 5 3 2 | 1w", "1 2 3 4 | 5h 4 3 | 2 4 3 2 | 1w", "5 4 5 3 | 4 3 4 2 | 3 2 3 2 | 1w", "3 4 5h | 5 4 3h | 4 3 2h | 1w", "3 4 5 3 | 4 2 3 1 | 2 4 3 2 | 1w"],
  },
  {
    id: "skips",
    title: "Do Mi Sol",
    hint: "Skips through the chord",
    tunes: ["1 3 5 3 | 1w", "5 3 1 3 | 1w", "5 3 1 2 | 1w", "1 3 5h | 3 5 3 1 | 2 3 4 2 | 1w", "5 5 3 3 | 1 3 5h | 4 3 2 2 | 1w", "3 1 3 5 | 4h 2h | 3 2 1 2 | 1w", "1 3 5 5 | 3 1 1h | 5 3 4 2 | 1w"],
  },
  {
    id: "thirds",
    title: "Climbing in 3rds",
    hint: "Up a 3rd, back a step: Do Mi Re Fa Mi Sol",
    tunes: ["1 3 2 2 | 1w", "5 3 4 2 | 1w", "3 5 4 2 | 1w", "1 3 2 4 | 3 5 4 2 | 3 1 2h | 1w", "5 3 4 2 | 3 1 2h | 4 2 3h | 1w", "1h 3h | 2h 4h | 3 5 4 2 | 1w", "2 4 3 5 | 4 2 3 1 | 2 4 3 2 | 1w"],
  },
  {
    id: "la",
    title: "Sol La Sol",
    hint: "Up to La, one step above Sol",
    tunes: ["5 6 5 3 | 1w", "5 6 4 2 | 1w", "6 5e 4e 3 2 | 1w", "1 3 5 6e 5e | 5h 3h | 4 3 2h | 1w", "5 6 5 4 | 3e 4e 3 2 3 | 4h 3 2 | 1w", "6 4 5 3 | 4 2 3h | 5e 6e 5 3 2 | 1w", "6 5 4 3 | 2e 3e 4 3 1 | 5 6 5e 4e 3 | 1w"],
  },
  {
    id: "ti",
    title: "Ti to the high Do",
    hint: "The note that leads home, all the way up the scale",
    tunes: ["5 6 7h | 1'w", "1' 7 6 7 | 1'w", "7 6e 5e 6 7 | 1'w", "1 3 5 7 | 1'h 7 6 | 5e 4e 3e 2e 3 2 | 1w", "5 5 6 7 | 1'h 5h | 6e 7e 6e 5e 6 7 | 1'w", "3 5 7 6 | 1'h 5h | 6e 5e 4e 5e 6 7 | 1'w", "1' 7 6 5 | 6 7 1'h | 5 6e 7e 1' 7 | 1'w"],
  },
  {
    id: "arpeggio",
    title: "Do Mi Sol Do",
    hint: "The home chord broken, up to the high Do and back down",
    tunes: ["1 3 5 1' | 1'w", "1' 5 3 1 | 1w", "1h 5h | 3 5 1'h | 5e 4e 3 5 7 | 1'w", "1 3 5 1' | 5h 3h | 1 3 5 6e 7e | 1'w", "1' 5 3 5 | 1'h 5h | 3e 4e 5 3 2 | 1w", "1 3 5h | 1' 5 3 1 | 3 5 4e 3e 2 | 1w", "5, 1 3 5 | 3 1 5,h | 1 3 2e 1e 7, | 1w"],
  },
  {
    id: "chords",
    title: "Fa La Do, Sol Ti Re",
    hint: "The chords next door, broken the same way",
    tunes: ["4 6 5 3 | 1w", "5 7 2' 7 | 1'w", "2 7, 5, 7, | 1w", "1 3 5 3 | 4 6 1' 6 | 5 7 2' 1'e 7e | 1'w", "5 7 2' 5 | 1'h 5h | 4 6 4e 3e 2 | 1w", "1' 6 4 5e 6e | 5 3 1h | 2 7, 5, 7, | 1w", "3 5 1' 5 | 6 4 1 4 | 5e 4e 3 2 7, | 1w"],
  },
  {
    id: "under",
    title: "Under Do",
    hint: "Down past Do to Ti, La and Sol, and back up",
    tunes: ["1 7, 6, 7, | 1w", "1 7, 1 2 | 1w", "3 2 1 7, | 1w", "1 7, 6, 5, | 6, 7, 1h | 2 1e 7,e 6, 7, | 1w", "5, 6, 7, 1 | 2h 1 7, | 6,e 5,e 6, 7, 2 | 1w", "6, 7, 1 2 | 3h 2 1 | 7, 6,e 7,e 1 2 | 1w", "2 1 7, 6, | 5, 6,e 7,e 1 2 | 3 2 7, 2 | 1w"],
  },
  {
    id: "fourths",
    title: "4ths",
    hint: "Do up to Fa, Re up to Sol, Sol under Do up to Do",
    tunes: ["1 4 3 2 | 1w", "4 1 2 3 | 1w", "5, 1 2 7, | 1w", "1 4 3 4 | 2 5 4e 3e 2 | 5 2 3 7, | 1w", "5 1' 7 6 | 5h 2h | 3 6 5e 4e 3 | 1w", "4h 1h | 5q. 4e 3 6 | 5 2 4 3 | 1w", "1 4 3e 2e 1 | 5 2 3 4 | 2 5 4 2 | 1w"],
  },
  {
    id: "fifths",
    title: "5ths",
    hint: "Do up to Sol, Re up to La, and down again",
    tunes: ["1 5 4s 3s 2s 1s 2 | 1w", "5 1 3 2 | 1w", "5 1 2 7, | 1w", "1 5 6e 5e 4 | 3h. 1 | 4 2 5, 7, | 1w", "2 6 5 4 | 3 7, 1 5 | 4s 3s 2s 1s 2 7, 2 | 1w", "5, 2 1 5 | 3q. 2e 2h | 6 2 5 3 | 1w", "1 5 4 3 | 2 6 5 4e 3e | 3 2 5, 7, | 1w"],
  },
  {
    id: "sixths",
    title: "6ths",
    hint: "Do up to La, Mi up to the high Do",
    tunes: ["1 6 5s 4s 3s 2s 3 | 1w", "1 6 4 2 | 1w", "5, 3 2 7, | 1w", "1 6 5 4 | 3 1' 7 6e 5e | 6 4 2 7, | 1w", "3 1' 7s 6s 5s 4s 3 | 5h. 3 | 6q. 5e 4 2 | 1w", "3h 1'h | 7 5 6 4 | 5e 4e 3 6, 7, | 1w", "5, 3 2 1e 2e | 3 1' 6 5 | 4 2 7, 2 | 1w"],
  },
  {
    id: "octave",
    title: "The octave",
    hint: "Do to the high Do and back: the widest leap, with eighths, dotted notes and sixteenth runs",
    tunes: ["1 1' 2's 1's 7s 6s 7 | 1'w", "1' 1 3 2 | 1w", "1' 1 2 7, | 1w", "5, 5 4 2 | 3 1' 7h | 6 5e 4e 3 2 | 1w", "1 1' 7 6e 7e | 5h 5,h | 6, 7, 2 7, | 1w", "6, 6 5 3 | 4q. 2e 7, 1 | 5 5, 6,s 7,s 1s 2s 2 | 1w", "5, 5 3 1 | 1' 1 2e 3e 2 | 4 2 7, 2 | 1w"],
  },
];

const LENGTHS: Record<string, number> = { "": 1, s: 0.25, e: 0.5, "q.": 1.5, h: 2, "h.": 3, w: 4 };

/** One tune's notes, as scale steps from Do (0) and lengths in beats. Throws on a token it can't read. */
export function parseTune(tune: string): MelodyNote[] {
  const notes: MelodyNote[] = [];
  let at = 0;
  for (const tok of tune.split(/\s+/)) {
    if (tok === "|" || tok === "") continue;
    const m = /^([1-7])([',]*)(s|e|q\.|h\.|h|w)?$/.exec(tok);
    if (!m) throw new Error(`bad note "${tok}" in "${tune}"`);
    const octave = [...m[2]].reduce((o, c) => o + (c === "'" ? 1 : -1), 0);
    const beats = LENGTHS[m[3] ?? ""];
    notes.push({ step: Number(m[1]) - 1 + 7 * octave, beats, at });
    at += beats;
  }
  return notes;
}

/** Bars in a tune (the final Do included). */
export const barsOf = (tune: MelodyNote[]) => Math.round((tune.at(-1)!.at + tune.at(-1)!.beats) / BEATS_PER_BAR);

/** The chords a broken-chord leap can outline, as scale degrees 0 to 6: home (Do Mi Sol) first, then Fa La Do and Sol Ti Re. */
const CHORDS = [[0, 2, 4], [3, 5, 0], [4, 6, 1]];
/** What a leap costs by its size in scale steps (a 3rd is 2), up to the octave; wider costs LEAP_WIDE. */
const LEAP = [0, 0, 0.6, 1, 1.4, 1.8, 2.4, 1.6];
const LEAP_WIDE = 3;
const deg = (step: number) => ((step % 7) + 7) % 7;
/** The chord all these steps belong to (an index into CHORDS), or -1. */
const chordOf = (steps: number[]) => CHORDS.findIndex((c) => steps.every((s) => c.includes(deg(s))));

/**
 * How hard a tune is to sing, a score from 0 up. Steps cost nothing; a leap costs by its size, half that inside the
 * home chord (Do Mi Sol Do is easy to hear) and three quarters inside Fa La Do or Sol Ti Re, and a second leap the same
 * way that doesn't outline a chord costs extra. The hardest leap counts in full and the rest a fifth each; on top
 * come starting off Do (less on Mi or Sol), the span, notes under Do, eighths and dotted notes, and a longer tune.
 */
export function effortOf(tune: MelodyNote[]): number {
  const steps = tune.map((n) => n.step);
  const leaps = steps.slice(1).map((s, i) => {
    const d = Math.abs(s - steps[i]);
    if (d < 2) return 0;
    const base = d > 7 ? LEAP_WIDE : LEAP[d];
    const prevLeap = i > 0 && Math.abs(steps[i] - steps[i - 1]) >= 2;
    const run = prevLeap ? chordOf([steps[i - 1], steps[i], s]) : -1;
    const chord = run >= 0 ? run : chordOf([steps[i], s]);
    const awkward = prevLeap && run < 0 && Math.sign(s - steps[i]) === Math.sign(steps[i] - steps[i - 1]) ? 0.4 : 0;
    return base * (chord === 0 ? 0.5 : chord > 0 ? 0.75 : 1) + awkward;
  });
  const sorted = leaps.sort((a, b) => b - a);
  const start = deg(steps[0]) === 0 ? 0 : [2, 4].includes(deg(steps[0])) ? 0.3 : 0.5;
  const span = Math.max(0, Math.max(...steps) - Math.min(...steps) - 4) * 0.1;
  const under = steps.some((s) => s < 0) ? 0.3 : 0;
  const odd = tune.filter((n) => n.beats % 1 !== 0).length;
  const rhythm = odd ? 0.4 + Math.min(0.6, odd * 0.1) : 0;
  const long = barsOf(tune) > 2 ? 0.3 : 0;
  return (sorted[0] ?? 0) + sorted.slice(1).reduce((a, c) => a + c * 0.2, 0) + start + span + under + rhythm + long;
}

export interface Difficulty {
  title: string;
  hint: string;
  /** the lowest effort that reaches it */
  from: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { title: "Easy", hint: "From Do, by step, plain rhythm", from: 0 },
  { title: "Medium", hint: "Skips through the chord, a start off Do", from: 0.8 },
  { title: "Hard", hint: "Leaps of a 4th and more, notes under Do", from: 1.6 },
  { title: "Expert", hint: "Awkward leaps outside the chord, eighths and dotted notes", from: 2.85 },
];

/** A tune's difficulty, an index into DIFFICULTIES. */
export const difficultyOf = (tune: MelodyNote[]): number => {
  const e = effortOf(tune);
  return DIFFICULTIES.findLastIndex((d) => d.from <= e);
};

export interface BookTune {
  /** 1-based place in the whole book */
  n: number;
  stage: Stage;
  notes: MelodyNote[];
  length: MelodyLength;
  /** index into DIFFICULTIES */
  difficulty: number;
  /** a run: the keys it goes through (placeRun), a semitone up each pass */
  keys?: number;
}

const bookOf = (stages: Stage[], from: number): BookTune[] =>
  stages.flatMap((stage) => stage.tunes.map((t) => ({ stage, notes: parseTune(t) }))).map((t, i) => ({
    ...t,
    n: from + i,
    length: barsOf(t.notes) <= 2 ? "short" : "long",
    difficulty: difficultyOf(t.notes),
  }));

/** Every tune in order, numbered, with its stage, length (2 bars short, more long) and difficulty. */
export const BOOK: BookTune[] = bookOf(STAGES, 1);

export const RUN_STAGES: Stage[] = [
  {
    id: "five",
    title: "Five-note scale",
    hint: "Do up to Sol and back, in eighths, then sixteenths",
    tunes: ["1e 2e 3e 4e 5e 4e 3e 2e | 1w", "1e 2e 3e 4e 5h | 5e 4e 3e 2e 1h | 1e 2e 3e 4e 5e 4e 3e 2e | 1w", "1s 2s 3s 4s 5s 4s 3s 2s 1s 2s 3s 4s 5s 4s 3s 2s | 1w"],
  },
  {
    id: "arpeggio-run",
    title: "Do Mi Sol Do",
    hint: "The home chord, quick, up to the high Do and back",
    tunes: ["1e 3e 5e 1'e 5e 3e 1 | 1w", "1s 3s 5s 3s 1s 3s 5s 3s 1s 3s 5s 1's 5s 3s 2s 7,s | 1w", "5,s 1s 3s 5s 1'h. | 1's 5s 3s 1s 5s 3s 1s 5,s 7, 2 | 1w"],
  },
  {
    id: "turns",
    title: "Turns",
    hint: "Round a note and back to it: the note above, the note, the note below",
    tunes: ["5s 6s 5s 4s 3s 4s 3s 2s 1h | 1w", "1 2s 1s 7,s 1s 3 4s 3s 2s 3s | 5 4s 3s 2s 3s 2h | 1w", "3s 4s 3s 2s 3 5s 6s 5s 4s 5 | 4s 5s 4s 3s 2s 3s 2s 1s 2h | 1w"],
  },
  {
    id: "pentatonic-run",
    title: "Pentatonic runs",
    hint: "Do Re Mi Sol La: the riffs of soul and pop",
    tunes: ["1's 6s 5s 3s 5s 3s 2s 1s 2h | 1w", "3s 5s 6s 1's 6s 5s 3s 2s 3 5s 3s 2s 1s | 2h 3s 2s 1s 6,s 1 | 1w", "5 6s 5s 3s 5s 1's 6s 5s 3s 2s 3s 2s 1s | 6, 1h. | 1w"],
  },
  {
    id: "nine",
    title: "Nine-note scale",
    hint: "Up past the high Do to Re, and down in one breath",
    tunes: ["1e 2e 3e 4e 5e 6e 7e 1'e | 2's 1's 7s 6s 5s 4s 3s 2s 1h | 1w", "1s 2s 3s 4s 5s 6s 7s 1's 2's 1's 7s 6s 5s 4s 3s 2s | 1w"],
  },
  {
    id: "octave-run",
    title: "The octave run",
    hint: "The whole scale in sixteenths, up and down",
    tunes: ["1s 2s 3s 4s 5s 6s 7s 1's 7s 6s 5s 4s 3s 2s 1s 7,s | 1w", "1s 2s 3s 4s 5s 6s 7s 1's 2's 3's 2's 1's 7s 6s 5s 4s | 3s 4s 3s 2s 1s 2s 1s 7,s 1h | 1w"],
  },
];

/** a run goes round this many keys, a semitone up each time, all on its one staff */
export const RUN_KEYS = 5;

/** The runs, numbered on from the last melody. */
export const RUNS: BookTune[] = bookOf(RUN_STAGES, BOOK.length + 1).map((t) => ({ ...t, keys: RUN_KEYS }));

/** A card's length: its bars, or for a run the keys it goes through. */
export const lengthLabel = (t: BookTune) => (t.keys ? `${t.keys} keys` : t.length === "short" ? "2 bars" : "4 bars");

export interface PlacedNote extends LadderNote {
  beats: number;
  at: number;
}

/** How far up the range a tune's middle is aimed: low, in the chest voice, rather than in the middle where it reaches for the top. */
export const CHEST = 0.3;

/**
 * A tune on a seven-note ladder: on the Do (of the ones it fits around) whose middle lies nearest a point low in the
 * range (CHEST), so a tune sits in the chest voice and only a wide one climbs higher. A range too small for the tune
 * keeps every note inside it by clamping.
 */
export function placeTune(tune: MelodyNote[], ladder: Ladder, range: Range): PlacedNote[] {
  const top = ladder.notes.length - 1;
  const hi = Math.max(...tune.map((n) => n.step));
  const lo = Math.min(...tune.map((n) => n.step));
  const mid = range.low + (range.high - range.low) * CHEST;
  const at = (i: number) => ladder.notes[Math.max(0, Math.min(top, i))];
  const roots = ladder.notes.flatMap((n, i) => (n.label === "R" ? [i] : []));
  const fit = roots.filter((r) => r + lo >= 0 && r + hi <= top);
  const off = (r: number) => Math.abs((at(r + lo).midi + at(r + hi).midi) / 2 - mid);
  const root = (fit.length ? fit : roots).reduce((b, r) => (off(r) < off(b) ? r : b));
  return tune.map((n) => ({ ...at(root + n.step), beats: n.beats, at: n.at }));
}

/**
 * A run through `keys` keys, a semitone up each time, as one tune: the first pass placed as placeTune places it, and each
 * key after on the Do a semitone above the last, its notes spelled in that key. `ladderIn` builds the seven-note ladder
 * of a key over a range; the later keys get room above the voice's top, so a run climbing past it isn't clamped.
 */
export function placeRun(tune: MelodyNote[], tonicPc: number, keys: number, ladderIn: (pc: number, range: Range) => Ladder, range: Range): PlacedNote[] {
  const ladder = ladderIn(tonicPc, range);
  const first = placeTune(tune, ladder, range);
  // the Do the first pass sits on
  const root0 = ladder.notes[ladder.notes.findIndex((n) => n.midi === first[0].midi) - tune[0].step].midi;
  const length = tune.at(-1)!.at + tune.at(-1)!.beats;
  const wide = { low: range.low, high: range.high + 2 * keys + 12 };
  return Array.from({ length: keys }, (_, k) => {
    if (k === 0) return first;
    const l = ladderIn((tonicPc + k) % 12, wide);
    const root = l.notes.findIndex((n) => n.label === "R" && n.midi === root0 + k);
    return tune.map((n) => ({ ...l.notes[Math.max(0, Math.min(l.notes.length - 1, root + n.step))], beats: n.beats, at: n.at + k * length }));
  }).flat();
}
