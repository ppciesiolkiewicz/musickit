/**
 * Sing a given interval from Do: the interval shows by name ("Interval · P5 · Do ↑ Sol"), Do sounds and sits on a piano
 * roll (or a staff, the student's switch), and the student sings the other note with the microphone; held on it, it
 * counts, shows and plays back. With `play` "both", Do and then the note sound, so the student copies the leap. Restart (or Space) plays Do again for the interval asked; Skip moves on. Once it is
 * sung, Next (or Space) asks another interval from the set, in another key when there are several, and R restarts it. Tapping Do or the "?" plays that note. The voice shows as a dot unless `dot` is false (the harder way: no
 * picture of the voice, only whether it counted). A singing exercise.
 * @component interval-singer basic
 */
export interface IntervalSingerProps {
  /** how hard, in one word; it sets `intervals`, `dir` and `keys` where you leave them out. "new": major 3rd and 5th up, the home chord [4, 7]. "beginner": adds the octave [4, 7, 12]. "intermediate": the leaps of the major scale, 4th, 5th, major 6th, octave [5, 7, 9, 12]. "advanced": the leaps that are hard to hear, minor 3rd, tritone, minor 6th, minor 7th, major 7th [3, 6, 8, 10, 11], up and down, Do in a random key each time. The next step inside a level: `dir` "down" then "both", more `keys`, then `dot` false */
  level?: "new" | "beginner" | "intermediate" | "advanced";
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
  /** what sounds before the student sings: "do" (the default), only Do, so the student finds the note; "both", the easier way for a new singer: Do and then the note to sing, so the student hears the leap and sings it back */
  play?: "do" | "both";
  /** show the voice as a dot; default true. false is the harder level: sing without seeing the voice */
  dot?: boolean;
  /** show the Keys switch and the twelve key chips on the tool, so the student picks the keys; default false: the keys are the ones set here, and a choice with `key` options on the section is how the student changes key */
  picker?: boolean;
}
