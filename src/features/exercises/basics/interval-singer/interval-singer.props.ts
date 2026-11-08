/**
 * Sing a given interval from Do: the interval shows by name ("Interval · P5 · Do ↑ Sol"), Do sounds and sits on a piano
 * roll (or a staff, the student's switch), and the student sings the other note with the microphone; held on it, it
 * counts, shows and plays back. Next (or Space) asks another interval from the set, in another key when there are
 * several; D plays Do, R restarts the interval asked. The voice shows as a dot unless `dot` is false (the harder way: no
 * picture of the voice, only whether it counted). A singing exercise.
 * @component interval-singer basic
 */
export interface IntervalSingerProps {
  /** the key: Do's note name, e.g. "c", "f#", "bb"; default "c". "random": any of the 12, a new Do each question */
  key?: string;
  /** several keys to pick Do from at random, a new one each question: ["c", "g", "f"]; or "random" for all 12. The student can change them on the tool */
  keys?: string[] | "random";
  /** voice range; default "tenor" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
  /** the intervals to ask, in semitones from Do (1 to 12): [7] only the 5th, [4, 7, 12] (the default) the major 3rd, 5th and octave */
  intervals?: number[];
  /** "up" (default): above Do; "down": below Do; "both" */
  dir?: "up" | "down" | "both";
  /** show the voice as a dot; default true. false is the harder level: sing without seeing the voice */
  dot?: boolean;
}
