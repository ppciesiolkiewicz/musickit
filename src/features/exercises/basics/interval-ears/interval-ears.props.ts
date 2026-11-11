/**
 * An ear-training game: hear an interval or chord and name it.
 * @component interval-ears basic
 */
export interface IntervalEarsProps {
  /** "interval" (default) or "chord" */
  kind?: "interval" | "chord";
  /** how hard, for kind "interval": which intervals are asked, each level adding to the ones before. A number 1-6: 1 the 5th and octave, 2 adds the 3rds, 3 the 4th and major 2nd, 4 the minor 2nd and the 6ths, 5 the 7ths and the tritone, 6 all twelve. Or a word: "new" is 1, "beginner" 2, "intermediate" 4, "advanced" 6. `set` replaces it. The next step inside a level: `dir` "down", then "together", then `wide` */
  level?: number | "new" | "beginner" | "intermediate" | "advanced";
  /** the interval sizes in semitones to ask: [3,4,7] */
  set?: number[];
  /** direction: "up", "down" or "together" */
  dir?: "up" | "down" | "together";
  /** intervals may span more than an octave */
  wide?: boolean;
}
