/**
 * A rhythm to clap, tap or strum in time. One bar of count-in clicks, then the notes of a one-bar rhythm move towards a
 * line and the student hits each one as it reaches the line: with Space, a tap on the lane, or a clap or a strum of muted
 * strings into the microphone. Each hit is marked by how close to the beat it landed, and a round ends with how many
 * were on time and whether the hits ran early or late. Use it whenever the rhythm itself is the exercise: clapping on
 * the beat, eighths, sixteenths, hits off the beat. It sounds the beat at its `bpm`, and it has no notes or chords: for
 * strumming chords in time use strum-along.
 *
 * Example: `{ "type": "clap-along", "level": "beginner", "bpm": 70 }` is a round of eighths, "1 & 2 & 3 & 4 &", at 70.
 * @component clap-along basic
 */
export interface ClapAlongProps {
  /** how hard, in one word; it sets `pattern` where you leave it out: "new" quarters, "beginner" eighths, "intermediate" sixteenths, "advanced" push (two of its four hits fall off the beat). The tempo is yours to set: a faster `bpm`, or more `bars`, is the next step inside a level */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** the one-bar rhythm, the same every bar: "quarters" (1 2 3 4), "eighths" (1 & 2 & 3 & 4 &), "sixteenths" (1 e & a on every beat), "offbeats" (only the four &s), "folk" (1 2 & & 4 &: 1, 2, the & of 2, the & of 3, 4, the & of 4), "push" (1 & & 4: 1, the & of 2, the & of 3, 4); default "quarters" */
  pattern?: "quarters" | "eighths" | "sixteenths" | "offbeats" | "folk" | "push";
  /** tempo, 40-200; default 80 */
  bpm?: number;
  /** how many bars a round lasts after the count-in, 1-16; default 4 */
  bars?: number;
  /** what a round listens to at first: "keys" for Space or a tap (default), "mic" for a clap or a strum through the microphone. The student can switch on the tool. With "mic" the click only counts in unless the student turns it on, since a microphone hears the click from speakers */
  input?: "keys" | "mic";
}
