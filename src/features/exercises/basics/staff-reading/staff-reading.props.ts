/**
 * A game for learning to read notes from the staff. One note is drawn on the staff with "?" under it and the student
 * names it: by pressing its letter (C D E F G A B, on the screen or the keyboard), or, with the mic switched on, by
 * singing it or playing it on an instrument, in any octave. The game then says the note and where it sits ("G, on the
 * second line."), the note keeps its place with its name under it, and the next note is asked to its right. A wrong
 * letter gets the same line and the game moves on. There is no score and no round: it asks until the student stops.
 * Natural notes only, no key signature. Use it whenever reading the staff is the exercise; a `staff` is for singing a
 * scale with the mic, not for naming notes.
 *
 * Example: `{ "type": "staff-reading", "level": "new" }` asks the five lines of the treble clef, E G B D F.
 * @component staff-reading basic
 */
export interface StaffReadingProps {
  /** how hard, in one word; it sets `notes` where you leave it out: "new" lines, "beginner" spaces, "intermediate" ledger, "advanced" all. The next step inside a level: the other `clef` */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** which notes are asked: "lines" (the five lines), "spaces" (the four spaces), "staff" (lines and spaces together), "ledger" (the notes outside the staff: just under and just above it, and on or beside the first two ledger lines each way, middle C among them), "all" (every one of these); default "lines" */
  notes?: "lines" | "spaces" | "staff" | "ledger" | "all";
  /** the clef: "treble" (default; its lines are E G B D F from the bottom, its spaces F A C E) or "bass" (lines G B D F A, spaces A C E G) */
  clef?: "treble" | "bass";
  /** the mic answer starts switched on: the student sings or plays each note and the letter buttons still work. The student can switch it on or off on the tool either way; default false */
  mic?: boolean;
}
