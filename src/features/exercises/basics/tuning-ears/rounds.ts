import { OPEN_STRINGS, ORDINALS } from "../string-singer/strings";

export type Verdict = "flat" | "in-tune" | "sharp";
export const VERDICTS: Verdict[] = ["flat", "in-tune", "sharp"];

/**
 * One question: the lower string fretted at the 5th (the 4th on G) is the reference; the next open string sounds
 * `off` cents away from it (0 when in tune). `string` is the lower one, 0 = 6th.
 */
export interface Round {
  string: number;
  fret: number;
  /** the reference pitch, MIDI */
  midi: number;
  off: number;
}

export const DEFAULT_CENTS = 20;
export const clampCents = (c: number | undefined) => (c === undefined || !Number.isFinite(c) ? DEFAULT_CENTS : Math.min(50, Math.max(3, Math.round(c))));

/** A random round, `cents` out (or in tune, a third of the time); `rand` returns [0, 1). */
export function makeRound(cents: number, rand: () => number = Math.random): Round {
  const string = Math.floor(rand() * 5);
  const verdict = VERDICTS[Math.floor(rand() * 3)];
  return { string, fret: string === 3 ? 4 : 5, midi: OPEN_STRINGS[string + 1], off: verdict === "flat" ? -cents : verdict === "sharp" ? cents : 0 };
}

export const verdictOf = (r: Round): Verdict => (r.off < 0 ? "flat" : r.off > 0 ? "sharp" : "in-tune");

/** "6th string, 5th fret → 5th string" */
export const describeRound = (r: Round) => `${ORDINALS[r.string]} string, ${r.fret}th fret → ${ORDINALS[r.string + 1]} string open`;
