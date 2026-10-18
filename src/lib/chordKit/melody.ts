/**
 * Sample melodies for a scale: a short tune made only of its notes, different on every call.
 *
 * Two four-bar-ish phrases in 4/4, counted in eighth notes:
 *   - the rhythm of each bar comes from a list of common figures, and the second phrase repeats the first one's opening bar,
 *     so the tune has a motif you can hear coming back;
 *   - pitches walk mostly by step, leap now and then and step back the other way after a leap (gap fill), stay in range,
 *     and never sit on one note for more than two in a row;
 *   - strong beats lean on the tonic chord (1, 3, 5), and the notes that set the mode apart from plain major or minor
 *     (Dorian's 6, Lydian's ♯4) are favoured, so the melody shows what the scale sounds like;
 *   - the first phrase ends on a held 2nd or 5th (a question), the second steps into a long root (the answer).
 */

export interface MelodyNote<T> {
  note: T;
  /** length in eighth notes */
  eighths: number;
}

export interface PoolNote {
  midi: number;
  /** 0-based scale degree */
  degree: number;
}

type Rng = () => number;

/** Bars of four beats, in eighths. The last two are for phrase endings: they finish on a long note. */
const FIGURES = [
  [2, 2, 2, 2],
  [3, 1, 2, 2],
  [2, 1, 1, 2, 2],
  [1, 1, 2, 2, 2],
  [2, 2, 1, 1, 2],
  [4, 2, 2],
  [2, 2, 4],
  [3, 1, 4],
  [1, 1, 1, 1, 2, 2],
];
const ENDINGS = [
  [2, 2, 4],
  [4, 4],
  [3, 1, 4],
  [2, 6],
];

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

/** Degrees where the mode differs from major (if its 3rd is major) or natural minor: its colour notes. */
export function colourDegrees(steps: number[]): number[] {
  const ref = steps[2] === 4 ? MAJOR_STEPS : MINOR_STEPS;
  return steps.flatMap((s, d) => (s !== ref[d] ? [d] : []));
}

const pick = <T,>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length) % xs.length];

function weighted<T>(items: { item: T; w: number }[], rng: Rng): T {
  const total = items.reduce((t, x) => t + x.w, 0);
  let r = rng() * total;
  for (const x of items) {
    r -= x.w;
    if (r <= 0) return x.item;
  }
  return items[items.length - 1].item;
}

/**
 * A melody from `pool` (the playable notes, any order, one per pitch). `steps` are the scale's semitones above its root, used to
 * find the colour notes. Notes are drawn from the pool, so a pool limited to one guitar position keeps the tune in that position.
 */
export function generateMelody<T extends PoolNote>(pool: T[], steps: number[], rng: Rng = Math.random): MelodyNote<T>[] {
  const notes = [...pool].sort((a, b) => a.midi - b.midi);
  if (notes.length === 0) return [];
  if (notes.length === 1) return [{ note: notes[0], eighths: 8 }];

  const colour = new Set(colourDegrees(steps));
  const roots = notes.flatMap((n, i) => (n.degree === 0 ? [i] : []));
  const centre = (notes.length - 1) / 2;
  const nearestRoot = (from: number) => (roots.length ? roots.reduce((a, b) => (Math.abs(b - from) < Math.abs(a - from) ? b : a)) : Math.round(centre));
  // the root the tune comes home to: chosen in the last bar, as the one nearest where the tune has got to
  let home = nearestRoot(centre);

  // rhythm: phrase A = two bars + an ending bar, phrase B = A's first bar again, a fresh bar, an ending bar
  const motif = pick(FIGURES, rng);
  const bars = [motif, pick(FIGURES, rng), pick(ENDINGS, rng), motif, pick(FIGURES, rng), pick(ENDINGS, rng)];
  const slots: { strong: boolean; eighths: number; end: "half" | "full" | null }[] = [];
  bars.forEach((bar, b) => {
    let at = 0;
    bar.forEach((len, i) => {
      const last = i === bar.length - 1;
      slots.push({ strong: at % 4 === 0, eighths: len, end: last && b === 2 ? "half" : last && b === 5 ? "full" : null });
      at += len;
    });
  });

  // start on 1, 3 or 5 near the middle
  const startOptions = notes.flatMap((n, i) => ([0, 2, 4].includes(n.degree) && Math.abs(i - centre) <= notes.length / 3 ? [i] : []));
  let idx = startOptions.length ? pick(startOptions, rng) : home;
  let lastMove = 0;
  let repeats = 0;
  const out: MelodyNote<T>[] = [{ note: notes[idx], eighths: slots[0].eighths }];

  const lastBar = slots.length - bars[5].length;
  for (let s = 1; s < slots.length; s++) {
    const slot = slots[s];
    if (s === lastBar) home = nearestRoot(idx);
    let next: number;
    if (slot.end === "full") {
      next = home;
    } else if (s === slots.length - 2) {
      // lead into the final root by step, from above or below
      let near = [home - 1, home + 1].filter((i) => i >= 0 && i < notes.length);
      if (repeats >= 1 && near.some((i) => i !== idx)) near = near.filter((i) => i !== idx);
      next = near.length ? near.reduce((a, b) => (Math.abs(b - idx) < Math.abs(a - idx) ? b : a)) : home;
    } else {
      const candidates: { item: number; w: number }[] = [];
      for (let i = Math.max(0, idx - 4); i <= Math.min(notes.length - 1, idx + 4); i++) {
        const move = i - idx;
        const dist = Math.abs(move);
        let w = [2, 10, 5, 2.2, 0.8][dist];
        // in the last bar, head for the root
        if (s >= lastBar) w *= Math.abs(i - home) < Math.abs(idx - home) ? 3 : Math.abs(i - home) > Math.abs(idx - home) ? 0.3 : 1;
        if (dist === 0 && repeats >= 1) w = 0;
        // after a leap, step back the other way
        if (Math.abs(lastMove) >= 3) w *= Math.sign(move) === -Math.sign(lastMove) && dist <= 2 ? 3 : 0.2;
        const d = notes[i].degree;
        if (slot.strong && [0, 2, 4].includes(d)) w *= 2.2;
        if (colour.has(d)) w *= 1.8;
        if (slot.end === "half") w *= d === 1 || d === 4 ? 6 : d === 0 ? 0.1 : 0.6;
        // drift back toward the middle of the range
        w *= Math.max(0.15, 1 - Math.max(0, Math.abs(i - centre) - notes.length / 4) / notes.length);
        if (w > 0) candidates.push({ item: i, w });
      }
      next = candidates.length ? weighted(candidates, rng) : home;
    }
    repeats = next === idx ? repeats + 1 : 0;
    lastMove = next - idx;
    idx = next;
    out.push({ note: notes[idx], eighths: slot.eighths });
  }
  return out;
}

/** Scale notes around a root, as a pool for `generateMelody`: from the 5th below the root to the 5th above its octave. */
export function scalePool(rootMidi: number, steps: number[]): PoolNote[] {
  const out: PoolNote[] = [];
  for (let oct = -1; oct <= 1; oct++) {
    steps.forEach((s, degree) => {
      const midi = rootMidi + oct * 12 + s;
      if (midi >= rootMidi - 5 && midi <= rootMidi + 19) out.push({ midi, degree });
    });
  }
  return out;
}

/** A melody as timed notes for the note player: eighths become ms, and notes on the beat sound a little louder than those off it. */
export function melodyTiming<T extends PoolNote>(tune: MelodyNote<T>[], eighthMs = 270): { note: T; ms: number; velocity: number }[] {
  let at = 0;
  return tune.map((n) => {
    const onBeat = at % 2 === 0;
    const downbeat = at % 8 === 0;
    at += n.eighths;
    return { note: n.note, ms: n.eighths * eighthMs, velocity: downbeat ? 0.88 : onBeat ? 0.78 : 0.64 };
  });
}
