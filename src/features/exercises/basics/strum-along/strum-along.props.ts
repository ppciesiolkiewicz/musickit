/**
 * Strumming practice: a metronome and the chords as a row of blocks, one block per bar (or per beat), the block playing
 * lit. One bar of count-in clicks first, then the blocks loop until the student stops. Use it whenever the student
 * strums chords in time; the text says the strum ("down on every beat", "D D U"). For hearing a progression played by
 * the app, use a play-along.
 *
 * Example: `{ "type": "strum-along", "chords": ["Em", "Em", "Bm", "Bm"], "bpm": 70 }` shows [ Em ] | [ Em ] | [ Bm ] | [ Bm ]
 * @component strum-along basic
 */
export interface StrumAlongProps {
  /** the chords in order, one per block, looping; repeat a chord to hold it longer: ["Em", "Em", "Am", "Am"] */
  chords: string[];
  /** tempo, 30-240 */
  bpm: number;
  /** how long each block lasts: "bar" (default) or "beat" (a chord change on any beat; fill whole bars) */
  per?: "bar" | "beat";
  /** beats in a bar, 2-6; default 4 */
  beats?: number;
}
