/**
 * Ideas from Joseph Schillinger's System of Musical Composition that are useful for improvising, as pure functions:
 * rhythm from the interference of two periodicities, and the permutation, rotation, retrograde and inversion of a
 * short motive. No audio and no other feature imports here, so it is simple to test.
 */

export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
export const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

export interface Interference {
  /** length of one cycle in the smallest unit */
  length: number;
  /** where each generator attacks, in units from the start of the cycle */
  a: number[];
  b: number[];
  /** the resultant: every place either generator attacks */
  r: number[];
  /** lengths of the notes of the resultant, adding up to `length` */
  durations: number[];
}

/** Rhythm by interference: two pulses, one that repeats `a` times and one `b` times in the same cycle. 3:2 gives 2+1+1+2. */
export function interference(a: number, b: number): Interference {
  const A = Math.max(1, Math.round(a));
  const B = Math.max(1, Math.round(b));
  const length = lcm(A, B);
  const gen = (n: number) => Array.from({ length: n }, (_, i) => (i * length) / n);
  const ga = gen(A);
  const gb = gen(B);
  const r = [...new Set([...ga, ...gb])].sort((x, y) => x - y);
  const durations = r.map((p, i) => (i + 1 < r.length ? r[i + 1] : length) - p);
  return { length, a: ga, b: gb, r, durations };
}

/** Every ordering of the items (n! of them), in a stable order. */
export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  items.forEach((x, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    permutations(rest).forEach((p) => out.push([x, ...p]));
  });
  return out;
}

/** The motive started from each of its notes in turn: 1234, 2341, 3412, 4123. */
export function rotations<T>(items: readonly T[]): T[][] {
  return items.map((_, i) => [...items.slice(i), ...items.slice(0, i)]);
}

export const retrograde = <T,>(items: readonly T[]): T[] => items.slice().reverse();

/** Mirror a motive of scale degrees around its first note: what went up now goes down by the same number of steps. */
export const invert = (degrees: readonly number[]): number[] => degrees.map((d) => 2 * degrees[0] - d);

export interface ScaleDef {
  id: string;
  name: string;
  steps: number[];
}

export const SCALES: ScaleDef[] = [
  { id: "major", name: "Major", steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: "minor", name: "Natural minor", steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: "dorian", name: "Dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: "mixolydian", name: "Mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: "majorPentatonic", name: "Major pentatonic", steps: [0, 2, 4, 7, 9] },
  { id: "minorPentatonic", name: "Minor pentatonic", steps: [0, 3, 5, 7, 10] },
  { id: "blues", name: "Blues", steps: [0, 3, 5, 6, 7, 10] },
];

export const findScale = (id: string) => SCALES.find((s) => s.id === id) ?? SCALES[0];

/** MIDI note of a scale degree (0 is the root, 7 is the root again on a 7-note scale, negatives go below) with the root in octave `octave`. */
export function degreeMidi(root: number, scale: ScaleDef, degree: number, octave = 4): number {
  const n = scale.steps.length;
  const oct = Math.floor(degree / n);
  return 12 * (octave + 1 + oct) + root + scale.steps[degree - oct * n];
}

export const noteName = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];

/* ------------------------------------------------------------------ games */

export type Rng = () => number;

/** A small seedable random generator, so a challenge can be repeated. */
export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

export const RHYTHM_RATIOS: [number, number][] = [[3, 2], [4, 3], [5, 2], [5, 3], [5, 4], [7, 4]];

export const CONSTRAINTS = [
  "Play only on the attacks of the rhythm.",
  "Use only the notes of the motive, in any order.",
  "Play the motive, then its inversion.",
  "Play the motive backwards (retrograde), then forwards.",
  "Rotate the motive: start it from a different note each time.",
  "Leave the first beat of every bar empty.",
  "Only three notes at a time, then a rest.",
  "Answer yourself: play a phrase, then repeat it a step higher in the scale.",
];

export interface Challenge {
  seed: number;
  root: number;
  scale: ScaleDef;
  ratio: [number, number];
  /** scale degrees of the motive */
  motive: number[];
  constraint: string;
  seconds: number;
}

/** A random practice challenge: a key and scale, a rhythm, a short motive and one rule to play by. */
export function makeChallenge(seed: number): Challenge {
  const rng = mulberry32(seed);
  const scale = pick(rng, SCALES);
  const size = rng() < 0.5 ? 3 : 4;
  const pool = Array.from({ length: scale.steps.length }, (_, i) => i);
  const motive: number[] = [];
  while (motive.length < size) {
    const d = pick(rng, pool);
    if (!motive.includes(d)) motive.push(d);
  }
  return { seed, root: Math.floor(rng() * 12), scale, ratio: pick(rng, RHYTHM_RATIOS), motive, constraint: pick(rng, CONSTRAINTS), seconds: pick(rng, [60, 90, 120]) };
}
