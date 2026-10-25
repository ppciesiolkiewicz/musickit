/**
 * Short random melodies to sing, in 4/4: one or three bars of quarters, halves and (harder) eighths and dotted notes
 * over the scale, then a whole-note Do to land on. A melody is a list of scale steps from the root (0 = Do, one per
 * note of the scale, so 7 is the Do an octave up in a seven-note scale and 5 in a pentatonic), each with its length in
 * beats. A seed makes the same melody again, so the page can step back through the ones it has made.
 * Pure maths, no React (tested).
 */

export type MelodyLength = "short" | "long";
export type Complexity = "easy" | "medium" | "hard";

/** Bars in a melody, the whole-note Do included. */
export const BARS: Record<MelodyLength, number> = { short: 2, long: 4 };
export const BEATS_PER_BAR = 4;

export interface MelodyNote {
  /** scale steps above the root: 0 = Do */
  step: number;
  /** length in beats: 0.5 an eighth, 1 a quarter, 1.5 a dotted quarter, 2 a half, 3 a dotted half, 4 a whole */
  beats: number;
  /** beat it starts on, from 0 */
  at: number;
}

/** The rhythms a bar can take, each four beats. A harder melody draws from its own and every easier list. */
const RHYTHMS: Record<Complexity, number[][]> = {
  easy: [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [2, 2], [1, 1, 1, 1]],
  medium: [[1, 2, 1], [3, 1], [1.5, 0.5, 1, 1], [1, 1, 1.5, 0.5], [0.5, 0.5, 1, 1, 1], [1, 1, 0.5, 0.5, 1]],
  hard: [[0.5, 0.5, 0.5, 0.5, 1, 1], [1, 0.5, 0.5, 2], [1.5, 0.5, 2], [0.5, 0.5, 1, 0.5, 0.5, 1], [1, 1.5, 0.5, 1], [0.5, 1, 0.5, 2]],
};
const LEVELS: Complexity[] = ["easy", "medium", "hard"];

/** Moves from one note to the next in scale steps, and how often each comes up. */
const MOVES: Record<Complexity, [number, number][]> = {
  easy: [[0, 2], [1, 4], [-1, 4]],
  medium: [[0, 1], [1, 5], [-1, 5], [2, 3], [-2, 3], [3, 1], [-3, 1]],
  hard: [[0, 1], [1, 4], [-1, 4], [2, 3], [-2, 3], [3, 2], [-3, 2], [4, 1], [-4, 1], [5, 0.5], [-5, 0.5]],
};

/** How high above the root a melody may go: up to the 5th, the octave, or the 10th (in a seven-note scale). */
export function spanOf(complexity: Complexity, perOctave: number): number {
  if (complexity === "easy") return Math.round((perOctave * 4) / 7);
  if (complexity === "medium") return perOctave;
  return perOctave + Math.round((perOctave * 2) / 7);
}

/** A small seeded generator (mulberry32): the same seed gives the same numbers. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) if ((r -= w) < 0) return v;
  return items[items.length - 1][0];
}

/**
 * A melody from a seed. `perOctave` is the number of notes in the scale (7, or 5 for a pentatonic), `top` the highest
 * step the singer's range holds above the root. It starts on Do (or, harder, the 5th or the high Do), moves by the
 * level's steps and leaps without leaving 0..top, comes to rest by step on the note next to the Do it ends on (Re, or
 * Ti under the high Do), and ends with a whole-note Do.
 */
export function makeMelody(seed: number, length: MelodyLength, complexity: Complexity, perOctave: number, top: number): MelodyNote[] {
  const rand = rng(seed);
  const span = Math.max(1, Math.min(top, spanOf(complexity, perOctave)));
  const pool = LEVELS.slice(0, LEVELS.indexOf(complexity) + 1).flatMap((l) => RHYTHMS[l]);
  const beats = Array.from({ length: BARS[length] - 1 }, () => pool[Math.floor(rand() * pool.length)]).flat();
  const moves = MOVES[complexity];
  const reach = Math.max(...moves.map(([m]) => m));

  const highEnd = span >= perOctave && complexity !== "easy" && rand() < (complexity === "hard" ? 0.5 : 0.3);
  const end = highEnd ? perOctave : 0;
  const before = highEnd ? perOctave - 1 : 1;
  const last = beats.length - 1;
  // every note must still be able to reach the one before the end in the moves left
  const reachable = (step: number, i: number) => Math.abs(step - before) <= (last - i) * reach;

  const fifth = Math.round((perOctave * 4) / 7);
  const starts: [number, number][] = complexity === "easy" ? [[0, 1]] : complexity === "medium" ? [[0, 3], [fifth, 1]] : [[0, 2], [fifth, 1], [perOctave, 1]];
  const startOk = starts.filter(([s]) => s <= span && reachable(s, 0));
  const steps = [last === 0 ? before : pick(rand, startOk.length ? startOk : [[0, 1]])];
  for (let i = 1; i <= last; i++) {
    if (i === last) {
      steps.push(before);
      break;
    }
    const prev = steps[i - 1];
    const thrice = i >= 2 && steps[i - 2] === prev;
    const ok = moves.filter(([m]) => {
      const s = prev + m;
      return s >= 0 && s <= span && reachable(s, i) && !(m === 0 && thrice);
    });
    steps.push(prev + pick(rand, ok.length ? ok : [[Math.sign(before - prev), 1]]));
  }

  const notes: MelodyNote[] = [];
  let at = 0;
  beats.forEach((b, i) => {
    notes.push({ step: steps[i], beats: b, at });
    at += b;
  });
  notes.push({ step: end, beats: BEATS_PER_BAR, at });
  return notes;
}
