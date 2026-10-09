import { OPEN_NOTE, OPEN_PITCH, RICH_SHAPES, ROOT_INDEX, STRING_ORDER, type RichShape } from "./shapeTools";
import type { RootString } from "./shapes";
import type { ProgChord } from "@/features/theory/progressions";

// The written progressions and their resolving live in the shared theory feature; guitar code keeps one import path.
export * from "@/features/theory/progressions";

/* ---------------------------------------------------------------- finding shapes and neck positions */

export const NECK_FRETS = 17;
export const NECK_HUES = ["blue", "amber", "coral", "purple"] as const;
export type Hue = (typeof NECK_HUES)[number];

/** Pick the shape that best plays a progression chord on a given root string. */
export function pickShape(rs: RootString, suf: string, tri?: boolean, v?: string): RichShape | null {
  const c = RICH_SHAPES.filter((x) => x.rs === rs && x.suf === suf);
  if (!c.length) return null;
  if (v) return c.find((x) => x.v === v) ?? null;
  if (tri) return c.find((x) => x.ext === "triad") ?? null;
  return c.find((x) => x.ext !== "triad" && !x.v) ?? c.find((x) => x.v === "drop 3") ?? c.find((x) => x.v === "top 4") ?? c.find((x) => x.ext !== "triad") ?? null;
}

/** The first root string that has a shape for this chord (for the form diagrams). */
export function firstShapeFor(c: Pick<ProgChord, "suf" | "tri" | "v">): RichShape | null {
  for (const rs of STRING_ORDER) {
    const sh = pickShape(rs, c.suf, c.tri, c.v);
    if (sh) return sh;
  }
  for (const rs of STRING_ORDER) {
    const sh = pickShape(rs, c.suf, c.tri);
    if (sh) return sh;
  }
  return null;
}

export interface NeckPoint {
  /** string index, 0 = low E */
  i: number;
  /** absolute fret */
  a: number;
  /** semitones above the chord root */
  semi: number;
}

export interface Instance {
  chord: ProgChord;
  ci: number;
  shape: RichShape;
  rs: RootString;
  pts: NeckPoint[];
  rootPitch: number;
  /** distinct pitch classes (E = 0) */
  pcs: number[];
  hue: Hue;
  rootFret: number;
}

/** Every place a chord's shape fits on frets 0..NECK_FRETS (usually two: low and an octave up). */
export function chordInstances(chord: ProgChord, ci: number, rs: RootString): Instance[] | null {
  const shape = pickShape(rs, chord.suf, chord.tri, chord.v);
  if (!shape) return null;
  const ri = ROOT_INDEX[rs];
  const offs = shape.f.filter((v): v is number => v !== null);
  const mn = Math.min(...offs);
  const mx = Math.max(...offs);
  const r0 = (chord.rootPc - OPEN_NOTE[ri] + 12) % 12;
  const out: Instance[] = [];
  [r0, r0 + 12].forEach((r) => {
    if (r + mn < 0 || r + mx > NECK_FRETS) return;
    const abs = shape.f.map((v) => (v === null ? null : r + v));
    const rootPitch = OPEN_PITCH[ri] + (abs[ri] as number);
    const pts: NeckPoint[] = [];
    abs.forEach((a, i) => {
      if (a !== null) pts.push({ i, a, semi: (((OPEN_PITCH[i] + a - rootPitch) % 12) + 12) % 12 });
    });
    const pcs = [...new Set(pts.map((p) => (OPEN_PITCH[p.i] + p.a) % 12))];
    out.push({ chord, ci, shape, rs, pts, rootPitch, pcs, hue: NECK_HUES[ci % 4], rootFret: abs[ri] as number });
  });
  return out.length ? out : null;
}

export interface Move {
  from: Instance;
  to: Instance;
  /** semitones the root travels (signed) */
  rootDiff: number;
  frets: number;
  shared: number[];
}

/** For each step choose the pair of positions closest on the neck. */
export function nearestMoves(steps: [number, number][], inst: Instance[][], posOf: (uniqIndex: number) => number): Move[] {
  const moves: Move[] = [];
  steps.forEach(([a, b]) => {
    let best: { A: Instance; B: Instance; d: number } | null = null;
    inst[posOf(a)].forEach((A) =>
      inst[posOf(b)].forEach((B) => {
        const d = Math.abs(A.rootFret - B.rootFret);
        if (!best || d < best.d) best = { A, B, d };
      }),
    );
    if (best) {
      const { A, B } = best as { A: Instance; B: Instance; d: number };
      moves.push({ from: A, to: B, rootDiff: B.rootPitch - A.rootPitch, frets: B.rootFret - A.rootFret, shared: A.pcs.filter((pc) => B.pcs.includes(pc)) });
    }
  });
  return moves;
}

const IVL_NAMES: Record<number, string> = { 1: "m2", 2: "M2", 3: "m3", 4: "M3", 5: "P4", 6: "tritone", 7: "P5", 8: "m6", 9: "M6", 10: "m7", 11: "M7" };

export function intervalText(diff: number): string {
  if (diff === 0) return "same note";
  const n = Math.abs(diff);
  const nm = n === 12 ? "octave" : n > 12 ? IVL_NAMES[n % 12] + " + octave" : IVL_NAMES[n];
  return (diff > 0 ? "↑ " : "↓ ") + nm;
}

/** Note names for pitch classes counted from E (as stored in Instance.pcs). */
export const NOTE_FROM_E = ["E", "F", "F♯", "G", "G♯", "A", "A♯", "B", "C", "C♯", "D", "D♯"];
