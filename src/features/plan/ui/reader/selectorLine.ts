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
