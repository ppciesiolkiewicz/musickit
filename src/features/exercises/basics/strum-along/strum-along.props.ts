/**
 * Strumming practice: a metronome and the chords as a row of boxes, one per bar (or per beat), the box playing lit.
 * Each chord box holds its beats and each beat its strums, the strum due now lit. One bar of count-in clicks first, then
 * the boxes loop until the student stops. Use it whenever the student strums chords in time; give the strum as
 * `pattern` ("D . D U . U D U") rather than only in the text. For hearing a progression played by the app, use a play-along.
 *
 * Example: `{ "type": "strum-along", "chords": ["Em", "Bm"], "bpm": 70, "pattern": "D . D U . U D U" }` shows
 * [ Em  [↓ ·][↓ ↑][· ↑][↓ ↑] ] | [ Bm  [↓ ·][↓ ↑][· ↑][↓ ↑] ]
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
  /**
   * one bar of strokes, the same every bar: D down, U up, . a miss (the hand moves, no strings); 1-4 strokes a beat, the
   * same count in every beat, so beats × 1, 2, 3 or 4 strokes. "D D D D" downs on the beat, "D U D U D U D U" eighths,
   * "D . D U . U D U" the island strum, "D . . U . U D U D . . U . U D U" sixteenths; default a down on every beat
   */
  pattern?: string;
}
