/**
 * Sing a given interval from Do: the interval shows by name ("Interval · P5"), Do sounds and sits on a piano roll (or a
 * staff, the student's switch), and the student sings the other note with the microphone; held on it, it counts, shows
 * and plays back. Next asks another interval from the set. The voice shows as a dot unless `dot` is false (the harder
 * way: no picture of the voice, only whether it counted). A singing exercise.
 * @component interval-singer basic
 */
export interface IntervalSingerProps {
  /** the key: Do's note name, e.g. "c", "f#", "bb"; default "c" */
  key?: string;
  /** voice range; default "tenor" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
  /** the intervals to ask, in semitones from Do (1 to 12): [7] only the 5th, [4, 7, 12] (the default) the major 3rd, 5th and octave */
  intervals?: number[];
  /** "up" (default): above Do; "down": below Do; "both" */
  dir?: "up" | "down" | "both";
  /** show the voice as a dot; default true. false is the harder level: sing without seeing the voice */
  dot?: boolean;
}
