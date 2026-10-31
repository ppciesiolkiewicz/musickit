/**
 * An ear-training game: hear an interval or chord and name it.
 * @component interval-ears basic
 */
export interface IntervalEarsProps {
  /** "interval" (default) or "chord" */
  kind?: "interval" | "chord";
  /** difficulty level, 1 and up */
  level?: number;
  /** the interval sizes in semitones to ask: [3,4,7] */
  set?: number[];
  /** direction: "up", "down" or "together" */
  dir?: "up" | "down" | "together";
  /** intervals may span more than an octave */
  wide?: boolean;
}
