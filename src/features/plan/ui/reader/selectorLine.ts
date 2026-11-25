import type { MovePart } from "../../model/moves";

/**
 * The line under a version's chips (a block with moves, model/moves.ts): what the selector changes, what the values
 * after "Earlier" are, and what to press after a change. The block's own text never names a selector, since chips are
 * there only once a version has more than one value. Written with "Words about the app" (teaching-voice).
 */
export function selectorLine(part: MovePart, earlier: boolean, hasPlay: boolean): string {
  const what = part === "key" ? "The Key selector changes the key of this exercise." : "The Tempo selector changes the tempo of this exercise.";
  const before = !earlier ? "" : part === "key" ? ' The keys after "Earlier" are the ones you played it in before.' : ' The tempos after "Earlier" are the ones you played it at before.';
  const after = !hasPlay ? "" : part === "key" ? " After a change, press Play to start again in the new key." : " After a change, press Play to start again at the new tempo.";
  return `${what}${before}${after}`;
}

/** At or under this tempo a block gets the line about slow practice. */
export const SLOW_BPM = 50;

/**
 * The app's line before the first tool that sounds a tempo, when that tempo is `SLOW_BPM` or under: a tempo this low
 * can look like a mistake, so the line says it is meant and why. The block's text never says it: the tempo is the
 * version's (a block with a tempo move starts slow and gets faster). Null above `SLOW_BPM`.
 */
export function slowTempoLine(bpm: number | null): string | null {
  return bpm === null || bpm > SLOW_BPM ? null : `The tempo is set to ${bpm}, which may seem very slow. Slow practice is for precision: there is time to hear each note and land on it.`;
}
