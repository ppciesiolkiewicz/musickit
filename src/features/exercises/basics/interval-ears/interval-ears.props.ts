/**
 * An ear-training game: hear an interval, a chord or a chord change and name it. Listening only, no instrument and no mic.
 * @component interval-ears basic
 */
export interface IntervalEarsProps {
  /** what is asked. "interval" (default): two notes, answered with the interval (P5, m3). "chord": one chord, answered with its kind (Major, Minor 7). "change": a chord change, the I chord and then one other chord of a major key, answered with the second chord's numeral (IV, V, vi); every question is in a new key */
  kind?: "interval" | "chord" | "change";
  /** how hard, each level adding to the ones before. For kind "interval", which intervals are asked. A number 1-6: 1 the 5th and octave, 2 adds the 3rds, 3 the 4th and major 2nd, 4 the minor 2nd and the 6ths, 5 the 7ths and the tritone, 6 all twelve. Or a word: "new" is 1, "beginner" 2, "intermediate" 4, "advanced" 6. `set` replaces it. The next step inside a level: `dir` "down", then "together", then `wide`. For kind "change", which chords may come second. A number 1-5: 1 IV and V, 2 adds vi, 3 adds ii, 4 adds iii, 5 adds vii° (every chord of the key). Or a word: "new" and "beginner" are 1, "intermediate" 2, "advanced" 5. Kind "chord" has no levels */
  level?: number | "new" | "beginner" | "intermediate" | "advanced";
  /** for kind "chord": the chord kinds to ask, 2 or more of "maj", "min", "7", "maj7", "m7", "dim", "aug", "sus2", "sus4", "add9", "9", "13", "dim7". Left out: the first five. Keep a set small and name every one of its answers in the text: ["maj", "min", "dim", "aug"], ["maj", "sus2", "sus4"] */
  qualities?: string[];
  /** for kind "interval": the interval sizes in semitones to ask: [3,4,7] */
  set?: number[];
  /** for kind "interval", the direction: "up", "down" or "together" */
  dir?: "up" | "down" | "together";
  /** for kind "interval": intervals may span more than an octave */
  wide?: boolean;
}
