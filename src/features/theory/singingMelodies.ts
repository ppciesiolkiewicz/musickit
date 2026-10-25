/**
 * The melody book for the singing page: written-out tunes in 4/4, easiest first, every one ending on a whole-note Do.
 * The order follows the notes and the jumps: Do and Re, then Mi, Fa and Sol by step, skips through Do Mi Sol, then La
 * and Ti, then leaps of a 4th and 5th and finally 6ths and the octave. Rhythm stays plain early and picks up eighths and
 * dotted notes at the end.
 *
 * A tune is written bar by bar ("|"), one token a note: the degree of the scale 1 to 7 (1 = Do), `'` an octave up and
 * `,` an octave down (`1'` the high Do, `5,` the Sol under Do), then the length: none for a quarter, `e` an eighth,
 * `q.` a dotted quarter, `h` a half, `h.` a dotted half, `w` a whole. Pure data and parsing, no React (tested).
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
    title: "Do Re",
    hint: "Two notes a step apart",
    tunes: ["1 2 1 2 | 1w", "1 1 2h | 1w", "2 2 1 2 | 1w", "1 2 2 1 | 2 2 2h | 1 2 1 2 | 1w", "1h 2h | 1 1 2h | 2 1 2 2 | 1w", "1 2 1h | 2 2 1h | 2 1 2h | 1w"],
  },
  {
    id: "mi",
    title: "Do Re Mi",
    hint: "Up a step to Mi",
    tunes: ["1 1 2 3 | 1w", "1 2 3 2 | 1w", "3 2 1 2 | 1w", "1 2 3h | 3 2 1h | 1 2 3 2 | 1w", "1 1 2 2 | 3 3 2h | 1 2 3 2 | 1w", "3 3 2 2 | 1 1 2h | 3 2 3 2 | 1w"],
  },
  {
    id: "fa",
    title: "Up to Fa",
    hint: "Four notes by step",
    tunes: ["3 4 3 2 | 1w", "1 2 3 4 | 3 2 1 2 | 3 4 3 2 | 1w", "1 2 3 4 | 3h 2h | 3 4 3 2 | 1w", "4 3 2 3 | 4h 3h | 2 3 2 2 | 1w", "1 2 3 4 | 4 3 2h | 3 2 1 2 | 1w"],
  },
  {
    id: "sol",
    title: "Up to Sol",
    hint: "Five notes by step",
    tunes: ["5 4 3 2 | 1w", "1 2 3 4 | 5h 4 3 | 4 3 2h | 1w", "1 2 3 4 | 5h 5h | 4 3 2 2 | 1w", "5 4 3 4 | 5h 3h | 4 3 2h | 1w", "5 5 4 4 | 3 3 2h | 3 4 3 2 | 1w"],
  },
  {
    id: "skips",
    title: "Do Mi Sol",
    hint: "Skips through the chord",
    tunes: ["1 3 5 3 | 1w", "5 3 1 2 | 1w", "1 3 5 3 | 1h 5h | 4 3 2h | 1w", "5 3 1 3 | 5 4 3h | 3 5 4 2 | 1w", "1 1 3 3 | 5h 3h | 4 3 2 2 | 1w"],
  },
  {
    id: "la",
    title: "La",
    hint: "One step above Sol",
    tunes: ["6 5 3 2 | 1w", "5 6 4 2 | 1w", "1 3 5 6 | 5h 3h | 4 3 2h | 1w", "5 6 5 4 | 3 4 5h | 6 5 3 2 | 1w", "1 2 3 5 | 6h 5h | 4 3 2 2 | 1w"],
  },
  {
    id: "ti",
    title: "Ti",
    hint: "The note that leads home, under Do and up to the high Do",
    tunes: ["3 2 1 7, | 1w", "5 6 7h | 1'w", "1 3 5 7 | 1'h 7 6 | 5 4 3 2 | 1w", "3 2 1 7, | 1 2 3h | 2 1 7, 7, | 1w", "5 5 6 7 | 1'h 5h | 6 7 6 7 | 1'w"],
  },
  {
    id: "leaps",
    title: "4ths and 5ths",
    hint: "Leaps: Do to Fa, Do to Sol, the Sol under Do",
    tunes: ["1 4 3 2 | 1w", "5, 1 2 7, | 1w", "1 5 3 2 | 1w", "1 5 5 4 | 3h. 1 | 4 2 5, 7, | 1w", "5, 1 2 3 | 4q. 3e 2 5 | 4 3 2 7, | 1w", "1 4 6 4 | 5 1 3h | 2e 3e 4 2 7, | 1w"],
  },
  {
    id: "wide",
    title: "6ths and the octave",
    hint: "The widest leaps, with eighths and dotted notes",
    tunes: ["1 1'h 7 | 1'w", "5, 3 2 7, | 1w", "1 6 5 3 | 1 1' 7 5 | 6 4 2 7, | 1w", "3 1' 7 6 | 5h. 3 | 6q. 5e 4 2 | 1w", "5 3 1 6 | 5h 1'h | 6 5 6 7 | 1'w"],
  },
];

const LENGTHS: Record<string, number> = { "": 1, e: 0.5, "q.": 1.5, h: 2, "h.": 3, w: 4 };

/** One tune's notes, as scale steps from Do (0) and lengths in beats. Throws on a token it can't read. */
export function parseTune(tune: string): MelodyNote[] {
  const notes: MelodyNote[] = [];
  let at = 0;
  for (const tok of tune.split(/\s+/)) {
    if (tok === "|" || tok === "") continue;
    const m = /^([1-7])([',]*)(e|q\.|h\.|h|w)?$/.exec(tok);
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

export interface BookTune {
  /** 1-based place in the whole book */
  n: number;
  stage: Stage;
  notes: MelodyNote[];
  length: MelodyLength;
}

/** Every tune in order, numbered, with its stage and length (2 bars short, more long). */
export const BOOK: BookTune[] = STAGES.flatMap((stage) => stage.tunes.map((t) => ({ stage, notes: parseTune(t) }))).map((t, i) => ({
  ...t,
  n: i + 1,
  length: barsOf(t.notes) <= 2 ? "short" : "long",
}));

export interface PlacedNote extends LadderNote {
  beats: number;
  at: number;
}

/**
 * A tune on a seven-note ladder: on the Do (of the ones it fits around) whose middle lies nearest the middle of the
 * range, so a tune that dips under Do starts from a higher one. A range too small for the tune keeps every note
 * inside it by clamping.
 */
export function placeTune(tune: MelodyNote[], ladder: Ladder, range: Range): PlacedNote[] {
  const top = ladder.notes.length - 1;
  const hi = Math.max(...tune.map((n) => n.step));
  const lo = Math.min(...tune.map((n) => n.step));
  const mid = (range.low + range.high) / 2;
  const at = (i: number) => ladder.notes[Math.max(0, Math.min(top, i))];
  const roots = ladder.notes.flatMap((n, i) => (n.label === "R" ? [i] : []));
  const fit = roots.filter((r) => r + lo >= 0 && r + hi <= top);
  const off = (r: number) => Math.abs((at(r + lo).midi + at(r + hi).midi) / 2 - mid);
  const root = (fit.length ? fit : roots).reduce((b, r) => (off(r) < off(b) ? r : b));
  return tune.map((n) => ({ ...at(root + n.step), beats: n.beats, at: n.at }));
}
