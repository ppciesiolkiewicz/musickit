/**
 * Whether an input really has two inputs to choose from. Browsers often open a one-input mic (a laptop's built-in mic, a webcam,
 * a headset) as stereo, with the same sound on both channels, so a channel count of two is not enough to show [Both] [1] [2].
 * Two clues decide it: the device's name, and its two levels while it listens (a copied mic keeps them equal; an audio interface
 * with a guitar on Input 1 does not).
 */

/** Names of devices with one input, whatever channel count the browser opens them with. */
const ONE_INPUT_NAME = /macbook|imac|mac (mini|studio|pro)|built-?in|internal|iphone|ipad|airpods|headset|hands-?free|webcam|camera|facetime|realtek|array/i;

/** Whether a device's name says it is one mic (built in, a webcam, a headset). */
export const looksOneInput = (label: string): boolean => ONE_INPUT_NAME.test(label);

/** What the levels heard so far say: "two" inputs, "one" (one sound copied to both channels), or "unsure" yet. */
export type PairVerdict = "unsure" | "one" | "two";

export interface PairState {
  verdict: PairVerdict;
  /** frames in a row (while loud enough) with both levels equal */
  matched: number;
}

export const UNSURE: PairState = { verdict: "unsure", matched: 0 };

/** quieter than this (dBFS) on both channels says nothing: two silent inputs have the same noise */
const LOUD_DB = -45;
/** levels this close (dB) are one sound copied */
const SAME_DB = 1.5;
/** levels this far apart (dB) are two inputs */
const APART_DB = 6;
/** equal frames in a row that make "one" (levels come every ~66 ms, so about a second and a half of sound) */
const FRAMES_FOR_ONE = 20;

const db = (rms: number) => (rms > 0 ? 20 * Math.log10(rms) : -Infinity);

/**
 * The next verdict after one frame of levels (one per channel). A clear difference while loud makes "two", for good: a guitar on one
 * input proves it. Equal levels for long enough make "one", until a difference shows up.
 */
export function judgePair(state: PairState, levels: readonly number[]): PairState {
  if (levels.length < 2) return state;
  const [a, b] = [db(levels[0]), db(levels[1])];
  if (Math.max(a, b) < LOUD_DB) return state;
  const apart = Math.abs(a - b);
  if (apart >= APART_DB) return { verdict: "two", matched: 0 };
  if (state.verdict === "two") return state;
  if (apart > SAME_DB) return { ...state, matched: 0 };
  const matched = state.matched + 1;
  return { verdict: matched >= FRAMES_FOR_ONE ? "one" : state.verdict, matched };
}
