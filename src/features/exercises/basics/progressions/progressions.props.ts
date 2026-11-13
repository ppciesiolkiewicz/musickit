/**
 * Common chord progressions that suit the key's mode, written as chords in the key; tap one to hear it. Use it to show which progressions a mode is heard in, not to play along (backing-track does that).
 * @component progressions basic
 */
export interface ProgressionsProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
