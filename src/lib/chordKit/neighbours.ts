import { CAGED_LETTERS, NECK_END, cagedBoxes, cagedContext, type CagedBox, type CagedLetter, type CagedQuality } from "./caged";

/**
 * Shape neighbours: hold your hand in the region of one CAGED shape of the I chord, and the other common chords of the key
 * (IV, V and the relative minors ii, vi, iii) are already under your fingers in other CAGED shapes.
 * In the cycle C → A → G → E → D, with I in shape X: V is X+2, IV is X−2, vi is the minor form of X+1, ii of X−1, iii of X−2.
 */
export const NEIGHBOUR_DEGREES: { roman: string; degree: number; quality: CagedQuality }[] = [
  { roman: "IV", degree: 3, quality: "major" },
  { roman: "I", degree: 0, quality: "major" },
  { roman: "V", degree: 4, quality: "major" },
  { roman: "ii", degree: 1, quality: "minor" },
  { roman: "vi", degree: 5, quality: "minor" },
  { roman: "iii", degree: 2, quality: "minor" },
];

const RULE_STEP: Record<string, number> = { I: 0, V: 2, IV: -2, vi: 1, ii: -1, iii: -2 };

/** The CAGED letter the rule predicts for a neighbour of an I chord in shape `iLetter`. */
export function ruleLetter(iLetter: CagedLetter, roman: string): CagedLetter {
  const i = CAGED_LETTERS.indexOf(iLetter);
  return CAGED_LETTERS[(((i + RULE_STEP[roman]) % 5) + 5) % 5];
}

export interface Neighbour {
  roman: string;
  name: string;
  rootPc: number;
  quality: CagedQuality;
  /** the shape of this chord that sits best in the region, or null when none fits on the neck */
  box: CagedBox | null;
  letter: CagedLetter | null;
}

const span = (b: CagedBox): [number, number] => {
  const played = b.frets.filter((v): v is number => v !== null);
  return [Math.min(...played), b.hi];
};

/** A box moved up an octave, when it still fits on the drawn neck. */
function octaveUp(b: CagedBox): CagedBox | null {
  if (b.hi + 12 > NECK_END) return null;
  const frets = b.frets.map((v) => (v === null ? null : v + 12));
  return { ...b, frets, rootFret: b.rootFret + 12, lo: Math.min(...frets.filter((v): v is number => v !== null)), hi: b.hi + 12, from: b.from + 12, to: Math.min(NECK_END, b.to + 12) };
}

/** The fret window of the I chord's box in shape `letter`. */
export function regionOf(rootPc: number, letter: CagedLetter): { from: number; to: number } | null {
  const b = cagedBoxes(rootPc, "major").find((x) => x.letter === letter);
  if (!b) return null;
  const [lo, hi] = span(b);
  return { from: lo, to: hi };
}

/** For each of I IV V ii vi iii: the CAGED shape of that chord that overlaps the I chord's region most. */
export function neighbours(rootPc: number, letter: CagedLetter): Neighbour[] {
  const region = regionOf(rootPc, letter);
  const ctx = cagedContext(rootPc, "major");
  return NEIGHBOUR_DEGREES.map(({ roman, degree, quality }) => {
    const chordRoot = (rootPc + ctx.steps[degree]) % 12;
    const name = ctx.names[degree] + (quality === "minor" ? "m" : "");
    if (!region) return { roman, name, rootPc: chordRoot, quality, box: null, letter: null };
    const candidates = cagedBoxes(chordRoot, quality).flatMap((b) => [b, octaveUp(b)].filter((x): x is CagedBox => !!x));
    const mid = (region.from + region.to) / 2;
    let best: CagedBox | null = null, bestOverlap = 0, bestDist = Infinity;
    for (const b of candidates) {
      const [lo, hi] = span(b);
      const overlap = Math.min(hi, region.to) - Math.max(lo, region.from) + 1;
      const dist = Math.abs((lo + hi) / 2 - mid);
      if (overlap > bestOverlap || (overlap === bestOverlap && overlap > 0 && dist < bestDist)) {
        best = b;
        bestOverlap = overlap;
        bestDist = dist;
      }
    }
    return { roman, name, rootPc: chordRoot, quality, box: bestOverlap > 0 ? best : null, letter: bestOverlap > 0 && best ? best.letter : null };
  });
}
