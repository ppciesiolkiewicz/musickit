/**
 * Double stops on the guitar neck: the 3rds or 6ths of one key as pairs of notes on two strings, walked up the neck.
 * Each pair is joined by a line, with the chord of the key it belongs to named above it and that chord's root ringed.
 * The student taps a pair to hear it, or presses Play to hear the walk up and back down, one pair after another. Use it
 * whenever the exercise is the double stops themselves: 3rds on two neighbouring strings, 6ths with a string skipped
 * between, low on the neck or all the way up it. It has no metronome and no tab: for double stops in time, or mixed with
 * single notes into a riff, use guitar-play-along with grips.
 *
 * Example: `{ "type": "double-stops-neck", "key": "g", "interval": "3rds", "level": "beginner" }` is G major in 3rds on
 * the G and B strings, frets 0 to 7.
 * @component double-stops-neck basic
 */
export interface DoubleStopsNeckProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, as scale-neck takes it; default "major-ionian". The pairs follow the scale, so "natural-minor-aeolian" gives the minor key's 3rds; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale?: string;
  /** which pairs: "3rds" (two notes of the scale with one between them, on neighbouring strings) or "6ths" (the same two notes turned over, with one string skipped between) */
  interval: "3rds" | "6ths";
  /** the two strings as guitar numbers, the lower string first (6 is the low E): 3rds on "65", "54", "43", "32" or "21", 6ths on "64", "53", "42" or "31". Default "32" for 3rds (the G and B strings) and "31" for 6ths (the G and high e strings) */
  strings?: "65" | "54" | "43" | "32" | "21" | "64" | "53" | "42" | "31";
  /** how far up the neck, in one word; it sets `from` and `to` where you leave them out: "new" and "beginner" frets 0 to 7 (low on the neck), "intermediate" frets 0 to 12 (one octave up the two strings), "advanced" frets 0 to 17 (as far as the neck goes). The interval and the strings are yours to set at every level */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** the lowest fret of the walk, 0-13; default 0 */
  from?: number;
  /** the highest fret of the walk, at least 4 above `from`, up to 17; default 17 */
  to?: number;
}
